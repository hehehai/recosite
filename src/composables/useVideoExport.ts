import { ref } from "vue";
import type { VideoFormat } from "@/types/screenshot";

const FILE_EXTENSION_REGEX = /\.[^.]+$/;

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
    targetFormat: VideoFormat
  ): Promise<{ success: boolean; error?: string }> {
    exportingFormat.value = targetFormat;
    conversionProgress.value = 0;

    try {
      // 如果格式相同，直接下载
      if (targetFormat === originalFormat) {
        downloadFile(dataUrl, fileName);
        return { success: true };
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
        ALL_FORMATS,
      } = await import("mediabunny");

      // 将 dataURL 转换为 Blob
      const blob = await fetch(dataUrl).then((res) => res.blob());

      // Create a new input from the resource
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS,
      });

      // 配置输出格式
      let outputFormat:
        | InstanceType<typeof Mp4OutputFormat>
        | InstanceType<typeof WebMOutputFormat>;
      if (targetFormat === "mp4") {
        outputFormat = new Mp4OutputFormat();
      } else if (targetFormat === "webm") {
        outputFormat = new WebMOutputFormat();
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
        conversionProgress.value = newProgress;
        console.log(`Conversion progress: ${Math.round(newProgress * 100)}%`);
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
  };
}
