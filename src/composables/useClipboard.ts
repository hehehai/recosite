import { toast } from "vue-sonner";
import { t } from "@/lib/i18n";

export interface ClipboardOptions {
  successMessage?: string;
  errorMessage?: string;
}

/**
 * 剪贴板操作 composable
 */
export function useClipboard() {
  /**
   * 复制文本到剪贴板
   */
  async function copyText(text: string, options?: ClipboardOptions): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_copy_failed");
      toast.error(errorMessage);
      console.error("Failed to copy text:", err);
      return false;
    }
  }

  /**
   * 从 URL 复制图片到剪贴板
   */
  async function copyImageFromUrl(imageUrl: string, options?: ClipboardOptions): Promise<boolean> {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_copy_failed");
      toast.error(errorMessage);
      console.error("Failed to copy image from URL:", err);
      return false;
    }
  }

  /**
   * 从 dataUrl 复制图片到剪贴板
   */
  async function copyImageFromDataUrl(
    dataUrl: string,
    options?: ClipboardOptions,
  ): Promise<boolean> {
    try {
      const blob = await fetch(dataUrl).then((res) => res.blob());
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_copy_failed");
      toast.error(errorMessage);
      console.error("Failed to copy image from dataUrl:", err);
      return false;
    }
  }

  /**
   * 复制 Blob 到剪贴板
   */
  async function copyBlob(blob: Blob, options?: ClipboardOptions): Promise<boolean> {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_copy_failed");
      toast.error(errorMessage);
      console.error("Failed to copy blob:", err);
      return false;
    }
  }

  return {
    copyText,
    copyImageFromUrl,
    copyImageFromDataUrl,
    copyBlob,
  };
}
