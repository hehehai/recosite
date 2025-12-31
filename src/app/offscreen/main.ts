import { browser } from "wxt/browser";
import { RECORDING_BITRATES, RECORDING_TIMING } from "@/lib/constants/recording";
import { MAX_CANVAS_HEIGHT } from "@/lib/constants/screenshot";
import { getResolutionDimensions } from "@/lib/constants/resolution";
import { type RecordingOptions, VideoResolution, ImageFormat } from "@/types/screenshot";
import { getMediaRecorderOptions } from "@/lib/recordingConfig";
import { storeBlobData, getScreenshotChunks, type ScreenshotChunk } from "@/lib/blobStorage";

let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let isStopping = false; // Prevent duplicate stops
let autoStoppedData: {
  blobId: string;
  size: number;
  mimeType: string;
} | null = null; // Store recording data when auto-stopped

console.log("[Offscreen] Document loaded and ready");
console.log("[Offscreen] Setting up message listeners...");

// 使用 browser.runtime.onMessage 监听消息（offscreen documents 使用传统消息传递）
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log("[Offscreen] Received message:", message.type);

  switch (message.type) {
    case "recording:start-internal":
      handleStartRecording(message.data).then(sendResponse);
      return true; // 保持异步通道开启

    case "recording:start-window-capture":
      handleStartWindowCapture(message.data).then(sendResponse);
      return true; // 保持异步通道开启

    case "recording:stop-internal":
      handleStopRecording()
        .then((result) => {
          console.log("[Offscreen] Stop recording completed, sending response...");
          sendResponse(result);
          console.log("[Offscreen] Response sent successfully");
        })
        .catch((error) => {
          console.error("[Offscreen] Stop recording failed:", error);
          sendResponse({ success: false, error: String(error) });
        });
      return true; // 保持异步通道开启

    case "recording:cleanup-acknowledge":
      // Background has received our data and processed it
      // We can safely acknowledge that we're ready to be closed
      console.log("[Offscreen] Received cleanup acknowledgment, ready to be closed");
      sendResponse({ acknowledged: true });
      return false; // Synchronous response

    case "recording:status-internal":
      sendResponse({
        isRecording: mediaRecorder !== null && mediaRecorder.state === "recording",
      });
      return false;

    case "screenshot:merge-chunks":
      handleMergeScreenshotChunks(message.data).then(sendResponse);
      return true; // 保持异步通道开启

    default:
      console.warn("[Offscreen] Unknown message type:", message.type);
      sendResponse({ error: `Unknown message type: ${message.type}` });
      return false;
  }
});

/**
 * 开始窗口录制（使用 getDisplayMedia）
 */
async function handleStartWindowCapture(data: {
  options: RecordingOptions;
}): Promise<{ success: boolean; error?: string }> {
  console.log("[Offscreen] ========== handleStartWindowCapture called ==========");
  console.log("[Offscreen] Received options:", JSON.stringify(data.options, null, 2));

  try {
    const { options } = data;

    console.log("[Offscreen] Calling getDisplayMedia...");

    // 构建视频约束
    const videoConstraints: MediaTrackConstraints = {};

    // 根据分辨率设置添加约束
    if (options.resolution && options.resolution !== VideoResolution.AUTO) {
      const resolutionDimensions = getResolutionDimensions(options.resolution);
      if (resolutionDimensions) {
        console.log(
          `[Offscreen] Applying resolution: ${options.resolution} (${resolutionDimensions.width}x${resolutionDimensions.height})`,
        );
        videoConstraints.width = {
          ideal: resolutionDimensions.width,
        };
        videoConstraints.height = {
          ideal: resolutionDimensions.height,
        };
      }
    }

    // Chrome-specific extensions to DisplayMediaStreamOptions
    const displayMediaOptions = {
      video: Object.keys(videoConstraints).length > 0 ? videoConstraints : true,
      audio: false, // 窗口捕获不支持系统音频
      selfBrowserSurface: "exclude", // 排除当前标签页
      surfaceSwitching: "exclude", // 禁用动态切换按钮
    } as DisplayMediaStreamOptions;

    const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

    console.log("[Offscreen] Got MediaStream with tracks:", {
      video: stream.getVideoTracks().length,
      audio: stream.getAudioTracks().length,
    });

    // 获取视频轨道的设置
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      console.log("[Offscreen] Video track settings:", {
        width: settings.width,
        height: settings.height,
        frameRate: settings.frameRate,
      });

      // 监听视频轨道的 ended 事件（用户点击"停止分享"）
      console.log("[Offscreen] Adding ended event listener to video track");
      videoTrack.addEventListener("ended", () => {
        console.log("[Offscreen] Video track ended - user stopped sharing");

        // 只通知 background，让 background 来统一处理停止流程
        if (!isStopping && mediaRecorder && mediaRecorder.state === "recording") {
          console.log("[Offscreen] Notifying background to stop recording due to stream end");
          browser.runtime
            .sendMessage({
              type: "recording:track-ended",
              data: {},
            })
            .catch((err) => {
              console.error("[Offscreen] Failed to notify background:", err);
            });
        }
      });
    }

    // Create MediaRecorder
    const mimeType = `video/${options.format}`;
    console.log("[Offscreen] Creating MediaRecorder with mimeType:", mimeType);

    const recorderOptions = getMediaRecorderOptions(
      options.format,
      options.videoBitsPerSecond || RECORDING_BITRATES.VIDEO_HIGH,
      options.audioBitsPerSecond || RECORDING_BITRATES.AUDIO,
    );

    mediaRecorder = new MediaRecorder(stream, recorderOptions);

    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(
          `[Offscreen] Data available: ${event.data.size} bytes, total chunks: ${recordedChunks.length}`,
        );
      }
    };

    mediaRecorder.onstop = async () => {
      console.log("[Offscreen] MediaRecorder stopped, total chunks:", recordedChunks.length);

      // 如果不是手动停止（isStopping = false），说明是流媒体自动关闭导致的
      // 需要保存数据以便后续 background 请求时返回
      if (!isStopping && recordedChunks.length > 0) {
        console.log("[Offscreen] MediaRecorder auto-stopped, saving recorded data");

        // 合并所有录制的数据块
        const blob = new Blob(recordedChunks, { type: "video/webm" });

        // 保存到 IndexedDB
        const blobId = `recording-auto-${Date.now()}`;
        await storeBlobData(blobId, blob);

        // 保存元数据供后续请求使用
        autoStoppedData = {
          blobId,
          size: blob.size,
          mimeType: blob.type,
        };

        console.log("[Offscreen] Saved auto-stopped data:", autoStoppedData.size, "bytes");
      }

      // 停止所有 tracks
      if (mediaRecorder?.stream) {
        for (const track of mediaRecorder.stream.getTracks()) {
          track.stop();
        }
      }
    };

    mediaRecorder.onerror = (event) => {
      console.error("[Offscreen] MediaRecorder error:", event);
    };

    // Start recording
    mediaRecorder.start(RECORDING_TIMING.DATA_COLLECTION_INTERVAL);
    console.log("[Offscreen] MediaRecorder started, state:", mediaRecorder.state);

    return { success: true };
  } catch (error) {
    console.error("[Offscreen] getUserMedia failed:", error);
    console.error("[Offscreen] Error details:", {
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
    console.log("[Offscreen] Failed to start recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 开始录制（标签页录制）
 */
async function handleStartRecording(data: {
  streamId: string;
  options: RecordingOptions;
  targetSize?: {
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
  };
}): Promise<{ success: boolean; error?: string }> {
  console.log("[Offscreen] ========== handleStartRecording called ==========");
  console.log("[Offscreen] Received data:", JSON.stringify(data, null, 2));

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
          : "original",
      );
    }

    // 从 streamId 获取 MediaStream (tab capture)
    // 使用计算好的设备像素尺寸作为约束，确保录制清晰且无黑边
    const constraints: MediaStreamConstraints = {
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
          // 使用目标尺寸约束，确保视频尺寸正确
          ...(targetSize && {
            minWidth: targetSize.width,
            maxWidth: targetSize.width,
            minHeight: targetSize.height,
            maxHeight: targetSize.height,
          }),
        },
      },
    };

    console.log("[Offscreen] getUserMedia constraints:", JSON.stringify(constraints, null, 2));

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error("[Offscreen] getUserMedia failed:", error);
      console.error("[Offscreen] Error details:", {
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

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
      console.warn(`[Offscreen] ${mimeType} not supported, falling back to video/webm`);
      mimeType = "video/webm"; // 降级到基本 WebM
    }

    console.log("[Offscreen] Using MIME type:", mimeType);

    // Create MediaRecorder
    recordedChunks = [];
    const mediaRecorderOptions = getMediaRecorderOptions(
      options.format,
      options.videoBitsPerSecond || RECORDING_BITRATES.VIDEO_STANDARD,
      options.audioBitsPerSecond || RECORDING_BITRATES.AUDIO,
    );

    mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);

    // 监听数据可用事件
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
        console.log(
          `[Offscreen] Data chunk received: ${event.data.size} bytes (total chunks: ${recordedChunks.length})`,
        );
      }
    };

    // 监听停止事件
    mediaRecorder.onstop = async () => {
      console.log(`[Offscreen] Recording stopped, total chunks: ${recordedChunks.length}`);
      // 停止所有 tracks
      for (const track of stream.getTracks()) {
        track.stop();
      }
    };

    // 监听错误事件
    mediaRecorder.onerror = (event) => {
      console.error("[Offscreen] MediaRecorder error:", event);
    };

    // Start recording (collect data every second)
    mediaRecorder.start(RECORDING_TIMING.DATA_COLLECTION_INTERVAL);
    console.log("[Offscreen] MediaRecorder started successfully");

    return { success: true };
  } catch (error) {
    console.error("[Offscreen] Failed to start recording:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 停止录制
 */
async function handleStopRecording(): Promise<{
  success: boolean;
  blobId?: string;
  size?: number;
  mimeType?: string;
  error?: string;
}> {
  try {
    console.log("[Offscreen] handleStopRecording called");
    console.log("[Offscreen] isStopping:", isStopping);
    console.log("[Offscreen] mediaRecorder exists:", !!mediaRecorder);
    console.log("[Offscreen] mediaRecorder state:", mediaRecorder?.state);
    console.log("[Offscreen] recordedChunks length:", recordedChunks.length);
    console.log("[Offscreen] autoStoppedData exists:", !!autoStoppedData);

    // 如果有自动停止的数据，直接返回
    if (autoStoppedData) {
      console.log("[Offscreen] Returning auto-stopped data:", autoStoppedData.size, "bytes");
      const result = {
        success: true,
        blobId: autoStoppedData.blobId,
        size: autoStoppedData.size,
        mimeType: autoStoppedData.mimeType,
      };

      // 清理状态
      autoStoppedData = null;
      recordedChunks = [];
      isStopping = false;
      mediaRecorder = null;

      return result;
    }

    // 防止重复停止
    if (isStopping) {
      console.warn("[Offscreen] Already stopping, ignoring duplicate request");
      return { success: false, error: "Already stopping" };
    }

    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      console.error("[Offscreen] No active recording or already inactive");
      return { success: false, error: "No active recording" };
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
        console.log(`[Offscreen] Recording stopped, total chunks: ${recordedChunks.length}`);
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

    // 保存到 IndexedDB
    const blobId = `recording-${Date.now()}`;
    await storeBlobData(blobId, blob);

    console.log("[Offscreen] Returning recording data");

    const result = {
      success: true,
      blobId,
      size: blob.size,
      mimeType: blob.type,
    };

    // 清理
    recordedChunks = [];
    isStopping = false;

    return result;
  } catch (error) {
    console.error("[Offscreen] Failed to stop recording:", error);
    isStopping = false;
    return { success: false, error: String(error) };
  }
}

// ============ Screenshot Merging ============

/**
 * 从 dataURL 加载图片
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * 处理超长页面截图的拼接
 * 使用 OffscreenCanvas 在后台进行图片合并
 */
async function handleMergeScreenshotChunks(data: {
  sessionId: string;
  totalHeight: number;
  viewportHeight: number;
  canvasWidth: number;
  format: ImageFormat;
  quality: number;
  chunkCount: number;
}): Promise<{
  success: boolean;
  blobId?: string;
  width?: number;
  height?: number;
  error?: string;
}> {
  const { sessionId, totalHeight, viewportHeight, format, quality, chunkCount } = data;

  console.log(`[Offscreen] Merging ${chunkCount} screenshot chunks for session: ${sessionId}`);
  console.log(`[Offscreen] Total height: ${totalHeight}px, viewport: ${viewportHeight}px`);

  try {
    // 1. 从 IndexedDB 获取所有截图分片
    const chunks = await getScreenshotChunks(sessionId);

    if (chunks.length === 0) {
      throw new Error("No screenshot chunks found");
    }

    console.log(`[Offscreen] Loaded ${chunks.length} chunks from IndexedDB`);

    // 2. 加载第一张图片来确定缩放比例
    const firstImage = await loadImage(chunks[0].dataUrl);
    const scale = firstImage.naturalHeight / viewportHeight;
    const finalWidth = firstImage.naturalWidth;
    const finalHeight = Math.ceil(totalHeight * scale);

    console.log(`[Offscreen] Scale: ${scale}, final size: ${finalWidth}x${finalHeight}`);

    // 3. 检查是否需要分片处理（超过单个 Canvas 限制）
    if (finalHeight > MAX_CANVAS_HEIGHT) {
      console.log(
        `[Offscreen] Height ${finalHeight}px exceeds limit ${MAX_CANVAS_HEIGHT}px, using segmented merge`,
      );
      return await mergeScreenshotsSegmented(
        chunks,
        finalWidth,
        finalHeight,
        scale,
        format,
        quality,
        sessionId,
      );
    }

    // 4. 普通合并（单个 Canvas）
    return await mergeScreenshotsSingle(
      chunks,
      finalWidth,
      finalHeight,
      scale,
      format,
      quality,
      sessionId,
    );
  } catch (error) {
    console.error("[Offscreen] Failed to merge screenshots:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 单个 Canvas 合并（用于普通长度页面）
 */
async function mergeScreenshotsSingle(
  chunks: ScreenshotChunk[],
  finalWidth: number,
  finalHeight: number,
  scale: number,
  format: ImageFormat,
  quality: number,
  sessionId: string,
): Promise<{
  success: boolean;
  blobId?: string;
  width?: number;
  height?: number;
  error?: string;
}> {
  console.log(`[Offscreen] Single canvas merge: ${finalWidth}x${finalHeight}`);

  // 创建 OffscreenCanvas
  const canvas = new OffscreenCanvas(finalWidth, finalHeight);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  // 加载所有图片并排序
  const images: Array<{ img: HTMLImageElement; scrollY: number }> = [];
  for (const chunk of chunks) {
    const img = await loadImage(chunk.dataUrl);
    images.push({ img, scrollY: chunk.scrollY });
  }

  // 按 scrollY 排序
  images.sort((a, b) => a.scrollY - b.scrollY);

  // 绘制到 Canvas
  let canvasFilledHeight = 0;

  for (const { img, scrollY } of images) {
    const destY = Math.round(scrollY * scale);

    let srcY = 0;
    let drawDestY = destY;
    let srcH = img.naturalHeight;

    // 处理重叠
    if (destY < canvasFilledHeight) {
      const overlap = canvasFilledHeight - destY;
      srcY = Math.min(overlap, img.naturalHeight);
      drawDestY = canvasFilledHeight;
      srcH = img.naturalHeight - srcY;
    }

    // 确保不超出画布
    const remaining = finalHeight - drawDestY;
    if (remaining <= 0 || srcH <= 0) {
      continue;
    }

    srcH = Math.min(srcH, remaining);

    if (srcH > 0) {
      ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, drawDestY, img.naturalWidth, srcH);
      canvasFilledHeight = Math.max(canvasFilledHeight, drawDestY + srcH);
    }
  }

  // 转换为 Blob
  const mimeType = format === ImageFormat.PNG ? "image/png" : "image/jpeg";
  const blob = await canvas.convertToBlob({
    type: mimeType,
    quality: format === ImageFormat.JPEG ? quality : undefined,
  });

  // 存储到 IndexedDB
  const blobId = `screenshot-merged-${sessionId}`;
  await storeBlobData(blobId, blob);

  console.log(`[Offscreen] Merged screenshot saved: ${blob.size} bytes, id: ${blobId}`);

  return {
    success: true,
    blobId,
    width: finalWidth,
    height: finalHeight,
  };
}

/**
 * 分段合并（用于超长页面，避免 Canvas 尺寸限制）
 * 将大图分成多个小段，逐段处理后再合并
 */
async function mergeScreenshotsSegmented(
  chunks: ScreenshotChunk[],
  finalWidth: number,
  finalHeight: number,
  scale: number,
  format: ImageFormat,
  quality: number,
  sessionId: string,
): Promise<{
  success: boolean;
  blobId?: string;
  width?: number;
  height?: number;
  error?: string;
}> {
  const segmentCount = Math.ceil(finalHeight / MAX_CANVAS_HEIGHT);
  console.log(
    `[Offscreen] Segmented merge: ${segmentCount} segments of max ${MAX_CANVAS_HEIGHT}px each`,
  );

  // 加载所有图片
  const images: Array<{ img: HTMLImageElement; scrollY: number }> = [];
  for (const chunk of chunks) {
    const img = await loadImage(chunk.dataUrl);
    images.push({ img, scrollY: chunk.scrollY });
  }

  // 按 scrollY 排序
  images.sort((a, b) => a.scrollY - b.scrollY);

  // 逐段处理
  const segmentBlobs: Blob[] = [];

  for (let seg = 0; seg < segmentCount; seg++) {
    const segStartY = seg * MAX_CANVAS_HEIGHT;
    const segHeight = Math.min(MAX_CANVAS_HEIGHT, finalHeight - segStartY);

    console.log(
      `[Offscreen] Processing segment ${seg + 1}/${segmentCount}: y=${segStartY}, height=${segHeight}`,
    );

    // 创建此段的 Canvas
    const canvas = new OffscreenCanvas(finalWidth, segHeight);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get 2d context for segment");
    }

    // 绘制相关图片到此段
    for (const { img, scrollY } of images) {
      const imgDestY = Math.round(scrollY * scale);
      const imgEndY = imgDestY + img.naturalHeight;

      // 检查此图片是否与当前段有交集
      const segEndY = segStartY + segHeight;
      if (imgEndY <= segStartY || imgDestY >= segEndY) {
        continue; // 无交集，跳过
      }

      // 计算绘制参数
      const srcY = Math.max(0, segStartY - imgDestY);
      const drawDestY = Math.max(0, imgDestY - segStartY);
      let srcH = img.naturalHeight - srcY;
      srcH = Math.min(srcH, segHeight - drawDestY);

      if (srcH > 0) {
        ctx.drawImage(img, 0, srcY, img.naturalWidth, srcH, 0, drawDestY, img.naturalWidth, srcH);
      }
    }

    // 此段转换为 Blob（使用 PNG 保持质量，最后再转换格式）
    const segBlob = await canvas.convertToBlob({ type: "image/png" });
    segmentBlobs.push(segBlob);
  }

  console.log(`[Offscreen] All segments processed, merging final image...`);

  // 将分段合并为最终图片
  // 加载所有分段图片
  const segmentImages: HTMLImageElement[] = [];
  for (const blob of segmentBlobs) {
    const url = URL.createObjectURL(blob);
    const img = await loadImage(url);
    segmentImages.push(img);
    URL.revokeObjectURL(url);
  }

  // 由于最终图片仍然超过限制，我们需要逐段写入
  // 这里使用一个技巧：创建多个小 Canvas，然后合并成一个大 Blob
  // 但更实际的做法是直接返回多个文件或使用降采样

  // 简化方案：如果最终高度仍然太大，使用降采样
  let outputWidth = finalWidth;
  let outputHeight = finalHeight;

  if (finalHeight > MAX_CANVAS_HEIGHT * 2) {
    // 超过 2 倍限制，进行降采样
    const downscaleRatio = (MAX_CANVAS_HEIGHT * 2) / finalHeight;
    outputWidth = Math.round(finalWidth * downscaleRatio);
    outputHeight = Math.round(finalHeight * downscaleRatio);
    console.log(
      `[Offscreen] Downscaling to ${outputWidth}x${outputHeight} (ratio: ${downscaleRatio.toFixed(2)})`,
    );
  }

  // 创建最终 Canvas（可能是降采样后的尺寸）
  const finalCanvas = new OffscreenCanvas(outputWidth, outputHeight);
  const finalCtx = finalCanvas.getContext("2d");

  if (!finalCtx) {
    throw new Error("Failed to get final canvas context");
  }

  // 绘制所有分段
  let currentY = 0;
  const segmentScaleRatio = outputHeight / finalHeight;

  for (const segImg of segmentImages) {
    const drawHeight = Math.round(segImg.naturalHeight * segmentScaleRatio);
    finalCtx.drawImage(
      segImg,
      0,
      0,
      segImg.naturalWidth,
      segImg.naturalHeight,
      0,
      currentY,
      outputWidth,
      drawHeight,
    );
    currentY += drawHeight;
  }

  // 转换为最终 Blob
  const mimeType = format === ImageFormat.PNG ? "image/png" : "image/jpeg";
  const finalBlob = await finalCanvas.convertToBlob({
    type: mimeType,
    quality: format === ImageFormat.JPEG ? quality : undefined,
  });

  // 存储到 IndexedDB
  const blobId = `screenshot-merged-${sessionId}`;
  await storeBlobData(blobId, finalBlob);

  console.log(
    `[Offscreen] Final merged screenshot saved: ${finalBlob.size} bytes, size: ${outputWidth}x${outputHeight}`,
  );

  return {
    success: true,
    blobId,
    width: outputWidth,
    height: outputHeight,
  };
}
