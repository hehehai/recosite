import { ref } from "vue";
import { toast } from "vue-sonner";
import { t } from "@/lib/i18n";
import { useClipboard } from "./useClipboard";
import { useFileDownload } from "./useFileDownload";
import { extractLargestIcoImage, isIcoUrl } from "@/lib/ico";

export function usePageInfoActions() {
  const urlCopySuccess = ref(false);
  const titleCopySuccess = ref(false);
  const descCopySuccess = ref(false);
  const metaCopySuccess = ref(false);
  const iconLinksCopySuccess = ref(false);
  const faviconCopySuccess = ref(false);
  const faviconDownloadSuccess = ref(false);

  const { copyText: copyTextToClipboard, copyImageFromUrl, copyBlob } = useClipboard();
  const { downloadFromDataUrl, downloadBlob } = useFileDownload();

  async function copyText(text: string, field: "url" | "title" | "desc", notificationKey: string) {
    const success = await copyTextToClipboard(text, {
      successMessage: t(notificationKey),
    });

    if (success) {
      if (field === "url") {
        urlCopySuccess.value = true;
      } else if (field === "title") {
        titleCopySuccess.value = true;
      } else if (field === "desc") {
        descCopySuccess.value = true;
      }
      setTimeout(() => {
        if (field === "url") {
          urlCopySuccess.value = false;
        } else if (field === "title") {
          titleCopySuccess.value = false;
        } else if (field === "desc") {
          descCopySuccess.value = false;
        }
      }, 2000);
    }
  }

  async function copyMetaTags(metaTags: string) {
    if (!metaTags) {
      return;
    }
    const success = await copyTextToClipboard(metaTags, {
      successMessage: t("pageinfo_meta_copied"),
    });

    if (success) {
      metaCopySuccess.value = true;
      setTimeout(() => {
        metaCopySuccess.value = false;
      }, 2000);
    }
  }

  async function copyIconLinks(iconLinks: string) {
    if (!iconLinks) {
      return;
    }
    const success = await copyTextToClipboard(iconLinks, {
      successMessage: t("pageinfo_icon_code_copied"),
    });

    if (success) {
      iconLinksCopySuccess.value = true;
      setTimeout(() => {
        iconLinksCopySuccess.value = false;
      }, 2000);
    }
  }

  async function copyPageInfoImage(imageUrl: string, imageName: string) {
    await copyImageFromUrl(imageUrl, {
      successMessage: t("pageinfo_image_copied", imageName),
    });
  }

  async function downloadPageInfoImage(imageUrl: string, downloadFileName: string) {
    await downloadFromDataUrl(imageUrl, downloadFileName, {
      successMessage: t("pageinfo_image_downloaded", downloadFileName),
    });
  }

  async function copyFavicon(faviconUrl: string) {
    try {
      let blob: Blob;

      // 检查是否为 ICO 格式
      if (isIcoUrl(faviconUrl)) {
        // 提取最大尺寸并转换为 PNG
        blob = await extractLargestIcoImage(faviconUrl);
      } else {
        // 直接从 URL 获取 Blob
        const response = await fetch(faviconUrl);
        blob = await response.blob();
      }

      // 复制到剪贴板
      const success = await copyBlob(blob, {
        successMessage: t("pageinfo_image_copied", "Favicon"),
      });

      if (success) {
        faviconCopySuccess.value = true;
        setTimeout(() => {
          faviconCopySuccess.value = false;
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to copy favicon:", error);
      toast.error(t("result_copy_failed"));
    }
  }

  async function downloadFavicon(faviconUrl: string) {
    try {
      let blob: Blob;
      let fileName = "favicon.png";

      // 检查是否为 ICO 格式
      if (isIcoUrl(faviconUrl)) {
        // 提取最大尺寸并转换为 PNG
        blob = await extractLargestIcoImage(faviconUrl);
        fileName = "favicon.png"; // 始终保存为 PNG
      } else {
        // 直接从 URL 获取 Blob
        const response = await fetch(faviconUrl);
        blob = await response.blob();

        // 根据 MIME 类型确定扩展名
        const extension = blob.type.split("/")[1] || "png";
        fileName = `favicon.${extension}`;
      }

      // 下载文件
      downloadBlob(blob, fileName, {
        successMessage: t("pageinfo_image_downloaded", fileName),
      });

      faviconDownloadSuccess.value = true;
      setTimeout(() => {
        faviconDownloadSuccess.value = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to download favicon:", error);
      toast.error(t("result_export_failed"));
    }
  }

  return {
    urlCopySuccess,
    titleCopySuccess,
    descCopySuccess,
    metaCopySuccess,
    iconLinksCopySuccess,
    faviconCopySuccess,
    faviconDownloadSuccess,
    copyText,
    copyMetaTags,
    copyIconLinks,
    copyPageInfoImage,
    downloadPageInfoImage,
    copyFavicon,
    downloadFavicon,
  };
}
