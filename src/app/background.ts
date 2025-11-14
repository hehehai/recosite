import { onMessage, sendMessage } from "webext-bridge/background";
import { browser } from "wxt/browser";
import {
  ImageFormat,
  type RecordingOptions,
  RecordingState,
  RecordingType,
  type SelectionArea,
  VideoFormat,
} from "@/types/screenshot";
import { generateFileName } from "@/utils/file";
import {
  closeOffscreenDocument,
  generateRecordingFileName,
  stopRecording,
} from "@/utils/recording";
import {
  captureFullPage,
  captureSelection,
  captureViewport,
} from "@/utils/screenshot";

// 录制状态管理
const recordingStateManager = {
  state: RecordingState.IDLE as RecordingState,
  recordingType: RecordingType.TAB as RecordingType,
  tabId: null as number | null,
  currentRecordingOptions: null as RecordingOptions | null,
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

  onMessage("capture:selection", async ({ data }) => {
    console.log("[Background] Received capture:selection");
    return await handleStartSelection(data);
  });

  // DOM 截图相关消息处理
  onMessage("dom:start-selection", async () => {
    console.log("[Background] Received dom:start-selection");
    await updateDomBadge(true);
    return { success: true };
  });

  onMessage("dom:cancel-selection", async () => {
    console.log("[Background] Received dom:cancel-selection");
    await updateDomBadge(false);
    return { success: true };
  });

  onMessage("dom:capture", async ({ data }) => {
    console.log("[Background] Received dom:capture");
    return await handleCaptureDom(data);
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
 * 处理选区截图
 */
async function handleStartSelection(data: {
  format: ImageFormat;
  quality?: number;
}) {
  try {
    const format = data.format || ImageFormat.PNG;
    const quality = data.quality || 0.92;

    // 获取当前活动标签页
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      return {
        success: false,
        fileName: "",
        width: 0,
        height: 0,
        error: "No active tab found",
      };
    }

    // 注入选区工具脚本
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/content-scripts/selection.js"],
    });

    // 等待一小段时间让脚本初始化
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 使用 webext-bridge 发送消息到 content script
    const response = await sendMessage(
      "selection:start",
      {},
      `content-script@${tab.id}`
    );

    if (response.cancelled) {
      return {
        success: false,
        fileName: "",
        width: 0,
        height: 0,
        cancelled: true,
      };
    }

    if (!response.area) {
      return {
        success: false,
        fileName: "",
        width: 0,
        height: 0,
        error: "No selection area received",
      };
    }

    const area = response.area as SelectionArea;

    // 执行选区截图
    const result = await captureSelection(area, format, quality);
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
 * 处理开始录制
 */
async function handleStartRecording(data: RecordingOptions) {
  try {
    console.log("[Background] handleStartRecording called with data:", data);

    // 检查是否已经在录制
    if (recordingStateManager.state === RecordingState.RECORDING) {
      console.warn("[Background] Already recording, rejecting request");
      return { success: false, error: "Already recording" };
    }

    const recordingType = data.type || RecordingType.TAB;
    console.log("[Background] Recording type:", recordingType);

    // 存储录制选项
    const options: RecordingOptions = {
      type: recordingType,
      format: data.format || VideoFormat.WEBM,
      videoBitsPerSecond: data.videoBitsPerSecond,
      audioBitsPerSecond: data.audioBitsPerSecond,
      sizeSettings: data.sizeSettings,
      resolution: data.resolution,
      microphone: data.microphone,
      camera: data.camera,
    };
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
      recordingStateManager.state = RecordingState.IDLE;
      recordingStateManager.currentRecordingOptions = null;
      await updateRecordingIcon(false);
      return { success: false, error: "No active tab found" };
    }

    const tabId = tab.id;
    recordingStateManager.tabId = tabId;

    let result: { success: boolean; streamId?: string; error?: string };

    if (recordingType === RecordingType.WINDOW) {
      // 窗口录制
      console.log("[Background] Starting window recording...");
      result = await startWindowRecording(options, tabId);
    } else {
      // 标签页录制（默认）
      console.log("[Background] Starting tab recording...");
      console.log("[Background] Active tab found:", tabId);

      const { startRecording } = await import("@/utils/recording");
      result = await startRecording(tabId, options);
    }

    if (!result.success) {
      // 录制失败，恢复状态
      console.error("[Background] Recording failed:", result.error);
      console.log("[Background] Restoring state to IDLE");
      recordingStateManager.state = RecordingState.IDLE;
      recordingStateManager.recordingType = RecordingType.TAB;
      recordingStateManager.tabId = null;
      recordingStateManager.currentRecordingOptions = null;
      await updateRecordingIcon(false);

      return { success: false, error: result.error };
    }

    console.log("[Background] Recording started successfully");
    return {
      success: true,
      tabId,
      recordingType,
    };
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStartRecording:", error);
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.recordingType = RecordingType.TAB;
    recordingStateManager.tabId = null;
    recordingStateManager.currentRecordingOptions = null;
    await updateRecordingIcon(false);

    return { success: false, error: String(error) };
  }
}

/**
 * 开始窗口录制
 */
async function startWindowRecording(
  options: RecordingOptions,
  _tabId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[Background] Starting window recording...");

    // 注意：由于 desktopCapture streamId 在 offscreen document 中不可用（Chrome bug），
    // 我们让 offscreen document 直接调用 getDisplayMedia() 来显示选择器
    // 这是 Chrome 推荐的做法

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
      // 停止失败，恢复状态
      console.error("[Background] Failed to stop recording:", result.error);
      console.log("[Background] Restoring state to IDLE");
      recordingStateManager.state = RecordingState.IDLE;
      recordingStateManager.recordingType = RecordingType.TAB;
      recordingStateManager.tabId = null;
      recordingStateManager.currentRecordingOptions = null;
      await updateRecordingIcon(false);

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

    // 恢复状态
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.recordingType = RecordingType.TAB;
    recordingStateManager.tabId = null;
    recordingStateManager.currentRecordingOptions = null;
    await updateRecordingIcon(false);

    console.log("[Background] Recording completed successfully");
    return {
      success: true,
      fileName,
      size: result.size,
    };
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStopRecording:", error);
    console.log("[Background] Restoring state to IDLE and cleaning up");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.recordingType = RecordingType.TAB;
    recordingStateManager.tabId = null;
    recordingStateManager.currentRecordingOptions = null;
    await updateRecordingIcon(false);
    await closeOffscreenDocument();

    return { success: false, error: String(error) };
  }
}

/**
 * 更新录制图标
 */
async function updateRecordingIcon(isRecording: boolean) {
  try {
    if (isRecording) {
      console.log("[Background] Setting recording badge");
      // 设置红色徽章表示正在录制
      await browser.action.setBadgeText({ text: "REC" });
      await browser.action.setBadgeBackgroundColor({ color: "#FF0000" });
      await browser.action.setBadgeTextColor({ color: "#FFFFFF" });
      console.log("[Background] Recording badge set successfully");
    } else {
      console.log("[Background] Clearing recording badge");
      // 清除徽章
      await browser.action.setBadgeText({ text: "" });
      console.log("[Background] Recording badge cleared successfully");
    }
  } catch (error) {
    console.error("[Background] Failed to update icon:", error);
  }
}

/**
 * 更新 DOM 选择图标
 */
async function updateDomBadge(isSelecting: boolean) {
  try {
    if (isSelecting) {
      console.log("[Background] Setting DOM selection badge");
      await browser.action.setBadgeText({ text: "DOM" });
      await browser.action.setBadgeBackgroundColor({ color: "#3b82f6" });
      await browser.action.setBadgeTextColor({ color: "#FFFFFF" });
      console.log("[Background] DOM badge set successfully");
    } else {
      console.log("[Background] Clearing DOM badge");
      await browser.action.setBadgeText({ text: "" });
      console.log("[Background] DOM badge cleared successfully");
    }
  } catch (error) {
    console.error("[Background] Failed to update DOM badge:", error);
  }
}

/**
 * 处理 DOM 截图
 */
async function handleCaptureDom(data: {
  dataUrl: string;
  width: number;
  height: number;
  format: ImageFormat;
}) {
  try {
    console.log("[Background] Processing DOM capture");

    // 清除 badge
    await updateDomBadge(false);

    // 生成文件名
    const fileName = generateFileName(data.format || ImageFormat.PNG);

    // 存储数据供后续导出使用
    const resultId = `dom_screenshot_${Date.now()}`;
    await browser.storage.local.set({
      [resultId]: {
        dataUrl: data.dataUrl,
        fileName,
        width: data.width,
        height: data.height,
        size: 0,
        type: "image",
      },
    });

    // 打开结果页面
    const resultUrl = browser.runtime.getURL("/result.html");
    const params = new URLSearchParams({
      id: resultId,
    });

    await browser.tabs.create({
      url: `${resultUrl}?${params.toString()}`,
    });

    return {
      success: true,
      fileName,
    };
  } catch (error) {
    console.error("[Background] DOM capture failed:", error);
    await updateDomBadge(false);
    return { success: false, error: String(error) };
  }
}
