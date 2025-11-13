import { browser } from "wxt/browser";
import { MessageType, type RecordingOptions } from "@/types/screenshot";

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let isStopping = false; // 防止重复停止

console.log("[Offscreen] Document loaded and ready");
console.log("[Offscreen] Setting up message listeners...");

// 保留旧的消息监听器以兼容
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);
  switch (message.type) {
    case MessageType.START_RECORDING:
      handleStartRecording(message.data, sendResponse);
      break;

    case MessageType.STOP_RECORDING:
      handleStopRecording(sendResponse);
      break;

    case MessageType.GET_RECORDING_STATUS:
      // Offscreen document 不处理状态查询，直接返回成功避免错误
      console.log("[Offscreen] Ignoring GET_RECORDING_STATUS message");
      sendResponse({ success: true });
      break;

    default:
      console.warn("[Offscreen] Unknown message type:", message.type);
      sendResponse({ error: `Unknown message type: ${message.type}` });
  }

  return true; // 保持消息通道开启
});

/**
 * 开始录制
 */
async function handleStartRecording(
  data: {
    streamId: string;
    options: RecordingOptions;
    targetSize?: {
      width: number;
      height: number;
      originalWidth: number;
      originalHeight: number;
    };
  },
  sendResponse: (response?: unknown) => void
) {
  try {
    const { streamId, options, targetSize } = data;
    console.log("[Offscreen] Starting recording with streamId:", streamId);
    console.log("[Offscreen] Recording options:", options);
    console.log("[Offscreen] Target size:", targetSize);

    // 调试目标尺寸和约束应用
    if (targetSize) {
      console.log(
        "[Offscreen] Applying resolution:",
        targetSize.width !== targetSize.originalWidth
          ? `${targetSize.width}x${targetSize.height}`
          : "original"
      );
    }

    // 从 streamId 获取 MediaStream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        // @ts-expect-error - Chrome specific API
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
      video: {
        // @ts-expect-error - Chrome specific API
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
          // 如果有目标尺寸，设置录制分辨率
          ...(targetSize &&
            targetSize.width !== targetSize.originalWidth && {
              minWidth: targetSize.width,
              maxWidth: targetSize.width,
              minHeight: targetSize.height,
              maxHeight: targetSize.height,
            }),
        },
      },
    });

    console.log("[Offscreen] Got MediaStream with tracks:", {
      video: stream.getVideoTracks().length,
      audio: stream.getAudioTracks().length,
    });

    // 获取视频轨道的实际约束
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      console.log("[Offscreen] Video track settings:", {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
      });
    }

    // 确定 MIME 类型
    let mimeType = "video/webm;codecs=vp9,opus";
    if (options.format === "mp4") {
      // 注意：浏览器对 MP4 录制的支持有限
      mimeType = "video/mp4";
    }

    // 检查浏览器是否支持该 MIME 类型
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn(
        `[Offscreen] ${mimeType} not supported, falling back to video/webm`
      );
      mimeType = "video/webm"; // 降级到基本 WebM
    }

    console.log("[Offscreen] Using MIME type:", mimeType);

    // 创建 MediaRecorder
    recordedChunks = [];
    const mediaRecorderOptions: MediaRecorderOptions = {
      mimeType,
      videoBitsPerSecond: options.videoBitsPerSecond || 2_500_000, // 2.5 Mbps
      audioBitsPerSecond: options.audioBitsPerSecond || 128_000, // 128 kbps
    };

    mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

    // 监听数据可用事件
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(
          `[Offscreen] Data chunk received: ${event.data.size} bytes (total chunks: ${recordedChunks.length})`
        );
      }
    };

    // 监听停止事件
    mediaRecorder.onstop = async () => {
      console.log(
        `[Offscreen] Recording stopped, total chunks: ${recordedChunks.length}`
      );
      // 停止所有 tracks
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };

    // 监听错误事件
    mediaRecorder.onerror = (event) => {
      console.error("[Offscreen] MediaRecorder error:", event);
    };

    // 开始录制（每秒收集一次数据）
    mediaRecorder.start(1000);
    console.log("[Offscreen] MediaRecorder started successfully");

    sendResponse({ success: true });
  } catch (error) {
    console.error("[Offscreen] Failed to start recording:", error);
    sendResponse({ error: String(error) });
  }
}

/**
 * 停止录制
 */
async function handleStopRecording(sendResponse: (response?: unknown) => void) {
  try {
    console.log("[Offscreen] handleStopRecording called");
    console.log("[Offscreen] isStopping:", isStopping);
    console.log("[Offscreen] mediaRecorder exists:", !!mediaRecorder);
    console.log("[Offscreen] mediaRecorder state:", mediaRecorder?.state);
    console.log("[Offscreen] recordedChunks length:", recordedChunks.length);

    // 防止重复停止
    if (isStopping) {
      console.warn("[Offscreen] Already stopping, ignoring duplicate request");
      sendResponse({ error: "Already stopping" });
      return;
    }

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      console.error("[Offscreen] No active recording or already inactive");
      sendResponse({ error: "No active recording" });
      return;
    }

    // 标记正在停止
    isStopping = true;
    console.log("[Offscreen] Stopping recording...");

    // 保存当前的 mediaRecorder 引用
    const currentRecorder = mediaRecorder;

    // 立即标记为 null 防止重复停止
    mediaRecorder = null;

    // 创建一个 Promise 来等待录制停止
    const stopPromise = new Promise<void>((resolve) => {
      currentRecorder.onstop = async () => {
        console.log(
          `[Offscreen] Recording stopped, total chunks: ${recordedChunks.length}`
        );
        // 停止所有 tracks
        if (currentRecorder.stream) {
          for (const track of currentRecorder.stream.getTracks()) {
            track.stop();
          }
        }

        resolve();
      };
    });

    // 停止录制
    currentRecorder.stop();

    // 等待录制停止
    await stopPromise;

    // 合并所有录制的数据块
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    console.log(`[Offscreen] Created blob: ${blob.size} bytes`);

    // 将 Blob 转换为 ArrayBuffer 以便传输
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log("[Offscreen] Sending recording data back to background");
    sendResponse({
      success: true,
      data: Array.from(uint8Array),
      size: blob.size,
      mimeType: blob.type,
    });

    // 清理
    recordedChunks = [];
    isStopping = false;
  } catch (error) {
    console.error("[Offscreen] Failed to stop recording:", error);
    isStopping = false;
    sendResponse({ error: String(error) });
  }
}

/**
 * 开始录制（webext-bridge 版本）
 */

/**
 * 停止录制（webext-bridge 版本）
 */
