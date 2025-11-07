import { onMessage } from "webext-bridge/background";
import { browser } from "wxt/browser";
import {
  ImageFormat,
  type Message,
  MessageType,
  type RecordingOptions,
  RecordingState,
  type SelectionArea,
  VideoFormat,
} from "@/types/screenshot";
import { generateFileName } from "@/utils/file";
import {
  closeOffscreenDocument,
  generateRecordingFileName,
  startRecording,
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
  tabId: null as number | null,
};

export default defineBackground(() => {
  console.log("[Background] Initializing with webext-bridge");
  console.log("[Background] Registering message handlers...");

  // 使用 webext-bridge 监听录制相关消息
  onMessage("recording:start-request", async ({ data }) => {
    console.log("[Background] Received recording:start-request");
    return await handleStartRecordingBridge(data);
  });
  console.log("[Background] Registered recording:start-request handler");

  onMessage("recording:stop-request", async () => {
    console.log("[Background] Received recording:stop-request");
    return await handleStopRecordingBridge();
  });

  onMessage("recording:get-status", () => {
    console.log("[Background] Received recording:get-status");
    return {
      state: recordingStateManager.state,
      tabId: recordingStateManager.tabId,
    };
  });

  // 监听来自 popup 或 content script 的旧消息（保留向后兼容）
  browser.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开启以支持异步响应
    }
  );

  // 监听标签页关闭事件
  browser.tabs.onRemoved.addListener((tabId) => {
    if (
      tabId === recordingStateManager.tabId &&
      recordingStateManager.state === RecordingState.RECORDING
    ) {
      // 如果正在录制的标签页被关闭，停止录制
      handleStopRecordingBridge();
    }
  });
});

/**
 * 处理消息
 */
async function handleMessage(
  message: Message,
  _sender: Browser.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) {
  try {
    switch (message.type) {
      case MessageType.CAPTURE_VIEWPORT:
        await handleCaptureViewport(
          message.data as { format: ImageFormat; quality?: number },
          sendResponse
        );
        break;

      case MessageType.CAPTURE_FULL_PAGE:
        await handleCaptureFullPage(
          message.data as { format: ImageFormat; quality?: number },
          sendResponse
        );
        break;

      case MessageType.START_SELECTION:
        await handleStartSelection(
          message.data as { format: ImageFormat; quality?: number },
          sendResponse
        );
        break;

      case MessageType.START_RECORDING:
        console.log("[Background] Received START_RECORDING message");
        await handleStartRecording(
          message.data as RecordingOptions,
          sendResponse
        );
        break;

      case MessageType.STOP_RECORDING:
        console.log("[Background] Received STOP_RECORDING message");
        await handleStopRecording(message.data, sendResponse);
        break;

      case MessageType.GET_RECORDING_STATUS:
        console.log("[Background] Received GET_RECORDING_STATUS message");
        sendResponse({
          state: recordingStateManager.state,
          tabId: recordingStateManager.tabId,
        });
        break;

      case MessageType.RECORDING_COMPLETE:
        console.log("[Background] Recording complete notification received");
        break;

      case MessageType.START_DOM_SELECTION:
        console.log("[Background] Received START_DOM_SELECTION message");
        await handleStartDomSelection(sendResponse);
        break;

      case MessageType.CANCEL_DOM_SELECTION:
        console.log("[Background] Received CANCEL_DOM_SELECTION message");
        await updateDomBadge(false);
        sendResponse({ success: true });
        break;

      case MessageType.CAPTURE_DOM:
        console.log("[Background] Received CAPTURE_DOM message");
        await handleCaptureDom(
          message.data as {
            dataUrl: string;
            svgDataUrl: string;
            width: number;
            height: number;
            format?: string;
          },
          sendResponse
        );
        break;

      default:
        console.warn("Unknown message type:", message.type);
        sendResponse({ error: "Unknown message type" });
    }
  } catch (error) {
    sendResponse({ error: String(error) });
  }
}

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
async function handleCaptureViewport(
  data: { format: ImageFormat; quality?: number },
  sendResponse: (response?: unknown) => void
) {
  const format = data.format || ImageFormat.PNG;
  const quality = data.quality || 0.92;

  const result = await captureViewport(format, quality);
  const fileName = generateFileName(format);

  // 打开结果页面显示截图
  await openResultPage(result.dataUrl, fileName, result.width, result.height);

  sendResponse({
    success: true,
    fileName,
    width: result.width,
    height: result.height,
  });
}

/**
 * 处理长截图
 */
async function handleCaptureFullPage(
  data: { format: ImageFormat; quality?: number },
  sendResponse: (response?: unknown) => void
) {
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

    sendResponse({
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error("[Background] Full page capture failed:", error);
    sendResponse({
      error: String(error),
    });
  }
}

/**
 * 处理选区截图
 */
/**
 * 处理 DOM 选择请求
 */
async function handleStartDomSelection(
  sendResponse: (response?: unknown) => void
) {
  try {
    // 获取当前活动标签页
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      sendResponse({ error: "No active tab found" });
      return;
    }

    // 注入 DOM 选择器脚本
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/content-scripts/dom-selector.js"],
    });

    // 等待脚本初始化
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 更新 badge
    await updateDomBadge(true);

    // 发送开始选择消息
    await browser.tabs.sendMessage(tab.id, {
      type: MessageType.START_DOM_SELECTION,
    });

    sendResponse({ success: true });
  } catch (error) {
    console.error("[Background] Failed to start DOM selection:", error);
    sendResponse({ error: String(error) });
  }
}

async function handleStartSelection(
  data: { format: ImageFormat; quality?: number },
  sendResponse: (response?: unknown) => void
) {
  const format = data.format || ImageFormat.PNG;
  const quality = data.quality || 0.92;

  // 获取当前活动标签页
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab.id) {
    sendResponse({ error: "No active tab found" });
    return;
  }

  // 先确保 content script 已注入
  try {
    // 注入选区工具脚本
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["/content-scripts/selection.js"],
    });

    // 等待一小段时间让脚本初始化
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await browser.tabs.sendMessage(tab.id, {
      type: MessageType.START_SELECTION,
    });

    if (response.cancelled) {
      sendResponse({ cancelled: true });
      return;
    }

    const area = response.area as SelectionArea;

    // 执行选区截图
    const result = await captureSelection(area, format, quality);
    const fileName = generateFileName(format);

    // 打开结果页面显示截图
    await openResultPage(result.dataUrl, fileName, result.width, result.height);

    sendResponse({
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    sendResponse({ error: String(error) });
  }
}

/**
 * 处理开始录制
 */
async function handleStartRecording(
  data: RecordingOptions,
  sendResponse: (response?: unknown) => void
) {
  try {
    console.log("[Background] handleStartRecording called with data:", data);

    // 检查是否已经在录制
    if (recordingStateManager.state === RecordingState.RECORDING) {
      console.warn("[Background] Already recording, rejecting request");
      sendResponse({ error: "Already recording" });
      return;
    }

    // 获取当前活动标签页
    console.log("[Background] Getting active tab...");
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      console.error("[Background] No active tab found");
      sendResponse({ error: "No active tab found" });
      return;
    }

    console.log("[Background] Active tab found:", tab.id);

    // 更新状态
    console.log("[Background] Updating recording state to RECORDING");
    recordingStateManager.state = RecordingState.RECORDING;
    recordingStateManager.tabId = tab.id;

    // 更新图标为录制中
    console.log("[Background] Updating icon to show recording status");
    await updateRecordingIcon(true);

    // 开始录制
    console.log("[Background] Calling startRecording...");
    const options: RecordingOptions = {
      format: data.format || VideoFormat.WEBM,
      videoBitsPerSecond: data.videoBitsPerSecond,
      audioBitsPerSecond: data.audioBitsPerSecond,
    };

    const result = await startRecording(tab.id, options);

    if (!result.success) {
      // 录制失败，恢复状态
      console.error("[Background] Recording failed:", result.error);
      console.log("[Background] Restoring state to IDLE");
      recordingStateManager.state = RecordingState.IDLE;
      recordingStateManager.tabId = null;
      await updateRecordingIcon(false);

      sendResponse({ error: result.error });
      return;
    }

    console.log("[Background] Recording started successfully");
    sendResponse({ success: true, tabId: tab.id });
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStartRecording:", error);
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);

    sendResponse({ error: String(error) });
  }
}

/**
 * 处理停止录制
 */
async function handleStopRecording(
  _data: unknown,
  sendResponse: (response?: unknown) => void
) {
  try {
    console.log("[Background] handleStopRecording called");

    // 检查是否正在录制
    if (recordingStateManager.state !== RecordingState.RECORDING) {
      console.warn(
        "[Background] Not currently recording, state:",
        recordingStateManager.state
      );
      sendResponse({ error: "Not recording" });
      return;
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
      recordingStateManager.tabId = null;
      await updateRecordingIcon(false);

      sendResponse({ error: result.error || "Failed to stop recording" });
      return;
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

    // 打开结果页面显示录屏
    await openResultPage(dataUrl, fileName, 0, 0, result.size || 0, "video");

    // 关闭 offscreen document
    console.log("[Background] Closing offscreen document...");
    await closeOffscreenDocument();

    // 恢复状态
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);

    console.log("[Background] Recording completed successfully");
    sendResponse({
      success: true,
      fileName,
      size: result.size,
    });
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStopRecording:", error);
    console.log("[Background] Restoring state to IDLE and cleaning up");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);
    await closeOffscreenDocument();

    sendResponse({ error: String(error) });
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
async function handleCaptureDom(
  data: {
    dataUrl: string;
    svgDataUrl: string;
    width: number;
    height: number;
    format?: string;
  },
  sendResponse: (response?: unknown) => void
) {
  try {
    console.log("[Background] Processing DOM capture");

    // 清除 badge
    await updateDomBadge(false);

    // 根据格式生成文件名
    const format = data.format === "svg" ? "svg" : ImageFormat.PNG;
    const fileName = generateFileName(format);

    // 存储数据供后续导出使用
    const resultId = `dom_screenshot_${Date.now()}`;
    await browser.storage.local.set({
      [resultId]: {
        dataUrl: data.dataUrl,
        svgDataUrl: data.svgDataUrl,
        fileName,
        width: data.width,
        height: data.height,
        size: 0,
        type: "image",
        isSvg: data.format === "svg", // 标记是否为纯 SVG
      },
      [`${resultId}_svg`]: data.svgDataUrl, // 单独存储 SVG（如果有）
    });

    // 打开结果页面
    const resultUrl = browser.runtime.getURL("/result.html");
    const params = new URLSearchParams({
      id: resultId,
    });

    await browser.tabs.create({
      url: `${resultUrl}?${params.toString()}`,
    });

    sendResponse({
      success: true,
      fileName,
      width: data.width,
      height: data.height,
    });
  } catch (error) {
    console.error("[Background] DOM capture failed:", error);
    await updateDomBadge(false);
    sendResponse({ error: String(error) });
  }
}

/**
 * 处理开始录制（webext-bridge 版本）
 */
async function handleStartRecordingBridge(data: RecordingOptions) {
  try {
    console.log(
      "[Background] handleStartRecordingBridge called with data:",
      data
    );

    // 检查是否已经在录制
    if (recordingStateManager.state === RecordingState.RECORDING) {
      console.warn("[Background] Already recording, rejecting request");
      return { success: false, error: "Already recording" };
    }

    // 获取当前活动标签页
    console.log("[Background] Getting active tab...");
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      console.error("[Background] No active tab found");
      return { success: false, error: "No active tab found" };
    }

    console.log("[Background] Active tab found:", tab.id);

    // 更新状态
    console.log("[Background] Updating recording state to RECORDING");
    recordingStateManager.state = RecordingState.RECORDING;
    recordingStateManager.tabId = tab.id;

    // 更新图标为录制中
    console.log("[Background] Updating icon to show recording status");
    await updateRecordingIcon(true);

    // 开始录制
    console.log("[Background] Calling startRecording...");
    const options: RecordingOptions = {
      format: data.format || VideoFormat.WEBM,
      videoBitsPerSecond: data.videoBitsPerSecond,
      audioBitsPerSecond: data.audioBitsPerSecond,
    };

    const result = await startRecording(tab.id, options);

    if (!result.success) {
      // 录制失败，恢复状态
      console.error("[Background] Recording failed:", result.error);
      console.log("[Background] Restoring state to IDLE");
      recordingStateManager.state = RecordingState.IDLE;
      recordingStateManager.tabId = null;
      await updateRecordingIcon(false);

      return { success: false, error: result.error };
    }

    console.log("[Background] Recording started successfully");
    return { success: true, tabId: tab.id };
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStartRecordingBridge:", error);
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);

    return { success: false, error: String(error) };
  }
}

/**
 * 处理停止录制（webext-bridge 版本）
 */
async function handleStopRecordingBridge() {
  try {
    console.log("[Background] handleStopRecordingBridge called");

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
      recordingStateManager.tabId = null;
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

    // 打开结果页面显示录屏
    await openResultPage(dataUrl, fileName, 0, 0, result.size || 0, "video");

    // 关闭 offscreen document
    console.log("[Background] Closing offscreen document...");
    await closeOffscreenDocument();

    // 恢复状态
    console.log("[Background] Restoring state to IDLE");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);

    console.log("[Background] Recording completed successfully");
    return {
      success: true,
      fileName,
      size: result.size,
    };
  } catch (error) {
    // 发生错误，恢复状态
    console.error("[Background] Error in handleStopRecordingBridge:", error);
    console.log("[Background] Restoring state to IDLE and cleaning up");
    recordingStateManager.state = RecordingState.IDLE;
    recordingStateManager.tabId = null;
    await updateRecordingIcon(false);
    await closeOffscreenDocument();

    return { success: false, error: String(error) };
  }
}
