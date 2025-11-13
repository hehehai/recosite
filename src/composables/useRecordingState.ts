import { onMounted, ref } from "vue";
import { sendMessage } from "webext-bridge/popup";
import { RecordingState, VideoFormat } from "@/types/screenshot";

interface RecordingResult {
  fileName: string;
  size: number;
}

/**
 * 录制状态管理 Hook
 * 用于管理录制状态和操作
 */
export function useRecordingState() {
  const recordingState = ref<RecordingState>(RecordingState.IDLE);
  const lastRecordingResult = ref<RecordingResult | null>(null);

  /**
   * 检查当前录制状态
   */
  async function checkRecordingStatus() {
    try {
      const response = await sendMessage(
        "recording:get-status",
        {},
        "background"
      );
      recordingState.value = response.state;
    } catch (err) {
      console.error("Failed to get recording status:", err);
    }
  }

  /**
   * 开始录制
   */
  async function startRecording(
    format: VideoFormat = VideoFormat.WEBM,
    options?: {
      microphone?: boolean;
      camera?: boolean;
      resolution?: import("@/types/screenshot").VideoResolution;
    }
  ) {
    try {
      lastRecordingResult.value = null;

      const response = await sendMessage(
        "recording:start-request",
        { format, ...options },
        "background"
      );

      if (response.error) {
        throw new Error(response.error);
      }

      recordingState.value = RecordingState.RECORDING;
      return { success: true };
    } catch (err) {
      recordingState.value = RecordingState.IDLE;
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 停止录制
   */
  async function stopRecording() {
    try {
      recordingState.value = RecordingState.PROCESSING;
      lastRecordingResult.value = null;

      const response = await sendMessage(
        "recording:stop-request",
        {},
        "background"
      );

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.fileName && response.size !== undefined) {
        lastRecordingResult.value = {
          fileName: response.fileName,
          size: response.size,
        };
      }

      recordingState.value = RecordingState.IDLE;
      return { success: true, result: lastRecordingResult.value };
    } catch (err) {
      recordingState.value = RecordingState.IDLE;
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 切换录制状态（开始/停止）
   */
  async function toggleRecording(
    format?: VideoFormat,
    options?: {
      microphone?: boolean;
      camera?: boolean;
      resolution?: import("@/types/screenshot").VideoResolution;
    }
  ) {
    if (recordingState.value === RecordingState.RECORDING) {
      return await stopRecording();
    }
    return await startRecording(format, options);
  }

  // 初始化时检查录制状态
  onMounted(() => {
    checkRecordingStatus();
  });

  return {
    recordingState,
    lastRecordingResult,
    checkRecordingStatus,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
