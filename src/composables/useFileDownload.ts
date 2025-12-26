import { toast } from "vue-sonner";
import { t } from "@/lib/i18n";

export interface FileDownloadOptions {
  successMessage?: string;
  errorMessage?: string;
}

/**
 * 文件下载操作 composable
 */
export function useFileDownload() {
  /**
   * 从 URL/Blob URL 下载文件
   */
  function downloadFromUrl(url: string, fileName: string, options?: FileDownloadOptions): void {
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_export_failed");
      toast.error(errorMessage);
      console.error("Failed to download file from URL:", err);
    }
  }

  /**
   * 从 dataUrl 下载文件
   */
  async function downloadFromDataUrl(
    dataUrl: string,
    fileName: string,
    options?: FileDownloadOptions,
  ): Promise<void> {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      downloadFromUrl(url, fileName, options);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_export_failed");
      toast.error(errorMessage);
      console.error("Failed to download file from dataUrl:", err);
    }
  }

  /**
   * 下载 Blob 文件
   */
  function downloadBlob(blob: Blob, fileName: string, options?: FileDownloadOptions): void {
    try {
      const url = URL.createObjectURL(blob);
      downloadFromUrl(url, fileName, options);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = options?.errorMessage || t("result_export_failed");
      toast.error(errorMessage);
      console.error("Failed to download blob:", err);
    }
  }

  return {
    downloadFromUrl,
    downloadFromDataUrl,
    downloadBlob,
  };
}
