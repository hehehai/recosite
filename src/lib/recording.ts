import { browser } from "wxt/browser";
import { type RecordingOptions, type VideoFormat, VideoResolution } from "@/types/screenshot";
import { OFFSCREEN_DOCUMENT_PATH } from "./constants/paths";
import { getResolutionDimensions } from "./constants/resolution";
import { FILE_NAME_PREFIXES, TIMESTAMP_REPLACE_PATTERN } from "./constants/common";
import { getBlobData } from "./blobStorage";

/**
 * 确保 offscreen document 已创建
 */
export async function ensureOffscreenDocument(): Promise<void> {
  console.log("[Recording] Checking for existing offscreen document...");

  // @ts-expect-error - Chrome specific API
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });

  if (existingContexts.length > 0) {
    console.log("[Recording] Offscreen document already exists");
    return;
  }

  console.log("[Recording] Creating offscreen document...");

  // @ts-expect-error - Chrome specific API
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["USER_MEDIA"],
    justification: "Recording screen and audio from current tab",
  });

  console.log("[Recording] Offscreen document created successfully");

  // 等待 offscreen document 完全加载
  console.log("[Recording] Waiting for offscreen document to be ready...");
  await new Promise((resolve) => setTimeout(resolve, 100));
  console.log("[Recording] Offscreen document should be ready now");
}

/**
 * 关闭 offscreen document
 */
export async function closeOffscreenDocument(): Promise<void> {
  try {
    console.log("[Recording] Checking if offscreen document needs to be closed...");

    // @ts-expect-error - Chrome specific API
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
    });

    if (existingContexts.length === 0) {
      console.log("[Recording] No offscreen document to close");
      return;
    }

    console.log("[Recording] Closing offscreen document...");

    // @ts-expect-error - Chrome specific API
    await chrome.offscreen.closeDocument();

    console.log("[Recording] Offscreen document closed successfully");
  } catch (error) {
    console.error("[Recording] Failed to close offscreen document:", error);
  }
}

/**
 * 开始录制
 */
export async function startRecording(
  tabId: number,
  options: RecordingOptions,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Recording] Starting recording for tab:", tabId);
    console.log("[Recording] Recording options:", options);

    // 确保 offscreen document 已创建
    await ensureOffscreenDocument();

    // 获取标签页信息以支持页面视窗大小录制
    const tab = await browser.tabs.get(tabId);
    console.log("[Recording] Tab info:", {
      width: tab.width,
      height: tab.height,
      url: `${tab.url?.substring(0, 100)}...`,
    });

    // 获取标签页的设备像素比
    let devicePixelRatio = 1;
    try {
      const [result] = await browser.scripting.executeScript({
        target: { tabId },
        func: () => window.devicePixelRatio,
      });
      devicePixelRatio = result.result || 1;
      console.log("[Recording] Device pixel ratio:", devicePixelRatio);
    } catch (err) {
      console.warn("[Recording] Failed to get device pixel ratio, using 1:", err);
    }

    // 确定录制尺寸（使用设备像素尺寸以保持清晰度）
    const tabWidth = tab.width || 0;
    const tabHeight = tab.height || 0;
    let targetWidth = Math.round(tabWidth * devicePixelRatio);
    let targetHeight = Math.round(tabHeight * devicePixelRatio);

    // 优先使用分辨率设置
    if (options.resolution && options.resolution !== VideoResolution.AUTO) {
      const resolutionDimensions = getResolutionDimensions(options.resolution);
      if (resolutionDimensions) {
        targetWidth = resolutionDimensions.width;
        targetHeight = resolutionDimensions.height;
        console.log(
          `[Recording] Using specified resolution: ${options.resolution} (${targetWidth}x${targetHeight})`,
        );
      }
    }
    // 如果没有分辨率设置，检查尺寸设置
    else if (options.sizeSettings && options.sizeSettings.scale !== 1) {
      targetWidth = Math.round(tabWidth * devicePixelRatio * options.sizeSettings.scale);
      targetHeight = Math.round(tabHeight * devicePixelRatio * options.sizeSettings.scale);
      console.log(
        `[Recording] Adjusted recording size: ${targetWidth}x${targetHeight} (scale: ${options.sizeSettings.scale})`,
      );
    } else {
      console.log(`[Recording] Using device pixel size: ${targetWidth}x${targetHeight}`);
    }

    // 获取标签页的 MediaStream ID
    console.log("[Recording] Getting MediaStream ID for tab:", tabId);

    // @ts-expect-error - Chrome specific API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    console.log("[Recording] Got stream ID:", streamId);

    // 向 offscreen document 发送开始录制消息
    console.log("[Recording] Sending start recording message to offscreen document");
    const response = await browser.runtime.sendMessage({
      type: "recording:start-internal",
      data: {
        streamId,
        options,
        targetSize: {
          width: targetWidth,
          height: targetHeight,
          originalWidth: tab.width,
          originalHeight: tab.height,
        },
      },
    });

    if (response.error) {
      console.error("[Recording] Offscreen document returned error:", response.error);
      throw new Error(response.error);
    }

    console.log("[Recording] Recording started successfully");
    return { success: true };
  } catch (error) {
    console.error("[Recording] Failed to start recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 停止录制
 */
export async function stopRecording(): Promise<{
  success: boolean;
  blob?: Blob;
  size?: number;
  mimeType?: string;
  error?: string;
}> {
  try {
    console.log("[Recording] Stopping recording...");

    // 向 offscreen document 发送停止录制消息
    console.log("[Recording] Sending stop recording message to offscreen document");

    const response = await browser.runtime.sendMessage({
      type: "recording:stop-internal",
    });

    if (response.error) {
      console.error("[Recording] Offscreen document returned error:", response.error);
      throw new Error(response.error);
    }

    console.log(`[Recording] Received recording data: ${response.size} bytes`);

    // CRITICAL: Send cleanup acknowledgment and wait
    // This ensures the message channel is fully closed before we terminate the document
    console.log("[Recording] Sending cleanup acknowledgment to offscreen document...");
    try {
      await browser.runtime.sendMessage({
        type: "recording:cleanup-acknowledge",
      });
      console.log("[Recording] Cleanup acknowledged by offscreen document");
    } catch (ackError) {
      // If acknowledgment fails, it might be because the offscreen is already closing
      // Log but don't fail the entire operation
      console.warn(
        "[Recording] Cleanup acknowledgment failed (offscreen may be closing):",
        ackError,
      );
    }

    // Add a small safety delay to ensure message channel cleanup
    // This is belt-and-suspenders: even if acknowledgment works, give Chrome time to cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
    console.log("[Recording] Safety delay completed");

    // 从 IndexedDB 获取 Blob
    const blob = await getBlobData(response.blobId);
    if (!blob) {
      throw new Error("Failed to retrieve recording data from storage");
    }

    console.log("[Recording] Recording stopped successfully");

    return {
      success: true,
      blob,
      size: response.size,
      mimeType: response.mimeType,
    };
  } catch (error) {
    console.error("[Recording] Failed to stop recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 生成录制文件名
 */
export function generateRecordingFileName(format: VideoFormat): string {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(TIMESTAMP_REPLACE_PATTERN, "-")
    .replace("T", "_")
    .split("Z")[0];
  return `${FILE_NAME_PREFIXES.RECORDING}${timestamp}.${format}`;
}

/**
 * 下载录制文件
 */
export async function downloadRecording(
  data: Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<void> {
  console.log(`[Recording] Preparing to download: ${fileName} (${data.length} bytes)`);

  // 创建 Blob
  const blob = new Blob([data as BlobPart], { type: mimeType });
  console.log(`[Recording] Created blob: ${blob.size} bytes, type: ${blob.type}`);

  // 在 Service Worker 中不能使用 URL.createObjectURL，需要转换为 data URL
  console.log("[Recording] Converting to data URL...");
  const reader = new FileReader();

  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  console.info("[Recording] Data URL created, length:", dataUrl.length);

  // 使用 chrome.downloads API 下载
  console.log("[Recording] Initiating download...");
  await browser.downloads.download({
    url: dataUrl,
    filename: fileName,
    saveAs: true,
  });
  console.log("[Recording] Download initiated successfully");
}
