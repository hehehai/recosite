import { onMessage } from "webext-bridge/background";
import { browser } from "wxt/browser";
import { RecordingState, RecordingType } from "@/types/screenshot";
import type { RecordingStateManager } from "@/lib/recordingState";
import { handleCaptureViewport, handleCaptureFullPage } from "@/lib/handlers/screenshotHandlers";
import { handleStartRecording, handleStopRecording } from "@/lib/handlers/recordingHandlers";
import { handleCapturePageInfo } from "@/lib/handlers/pageInfoHandlers";

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

  // 页面信息相关消息处理
  onMessage("pageinfo:capture", async () => {
    console.log("[Background] Received pageinfo:capture");
    return await handleCapturePageInfo();
  });

  // 录制相关消息处理
  onMessage("recording:start-request", async ({ data }) => {
    console.log("[Background] Received recording:start-request");
    return await handleStartRecording(data, recordingStateManager);
  });

  onMessage("recording:stop-request", async () => {
    console.log("[Background] Received recording:stop-request");
    return await handleStopRecording(recordingStateManager);
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
        "[Background] Received recording:track-ended from offscreen - user stopped sharing",
      );
      // 自动触发停止录制流程
      handleStopRecording(recordingStateManager)
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
      handleStopRecording(recordingStateManager);
    }
  });
});
