import { ref } from "vue";
import type { VideoFormat } from "@/types/screenshot";
import type { ExportSizeSettings } from "./useExportSize";

const FILE_EXTENSION_REGEX = /\.[^.]+$/;

/**
 * 调整视频尺寸
 */
async function resizeVideo(
  blob: Blob,
  sizeSettings: ExportSizeSettings,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  console.log(`[VideoExport] Resizing video with scale: ${sizeSettings.scale}`);

  // 如果缩放比例是1，直接返回原始视频
  if (sizeSettings.scale === 1) {
    console.log("[VideoExport] Scale is 1, returning original video");
    return blob;
  }

  try {
    // 目前 MediaBunny API 限制，暂时跳过尺寸调整
    // 将来可以考虑使用其他库如 FFmpeg.wasm 或服务端处理
    console.warn(
      "[VideoExport] Video resizing not yet supported, returning original video"
    );

    // 模拟进度
    if (onProgress) {
      onProgress(0.3);
    }

    return blob;
  } catch (error) {
    console.error("[VideoExport] Failed to resize video:", error);
    // 如果尺寸调整失败，返回原始视频而不是抛出错误
    console.warn(
      "[VideoExport] Falling back to original video due to resize failure"
    );
    return blob;
  }
}

export function useVideoExport() {
  const exportingFormat = ref<string | null>(null);
  const conversionProgress = ref<number>(0);

  function downloadFile(url: string, name: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportVideo(
    dataUrl: string,
    fileName: string,
    originalFormat: string,
    targetFormat: VideoFormat,
    sizeSettings?: ExportSizeSettings
  ): Promise<{ success: boolean; error?: string }> {
    exportingFormat.value = targetFormat;
    conversionProgress.value = 0;

    try {
      // 如果格式相同且没有尺寸调整，直接下载
      if (
        targetFormat === originalFormat &&
        (!sizeSettings || sizeSettings.scale === 1)
      ) {
        downloadFile(dataUrl, fileName);
        return { success: true };
      }

      // 将 dataURL 转换为 Blob
      let blob = await fetch(dataUrl).then((res) => res.blob());

      // 如果需要尺寸调整，先处理视频尺寸
      if (sizeSettings && sizeSettings.scale !== 1) {
        blob = await resizeVideo(blob, sizeSettings, (progress) => {
          conversionProgress.value = Math.max(
            conversionProgress.value,
            progress
          );
        });

        // 如果尺寸调整返回了原始视频，记录警告
        console.warn(
          "[VideoExport] Video resizing skipped, proceeding with original video for format conversion"
        );
      }

      // 使用 MediaBunny 进行格式转换
      const {
        Input,
        Output,
        Conversion,
        BlobSource,
        BufferTarget,
        Mp4OutputFormat,
        WebMOutputFormat,
        MovOutputFormat,
        ALL_FORMATS,
      } = await import("mediabunny");

      // Create a new input from the resource
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS,
      });

      // 配置输出格式
      let outputFormat:
        | InstanceType<typeof Mp4OutputFormat>
        | InstanceType<typeof WebMOutputFormat>
        | InstanceType<typeof MovOutputFormat>;
      if (targetFormat === "mp4") {
        outputFormat = new Mp4OutputFormat();
      } else if (targetFormat === "webm") {
        outputFormat = new WebMOutputFormat();
      } else if (targetFormat === "mov") {
        outputFormat = new MovOutputFormat();
      } else if (targetFormat === "gif") {
        return { success: false, error: "GIF 导出功能即将推出" };
      } else {
        return { success: false, error: "不支持的格式" };
      }

      // Define the output file
      const output = new Output({
        target: new BufferTarget(),
        format: outputFormat,
      });

      // Initialize the conversion process
      const conversion = await Conversion.init({
        input,
        output,
      });

      // 检查转换是否有效
      if (!conversion.isValid) {
        console.warn(
          "Conversion invalid, discarded tracks:",
          conversion.discardedTracks
        );
        const discardedInfo = conversion.discardedTracks
          .map((t: any) => `${t.track?.type || "unknown"}: ${t.reason}`)
          .join(", ");
        return {
          success: false,
          error: `转换失败：${discardedInfo || "不支持的轨道"}`,
        };
      }

      // Keep track of progress
      conversion.onProgress = (newProgress: number) => {
        // 由于尺寸调整暂时跳过，格式转换占100%进度
        conversionProgress.value = newProgress;
        console.log(
          `Conversion progress: ${Math.round(conversionProgress.value * 100)}%`
        );
      };

      // Start the conversion process
      await conversion.execute();

      // Display the final media file
      const outputBuffer = output.target.buffer;
      if (!outputBuffer) {
        throw new Error("转换失败：输出为空");
      }

      const mimeType = output.format.mimeType;
      const outputBlob = new Blob([outputBuffer], { type: mimeType });

      // 下载转换后的文件
      const url = URL.createObjectURL(outputBlob);
      const newFileName = fileName.replace(
        FILE_EXTENSION_REGEX,
        `.${targetFormat}`
      );
      downloadFile(url, newFileName);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (err) {
      console.error("视频导出失败:", err);
      return { success: false, error: String(err) };
    } finally {
      exportingFormat.value = null;
      conversionProgress.value = 0;
    }
  }

  return {
    exportingFormat,
    conversionProgress,
    exportVideo,
    downloadFile,
    resizeVideo,
  };
}
