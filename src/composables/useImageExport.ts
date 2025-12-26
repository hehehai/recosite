import { ref } from "vue";
import type { ImageFormat } from "@/types/screenshot";
import { t } from "@/lib/i18n";
import { FILE_EXTENSION_REGEX, JPEG_QUALITY } from "@/lib/constants/common";
import { useFileDownload } from "./useFileDownload";
import { useClipboard } from "./useClipboard";

export function useImageExport() {
  const exportingFormat = ref<string | null>(null);
  const { downloadFromUrl, downloadBlob } = useFileDownload();
  const { copyImageFromDataUrl } = useClipboard();

  async function exportImage(
    dataUrl: string,
    fileName: string,
    originalFormat: string,
    targetFormat: ImageFormat,
  ): Promise<{ success: boolean; error?: string }> {
    exportingFormat.value = targetFormat;

    try {
      // 如果格式相同，直接下载
      if (targetFormat === originalFormat) {
        downloadFromUrl(dataUrl, fileName);
        return { success: true };
      }

      // 转换格式
      const img = new Image();
      img.src = dataUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error(t("error_screenshot_failed"));
      }

      ctx.drawImage(img, 0, 0);

      const quality = targetFormat === "jpeg" ? JPEG_QUALITY : undefined;
      const mimeType = `image/${targetFormat}`;

      return await new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ success: false, error: t("result_export_failed") });
              return;
            }

            const newFileName = fileName.replace(FILE_EXTENSION_REGEX, `.${targetFormat}`);
            downloadBlob(blob, newFileName);
            resolve({ success: true });
          },
          mimeType,
          quality,
        );
      });
    } catch (err) {
      return { success: false, error: String(err) };
    } finally {
      exportingFormat.value = null;
    }
  }

  async function copyToClipboard(dataUrl: string): Promise<boolean> {
    return await copyImageFromDataUrl(dataUrl);
  }

  return {
    exportingFormat,
    exportImage,
    copyToClipboard,
  };
}
