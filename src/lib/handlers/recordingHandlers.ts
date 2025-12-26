import { browser } from "wxt/browser";
import type { RecordingOptions } from "@/types/screenshot";
import { RecordingState, RecordingType, VideoFormat } from "@/types/screenshot";
import type { RecordingStateManager } from "@/lib/recordingState";
import { RECORDING_BADGE } from "@/lib/constants/recording";
import { prepareRecordingOptions } from "@/lib/recordingConfig";
import { resetRecordingUI, setRecordingBadge, updateRecordingIcon } from "@/lib/recordingState";
import { startRecording, stopRecording, generateRecordingFileName } from "@/lib/recording";
import { openResultPage } from "@/lib/resultPage";

/**
 * 更新录制图标和徽章
 */
async function updateRecordingUI(isRecording: boolean): Promise<void> {
  await updateRecordingIcon(isRecording);
  if (isRecording) {
    await setRecordingBadge(
      RECORDING_BADGE.TEXT.RECORDING,
      RECORDING_BADGE.COLORS.RECORDING_BG,
      RECORDING_BADGE.COLORS.TEXT,
    );
  } else {
    await setRecordingBadge("", "", "");
  }
}

/**
 * 开始窗口录制
 * 使用 getDisplayMedia API 显示浏览器的选择器
 */
async function startWindowRecording(
  options: RecordingOptions,
  _tabId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log("[RecordingHandler] Starting window recording...");

    // 确保 offscreen document 已创建
    const { ensureOffscreenDocument } = await import("@/lib/recording");
    await ensureOffscreenDocument();

    // 向 offscreen document 发送开始窗口录制消息
    // offscreen document 将直接调用 getDisplayMedia() 显示选择器
    console.log("[RecordingHandler] Sending window recording request to offscreen document");
    const response = await browser.runtime.sendMessage({
      type: "recording:start-window-capture",
      data: {
        options,
      },
    });

    if (response.error) {
      console.error("[RecordingHandler] Offscreen document returned error:", response.error);
      throw new Error(response.error);
    }

    console.log("[RecordingHandler] Window recording started successfully");
    return { success: true };
  } catch (error) {
    console.error("[RecordingHandler] Failed to start window recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 处理开始录制
 */
export async function handleStartRecording(
  data: RecordingOptions,
  recordingStateManager: RecordingStateManager,
): Promise<{
  success: boolean;
  tabId?: number;
  recordingType?: RecordingType;
  error?: string;
}> {
  try {
    console.log("[RecordingHandler] handleStartRecording called with data:", data);

    // Check if already recording
    if (recordingStateManager.state === RecordingState.RECORDING) {
      console.warn("[RecordingHandler] Already recording, rejecting request");
      return { success: false, error: "Already recording" };
    }

    // Prepare recording options with business rules applied
    const options = prepareRecordingOptions(data);
    const recordingType = options.type!;
    console.log("[RecordingHandler] Recording type:", recordingType);

    recordingStateManager.currentRecordingOptions = options;

    // 更新状态
    console.log("[RecordingHandler] Updating recording state to RECORDING");
    recordingStateManager.state = RecordingState.RECORDING;
    recordingStateManager.recordingType = recordingType;

    // 更新图标为录制中
    console.log("[RecordingHandler] Updating icon to show recording status");
    await updateRecordingUI(true);

    // 获取当前活动标签页
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      console.error("[RecordingHandler] No active tab found");
      await resetRecordingUI(recordingStateManager);
      return { success: false, error: "No active tab found" };
    }

    const tabId = tab.id;
    recordingStateManager.tabId = tabId;

    let result: { success: boolean; streamId?: string; error?: string };

    if (recordingType === RecordingType.WINDOW) {
      // Window recording using getDisplayMedia
      console.log("[RecordingHandler] Starting window recording...");
      result = await startWindowRecording(options, tabId);
    } else {
      // Tab recording (default)
      console.log("[RecordingHandler] Starting tab recording...");
      console.log("[RecordingHandler] Active tab found:", tabId);

      result = await startRecording(tabId, options);
    }

    if (!result.success) {
      // Recording failed, restore state
      console.error("[RecordingHandler] Recording failed:", result.error);
      console.log("[RecordingHandler] Restoring state to IDLE");
      await resetRecordingUI(recordingStateManager);
      return { success: false, error: result.error };
    }

    console.log("[RecordingHandler] Recording started successfully");
    return {
      success: true,
      tabId,
      recordingType,
    };
  } catch (error) {
    // Error occurred, restore state
    console.error("[RecordingHandler] Error in handleStartRecording:", error);
    console.log("[RecordingHandler] Restoring state to IDLE");
    await resetRecordingUI(recordingStateManager);
    return { success: false, error: String(error) };
  }
}

/**
 * 处理停止录制
 */
export async function handleStopRecording(recordingStateManager: RecordingStateManager): Promise<{
  success: boolean;
  fileName?: string;
  size?: number;
  error?: string;
}> {
  try {
    console.log("[RecordingHandler] handleStopRecording called");

    // 检查是否正在录制
    if (recordingStateManager.state !== RecordingState.RECORDING) {
      console.warn(
        "[RecordingHandler] Not currently recording, state:",
        recordingStateManager.state,
      );
      return { success: false, error: "Not recording" };
    }

    // 更新状态为处理中
    console.log("[RecordingHandler] Updating recording state to PROCESSING");
    recordingStateManager.state = RecordingState.PROCESSING;

    // 停止录制
    console.log("[RecordingHandler] Calling stopRecording...");
    const result = await stopRecording();

    if (!(result.success && result.data)) {
      // Stop failed, restore state
      console.error("[RecordingHandler] Failed to stop recording:", result.error);
      console.log("[RecordingHandler] Restoring state to IDLE");
      await resetRecordingUI(recordingStateManager);
      return {
        success: false,
        error: result.error || "Failed to stop recording",
      };
    }

    console.log("[RecordingHandler] Recording stopped, preparing result page...");

    // 生成文件名
    const fileName = generateRecordingFileName(VideoFormat.WEBM);
    console.log("[RecordingHandler] Generated file name:", fileName);

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
    const targetSize = recordingStateManager.currentRecordingOptions?.sizeSettings;
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

        console.log("[RecordingHandler] Video dimensions:", {
          videoWidth,
          videoHeight,
          originalScale: targetSize?.scale,
        });
      } catch (tabError) {
        console.warn("[RecordingHandler] Failed to get tab dimensions:", tabError);
      }
    }

    // 打开结果页面显示录屏
    await openResultPage(dataUrl, fileName, videoWidth, videoHeight, result.size || 0, "video");

    // 关闭 offscreen document
    console.log("[RecordingHandler] Closing offscreen document...");
    const { closeOffscreenDocument } = await import("@/lib/recording");
    await closeOffscreenDocument();

    // Restore state
    console.log("[RecordingHandler] Restoring state to IDLE");
    await resetRecordingUI(recordingStateManager);

    console.log("[RecordingHandler] Recording completed successfully");
    return {
      success: true,
      fileName,
      size: result.size,
    };
  } catch (error) {
    // Error occurred, restore state and cleanup
    console.error("[RecordingHandler] Error in handleStopRecording:", error);
    console.log("[RecordingHandler] Restoring state to IDLE and cleaning up");
    await resetRecordingUI(recordingStateManager);
    return { success: false, error: String(error) };
  }
}
