import { ref } from "vue";
import type { ImageFormat } from "@/types/screenshot";

const FILE_EXTENSION_REGEX = /\.[^.]+$/;

export function useImageExport() {
  const exportingFormat = ref<string | null>(null);

  function downloadFile(url: string, name: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function exportImage(
    dataUrl: string,
    fileName: string,
    originalFormat: string,
    targetFormat: ImageFormat
  ): Promise<{ success: boolean; error?: string }> {
    exportingFormat.value = targetFormat;

    try {
      // 如果格式相同，直接下载
      if (targetFormat === originalFormat) {
        downloadFile(dataUrl, fileName);
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
        throw new Error("无法获取 canvas context");
      }

      ctx.drawImage(img, 0, 0);

      const quality = targetFormat === "jpeg" ? 0.92 : undefined;
      const mimeType = `image/${targetFormat}`;

      return await new Promise((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ success: false, error: "导出失败" });
              return;
            }

            const url = URL.createObjectURL(blob);
            const newFileName = fileName.replace(
              FILE_EXTENSION_REGEX,
              `.${targetFormat}`
            );
            downloadFile(url, newFileName);
            URL.revokeObjectURL(url);
            resolve({ success: true });
          },
          mimeType,
          quality
        );
      });
    } catch (err) {
      return { success: false, error: String(err) };
    } finally {
      exportingFormat.value = null;
    }
  }

  async function copyToClipboard(dataUrl: string): Promise<boolean> {
    try {
      const blob = await fetch(dataUrl).then((res) => res.blob());
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch (err) {
      console.error("复制失败:", err);
      return false;
    }
  }

  return {
    exportingFormat,
    exportImage,
    copyToClipboard,
    downloadFile,
  };
}
