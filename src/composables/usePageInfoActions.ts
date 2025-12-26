import { ref } from "vue";
import { t } from "@/lib/i18n";
import { useClipboard } from "./useClipboard";
import { useFileDownload } from "./useFileDownload";

export function usePageInfoActions() {
  const urlCopySuccess = ref(false);
  const titleCopySuccess = ref(false);
  const descCopySuccess = ref(false);
  const metaCopySuccess = ref(false);

  const { copyText: copyTextToClipboard, copyImageFromUrl } = useClipboard();
  const { downloadFromDataUrl } = useFileDownload();

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

  return {
    urlCopySuccess,
    titleCopySuccess,
    descCopySuccess,
    metaCopySuccess,
    copyText,
    copyMetaTags,
    copyPageInfoImage,
    downloadPageInfoImage,
  };
}
