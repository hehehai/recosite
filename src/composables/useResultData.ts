import { computed, ref } from "vue";
import type { PageInfo } from "@/types/screenshot";
import { t } from "@/lib/i18n";
import { formatFileSize } from "@/lib/file";

export type ResultType = "image" | "video" | "pageinfo";

export interface ResultData {
  dataUrl?: string; // Optional now
  usesIndexedDB?: boolean; // New flag
  fileName: string;
  width: number;
  height: number;
  size: number;
  type: ResultType;
}

export interface PageInfoResultData {
  type: "pageinfo";
  pageInfo: PageInfo;
}

export function useResultData() {
  const resultType = ref<ResultType>("image");
  const mediaData = ref<string | null>(null);
  const svgData = ref<string | null>(null); // SVG 数据
  const fileName = ref<string>("");
  const width = ref<number>(0);
  const height = ref<number>(0);
  const fileSize = ref<number>(0);
  const originalFormat = ref<string>("");
  const loading = ref(true);
  const error = ref<string | null>(null);
  const pageInfo = ref<PageInfo | null>(null);

  const fileSizeFormatted = computed(() => {
    if (fileSize.value === 0 && mediaData.value) {
      // 如果是 blob URL，无法估算大小，显示未知
      if (mediaData.value.startsWith("blob:")) {
        return "-";
      }
      // 估算 dataURL 的大小
      const base64Length = mediaData.value.split(",")[1]?.length || 0;
      const bytes = (base64Length * 3) / 4;
      return formatFileSize(bytes);
    }
    return formatFileSize(fileSize.value);
  });

  const resultTypeLabel = computed(() =>
    resultType.value === "image" ? t("popup_screenshot_tab") : t("popup_recording_tab"),
  );

  async function loadResultData(resultId: string) {
    try {
      const { browser } = await import("wxt/browser");
      const storageData = await browser.storage.local.get([resultId, `${resultId}_svg`]);
      const data = storageData[resultId] as ResultData | PageInfoResultData;

      if (!data) {
        error.value = t("error_data_expired");
        loading.value = false;
        return;
      }

      // 处理 pageinfo 类型
      if (data.type === "pageinfo") {
        resultType.value = "pageinfo";
        pageInfo.value = (data as PageInfoResultData).pageInfo;
        loading.value = false;
        // 清理 storage 数据
        await browser.storage.local.remove([resultId]);
        return;
      }

      // 处理 image/video 类型
      const mediaResult = data as ResultData;

      // NEW: Check if data is in IndexedDB
      if (mediaResult.usesIndexedDB) {
        // Import IndexedDB helper
        const { getBlobData, deleteBlobData } = await import("@/lib/blobStorage");

        // Load blob from IndexedDB
        const blob = await getBlobData(resultId);
        if (!blob) {
          error.value = t("error_data_expired");
          loading.value = false;
          return;
        }

        // Convert blob to object URL
        mediaData.value = URL.createObjectURL(blob);

        // Clean up IndexedDB after loading
        await deleteBlobData(resultId);
      } else {
        // Use existing data URL approach
        mediaData.value = mediaResult.dataUrl || null;
      }

      fileName.value = mediaResult.fileName || "screenshot.png";
      width.value = mediaResult.width || 0;
      height.value = mediaResult.height || 0;
      fileSize.value = mediaResult.size || 0;
      resultType.value = mediaResult.type || "image";

      // 加载 SVG 数据（如果存在且有效）
      const svgKey = `${resultId}_svg`;
      if (storageData[svgKey]) {
        const svgValue = storageData[svgKey] as string;
        // 确保 SVG 数据不为空
        if (svgValue && svgValue.length > 0) {
          svgData.value = svgValue;
        }
      }

      // 从文件名提取原始格式
      const ext = fileName.value.split(".").pop()?.toLowerCase() || "";
      originalFormat.value = ext;

      // 清理 storage 数据
      await browser.storage.local.remove([resultId, svgKey]);

      loading.value = false;
    } catch (err) {
      error.value = `${t("error_loading_failed")}: ${err}`;
      loading.value = false;
    }
  }

  return {
    resultType,
    mediaData,
    svgData,
    fileName,
    width,
    height,
    fileSize,
    originalFormat,
    loading,
    error,
    pageInfo,
    fileSizeFormatted,
    resultTypeLabel,
    loadResultData,
  };
}
