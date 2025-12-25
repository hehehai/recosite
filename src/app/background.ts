import { onMessage } from "webext-bridge/background";
import { browser } from "wxt/browser";
import { RECORDING_BADGE } from "@/constants/recording";
import {
  ImageFormat,
  type RecordingOptions,
  RecordingState,
  RecordingType,
  VideoFormat,
} from "@/types/screenshot";
import { generateFileName } from "@/utils/file";
import {
  closeOffscreenDocument,
  generateRecordingFileName,
  stopRecording,
} from "@/utils/recording";
import { prepareRecordingOptions } from "@/utils/recordingConfig";
import {
  type RecordingStateManager,
  resetRecordingUI,
  setRecordingBadge,
} from "@/utils/recordingState";
import { captureFullPage, captureViewport } from "@/utils/screenshot";

// Recording state management
const recordingStateManager: RecordingStateManager = {
  state: RecordingState.IDLE,
  recordingType: RecordingType.TAB,
  tabId: null,
  currentRecordingOptions: null,
};

export default defineBackground(() => {
  console.log("[Background] Initializing with webext-bridge");
  console.log("[Background] Registering message handlers...");

  // 截图相关消息处理
  onMessage("capture:viewport", async ({ data }) => {
    console.log("[Background] Received capture:viewport");
    return await handleCaptureViewport(data);
  });

  onMessage("capture:fullPage", async ({ data }) => {
    console.log("[Background] Received capture:fullPage");
    return await handleCaptureFullPage(data);
  });

  // 录制相关消息处理
  onMessage("recording:start-request", async ({ data }) => {
    console.log("[Background] Received recording:start-request");
    return await handleStartRecording(data);
  });

  onMessage("recording:stop-request", async () => {
    console.log("[Background] Received recording:stop-request");
    return await handleStopRecording();
  });

  onMessage("recording:get-status", () => {
    console.log("[Background] Received recording:get-status");
    return {
      state: recordingStateManager.state,
      recordingType: recordingStateManager.recordingType,
      tabId: recordingStateManager.tabId,
    };
  });

  // 监听来自 offscreen document 的原生消息
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    // 只处理来自 offscreen 的 track-ended 消息
    if (message.type === "recording:track-ended") {
      console.log(
        "[Background] Received recording:track-ended from offscreen - user stopped sharing"
      );
      // 自动触发停止录制流程
      handleStopRecording()
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          console.error("[Background] Error handling track-ended:", error);
          sendResponse({ success: false, error: String(error) });
        });
      return true; // 保持异步通道开启
    }
    return false;
  });

  // 监听标签页关闭事件
  browser.tabs.onRemoved.addListener((tabId) => {
    if (
      tabId === recordingStateManager.tabId &&
      recordingStateManager.state === RecordingState.RECORDING
    ) {
      // 如果正在录制的标签页被关闭，停止录制
      handleStopRecording();
    }
  });
});

/**
 * 打开结果页面并显示截图或录屏
 * 使用 storage API 传递大数据，避免 URL 长度限制
 */
async function openResultPage(
  dataUrl: string,
  fileName: string,
  width: number,
  height: number,
  size = 0,
  type: "image" | "video" = "image"
) {
  // 生成唯一 ID
  const resultId = `screenshot_${Date.now()}`;

  // 将数据存储到 local storage（跨标签页访问）
  await browser.storage.local.set({
    [resultId]: {
      dataUrl,
      fileName,
      width,
      height,
      size,
      type,
    },
  });

  // 打开结果页面，只传递 ID
  const resultUrl = browser.runtime.getURL("/result.html");
  const params = new URLSearchParams({
    id: resultId,
  });

  await browser.tabs.create({
    url: `${resultUrl}?${params.toString()}`,
  });
}

/**
 * 处理视窗截图
 */
async function handleCaptureViewport(data: {
  format: ImageFormat;
  quality?: number;
}) {
  try {
    const format = data.format || ImageFormat.PNG;
    const quality = data.quality || 0.92;

    const result = await captureViewport(format, quality);
    const fileName = generateFileName(format);

    // 打开结果页面显示截图
    await openResultPage(result.dataUrl, fileName, result.width, result.height);

    return {
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    return {
      success: false,
      fileName: "",
      width: 0,
      height: 0,
      error: String(error),
    };
  }
}

/**
 * 处理长截图
 */
async function handleCaptureFullPage(data: {
  format: ImageFormat;
  quality?: number;
}) {
  try {
    const format = data.format || ImageFormat.PNG;
    const quality = data.quality || 0.92;

    console.log("[Background] Starting full page capture...");
    const result = await captureFullPage(format, quality);
    console.log(
      "[Background] Full page capture complete, opening result page..."
    );

    const fileName = generateFileName(format);

    // 打开结果页面显示截图
    await openResultPage(result.dataUrl, fileName, result.width, result.height);
    console.log("[Background] Result page opened");

    return {
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error("[Background] Full page capture failed:", error);
    return {
      success: false,
      fileName: "",
      width: 0,
      height: 0,
      error: String(error),
    };
  }
}

/**
 * 处理开始录制
 */
async function handleStartRecording(data: RecordingOptions) {
  try {
    console.log("[Background] handleStartRecording called with data:", data);

    // Check if already recording
    if (recordingStateManager.state === RecordingState.RECORDING) {
      console.warn("[Background] Already recording, rejecting request");
      return { success: false, error: "Already recording" };
    }

    // Prepare recording options with business rules applied
    const options = prepareRecordingOptions(data);
    const recordingType = options.type!;
    console.log("[Background] Recording type:", recordingType);

    recordingStateManager.currentRecordingOptions = options;

    // 更新状态
    console.log("[Background] Updating recording state to RECORDING");
    recordingStateManager.state = RecordingState.RECORDING;
    recordingStateManager.recordingType = recordingType;

    // 更新图标为录制中
    console.log("[Background] Updating icon to show recording status");
    await updateRecordingIcon(true);

    // 获取当前活动标签页
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      console.error("[Background] No active tab found");
      await resetRecordingUI(recordingStateManager);
      return { success: false, error: "No active tab found" };
    }

    const tabId = tab.id;
    recordingStateManager.tabId = tabId;

    let result: { success: boolean; streamId?: string; error?: string };

    if (recordingType === RecordingType.WINDOW) {
      // Window recording using getDisplayMedia
      console.log("[Background] Starting window recording...");
      result = await startWindowRecording(options, tabId);
    } else {
      // Tab recording (default)
      console.log("[Background] Starting tab recording...");
      console.log("[Background] Active tab found:", tabId);

      const { startRecording } = await import("@/utils/recording");
      result = await startRecording(tabId, options);
    }

    if (!result.success) {
      // Recording failed, restore state
      console.error("[Background] Recording failed:", result.error);
      console.log("[Background] Restoring state to IDLE");
      await resetRecordingUI(recordingStateManager);
      return { success: false, error: result.error };
    }

    console.log("[Background] Recording started successfully");
    return {
      success: true,
      tabId,
      recordingType,
    };
  } catch (error) {
    // Error occurred, restore state
    console.error("[Background] Error in handleStartRecording:", error);
    console.log("[Background] Restoring state to IDLE");
    await resetRecordingUI(recordingStateManager);
    return { success: false, error: String(error) };
  }
}

/**
 * Start window recording
 * Uses getDisplayMedia API to show browser's share picker
 */
async function startWindowRecording(
  options: RecordingOptions,
  _tabId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Background] Starting window recording...");

    // 确保 offscreen document 已创建
    const { ensureOffscreenDocument } = await import("@/utils/recording");
    await ensureOffscreenDocument();

    // 向 offscreen document 发送开始窗口录制消息
    // offscreen document 将直接调用 getDisplayMedia() 显示选择器
    console.log(
      "[Background] Sending window recording request to offscreen document"
    );
    const response = await browser.runtime.sendMessage({
      type: "recording:start-window-capture",
      data: {
        options,
      },
    });

    if (response.error) {
      console.error(
        "[Background] Offscreen document returned error:",
        response.error
      );
      throw new Error(response.error);
    }

    console.log("[Background] Window recording started successfully");
    return { success: true };
  } catch (error) {
    console.error("[Background] Failed to start window recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 处理停止录制
 */
async function handleStopRecording() {
  try {
    console.log("[Background] handleStopRecording called");

    // 检查是否正在录制
    if (recordingStateManager.state !== RecordingState.RECORDING) {
      console.warn(
        "[Background] Not currently recording, state:",
        recordingStateManager.state
      );
      return { success: false, error: "Not recording" };
    }

    // 更新状态为处理中
    console.log("[Background] Updating recording state to PROCESSING");
    recordingStateManager.state = RecordingState.PROCESSING;

    // 停止录制
    console.log("[Background] Calling stopRecording...");
    const result = await stopRecording();

    if (!(result.success && result.data)) {
      // Stop failed, restore state
      console.error("[Background] Failed to stop recording:", result.error);
      console.log("[Background] Restoring state to IDLE");
      await resetRecordingUI(recordingStateManager);
      return {
        success: false,
        error: result.error || "Failed to stop recording",
      };
    }

    console.log("[Background] Recording stopped, preparing result page...");

    // 生成文件名
    const fileName = generateRecordingFileName(VideoFormat.WEBM);
    console.log("[Background] Generated file name:", fileName);

    // 将视频数据转换为 data URL
    const blob = new Blob([result.data as BlobPart], {
      type: result.mimeType || "video/webm",
    });
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // 获取录制时的实际尺寸
    const targetSize =
      recordingStateManager.currentRecordingOptions?.sizeSettings;
    let videoWidth = 0;
    let videoHeight = 0;

    if (recordingStateManager.tabId) {
      try {
        const tab = await browser.tabs.get(recordingStateManager.tabId);
        videoWidth = tab.width || 0;
        videoHeight = tab.height || 0;

        // 如果有尺寸设置，应用调整后的尺寸
        if (targetSize && targetSize.scale !== 1) {
          videoWidth = Math.round(videoWidth * targetSize.scale);
          videoHeight = Math.round(videoHeight * targetSize.scale);
        }

        console.log("[Background] Video dimensions:", {
          videoWidth,
          videoHeight,
          originalScale: targetSize?.scale,
        });
      } catch (tabError) {
        console.warn("[Background] Failed to get tab dimensions:", tabError);
      }
    }

    // 打开结果页面显示录屏
    await openResultPage(
      dataUrl,
      fileName,
      videoWidth,
      videoHeight,
      result.size || 0,
      "video"
    );

    // 关闭 offscreen document
    console.log("[Background] Closing offscreen document...");
    await closeOffscreenDocument();

    // Restore state
    console.log("[Background] Restoring state to IDLE");
    await resetRecordingUI(recordingStateManager);

    console.log("[Background] Recording completed successfully");
    return {
      success: true,
      fileName,
      size: result.size,
    };
  } catch (error) {
    // Error occurred, restore state and cleanup
    console.error("[Background] Error in handleStopRecording:", error);
    console.log("[Background] Restoring state to IDLE and cleaning up");
    await resetRecordingUI(recordingStateManager);
    return { success: false, error: String(error) };
  }
}

/**
 * Update recording icon
 */
async function updateRecordingIcon(isRecording: boolean) {
  if (isRecording) {
    await setRecordingBadge(
      RECORDING_BADGE.TEXT.RECORDING,
      RECORDING_BADGE.COLORS.RECORDING_BG,
      RECORDING_BADGE.COLORS.TEXT
    );
  } else {
    await setRecordingBadge("", "", "");
  }
}
