import { ref } from "vue";
import { encode as encodeJpeg } from "@jsquash/jpeg";
import { encode as encodeWebp } from "@jsquash/webp";
import { toast } from "vue-sonner";
import { t } from "@/lib/i18n";
import { FILE_EXTENSION_REGEX } from "@/lib/constants/common";
import { useFileDownload } from "./useFileDownload";

export type CompressionFormat = "jpeg" | "webp";

export interface CompressionOptions {
  format: CompressionFormat;
  quality?: number; // 1-100 for jpeg/webp
}

export const DEFAULT_COMPRESSION_QUALITY = 80;

// PNG 是无损格式，通过 Canvas 重新编码后文件反而会变大，所以只提供有损压缩格式
export const COMPRESSION_FORMATS: CompressionFormat[] = ["jpeg", "webp"];

/**
 * Image compression composable using jSquash
 */
export function useImageCompression() {
  const isCompressing = ref(false);
  const compressingFormat = ref<CompressionFormat | null>(null);
  const { downloadBlob } = useFileDownload();

  /**
   * Convert dataURL to ImageData
   */
  async function dataUrlToImageData(dataUrl: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Compress image using jSquash (JPEG/WebP lossy compression)
   */
  async function compressImage(dataUrl: string, options: CompressionOptions): Promise<Blob> {
    const imageData = await dataUrlToImageData(dataUrl);
    const { format, quality = DEFAULT_COMPRESSION_QUALITY } = options;

    let arrayBuffer: ArrayBuffer;

    switch (format) {
      case "jpeg":
        arrayBuffer = await encodeJpeg(imageData, { quality });
        break;
      case "webp":
        arrayBuffer = await encodeWebp(imageData, { quality });
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const mimeType = format === "jpeg" ? "image/jpeg" : `image/${format}`;
    return new Blob([arrayBuffer], { type: mimeType });
  }

  /**
   * Compress image and download
   */
  async function compressAndDownload(
    dataUrl: string,
    fileName: string,
    options: CompressionOptions,
  ): Promise<{ success: boolean; error?: string }> {
    const { format, quality } = options;
    isCompressing.value = true;
    compressingFormat.value = format;

    try {
      const blob = await compressImage(dataUrl, options);
      const newFileName = fileName.replace(FILE_EXTENSION_REGEX, `.${format}`);

      downloadBlob(blob, newFileName);

      const qualityText = quality ? ` (${quality}%)` : "";
      toast.success(t("compress_success", `${format.toUpperCase()}${qualityText}`));

      return { success: true };
    } catch (err) {
      console.error("Compression failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(t("compress_failed"));
      return { success: false, error: errorMessage };
    } finally {
      isCompressing.value = false;
      compressingFormat.value = null;
    }
  }

  return {
    isCompressing,
    compressingFormat,
    compressImage,
    compressAndDownload,
    COMPRESSION_FORMATS,
    DEFAULT_COMPRESSION_QUALITY,
  };
}
