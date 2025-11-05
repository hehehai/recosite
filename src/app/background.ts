import { browser } from "wxt/browser";
import {
  ImageFormat,
  type Message,
  MessageType,
  type SelectionArea,
} from "@/types/screenshot";
import { downloadFile, generateFileName } from "@/utils/file";
import {
  captureFullPage,
  captureSelection,
  captureViewport,
} from "@/utils/screenshot";

export default defineBackground(() => {
  // 监听来自 popup 或 content script 的消息
  browser.runtime.onMessage.addListener(
    (message: Message, sender, sendResponse) => {
      handleMessage(message, sender, sendResponse);
      return true; // 保持消息通道开启以支持异步响应
    }
  );
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

      case "capture_viewport": // 用于长截图内部调用
        await handleInternalCaptureViewport(
          message.data as { format: ImageFormat; quality?: number },
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

  await downloadFile(result.dataUrl, fileName);

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
  const format = data.format || ImageFormat.PNG;
  const quality = data.quality || 0.92;

  const result = await captureFullPage(format, quality);
  const fileName = generateFileName(format);

  await downloadFile(result.dataUrl, fileName);

  sendResponse({
    success: true,
    fileName,
    width: result.width,
    height: result.height,
  });
}

/**
 * 处理选区截图
 */
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
      files: ["content-selection.js"],
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

    await downloadFile(result.dataUrl, fileName);

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
 * 内部调用的视窗截图（用于长截图）
 */
async function handleInternalCaptureViewport(
  data: { format: ImageFormat; quality?: number },
  sendResponse: (response?: unknown) => void
) {
  const format = data.format || ImageFormat.PNG;
  const quality = data.quality || 0.92;

  const result = await captureViewport(format, quality);

  sendResponse({
    dataUrl: result.dataUrl,
  });
}
