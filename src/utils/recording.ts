import { browser } from "wxt/browser";
import {
  MessageType,
  type RecordingOptions,
  type VideoFormat,
  VideoResolution,
} from "@/types/screenshot";

const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

/**
 * 获取分辨率对应的尺寸
 */
function getResolutionDimensions(
  resolution: VideoResolution
): { width: number; height: number } | null {
  switch (resolution) {
    case VideoResolution.HD:
      return { width: 1280, height: 720 };
    case VideoResolution.FHD:
      return { width: 1920, height: 1080 };
    case VideoResolution.UHD:
      return { width: 3840, height: 2160 };
    default:
      return null; // 使用页面原始尺寸 (AUTO 或其他值)
  }
}

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
}

/**
 * 关闭 offscreen document
 */
export async function closeOffscreenDocument(): Promise<void> {
  try {
    console.log(
      "[Recording] Checking if offscreen document needs to be closed..."
    );

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
  options: RecordingOptions
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

    // 确定录制尺寸
    let targetWidth = tab.width || 0;
    let targetHeight = tab.height || 0;

    // 优先使用分辨率设置
    if (options.resolution && options.resolution !== VideoResolution.AUTO) {
      const resolutionDimensions = getResolutionDimensions(options.resolution);
      if (resolutionDimensions) {
        targetWidth = resolutionDimensions.width;
        targetHeight = resolutionDimensions.height;
        console.log(
          `[Recording] Using specified resolution: ${options.resolution} (${targetWidth}x${targetHeight})`
        );
      }
    }
    // 如果没有分辨率设置，检查尺寸设置
    else if (options.sizeSettings && options.sizeSettings.scale !== 1) {
      const originalWidth = tab.width || 0;
      const originalHeight = tab.height || 0;
      targetWidth = Math.round(originalWidth * options.sizeSettings.scale);
      targetHeight = Math.round(originalHeight * options.sizeSettings.scale);
      console.log(
        `[Recording] Adjusted recording size: ${targetWidth}x${targetHeight} (scale: ${options.sizeSettings.scale})`
      );
    }

    // 获取标签页的 MediaStream ID
    console.log("[Recording] Getting MediaStream ID for tab:", tabId);

    // @ts-expect-error - Chrome specific API
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: tabId,
    });

    console.log("[Recording] Got stream ID:", streamId);

    // 向 offscreen document 发送开始录制消息
    console.log(
      "[Recording] Sending start recording message to offscreen document"
    );
    const response = await browser.runtime.sendMessage({
      type: MessageType.START_RECORDING,
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
      console.error(
        "[Recording] Offscreen document returned error:",
        response.error
      );
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
  data?: Uint8Array;
  size?: number;
  mimeType?: string;
  error?: string;
}> {
  try {
    console.log("[Recording] Stopping recording...");

    // 向 offscreen document 发送停止录制消息
    console.log(
      "[Recording] Sending stop recording message to offscreen document"
    );

    const response = await browser.runtime.sendMessage({
      type: MessageType.STOP_RECORDING,
    });

    if (response.error) {
      console.error(
        "[Recording] Offscreen document returned error:",
        response.error
      );
      throw new Error(response.error);
    }

    console.log(`[Recording] Received recording data: ${response.size} bytes`);

    // 将 Array 转换回 Uint8Array
    const data = new Uint8Array(response.data);

    console.log("[Recording] Recording stopped successfully");

    return {
      success: true,
      data,
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
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .split("Z")[0];
  return `recording_${timestamp}.${format}`;
}

/**
 * 下载录制文件
 */
export async function downloadRecording(
  data: Uint8Array,
  fileName: string,
  mimeType: string
): Promise<void> {
  console.log(
    `[Recording] Preparing to download: ${fileName} (${data.length} bytes)`
  );

  // 创建 Blob
  const blob = new Blob([data as BlobPart], { type: mimeType });
  console.log(
    `[Recording] Created blob: ${blob.size} bytes, type: ${blob.type}`
  );

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
