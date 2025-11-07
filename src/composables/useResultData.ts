import { computed, ref } from "vue";

export type ResultType = "image" | "video";

export interface ResultData {
  dataUrl: string;
  fileName: string;
  width: number;
  height: number;
  size: number;
  type: ResultType;
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

  const fileSizeFormatted = computed(() => {
    if (fileSize.value === 0 && mediaData.value) {
      // 估算 dataURL 的大小
      const base64Length = mediaData.value.split(",")[1]?.length || 0;
      const bytes = (base64Length * 3) / 4;
      return formatBytes(bytes);
    }
    return formatBytes(fileSize.value);
  });

  const resultTypeLabel = computed(() =>
    resultType.value === "image" ? "截图" : "录屏"
  );

  function formatBytes(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }

  async function loadResultData(resultId: string) {
    try {
      const { browser } = await import("wxt/browser");
      const storageData = await browser.storage.local.get([
        resultId,
        `${resultId}_svg`,
      ]);
      const data = storageData[resultId] as ResultData;

      if (!data) {
        error.value = "数据已过期或不存在";
        loading.value = false;
        return;
      }

      mediaData.value = data.dataUrl;
      fileName.value = data.fileName || "screenshot.png";
      width.value = data.width || 0;
      height.value = data.height || 0;
      fileSize.value = data.size || 0;
      resultType.value = data.type || "image";

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
      error.value = `加载失败: ${err}`;
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
    fileSizeFormatted,
    resultTypeLabel,
    loadResultData,
  };
}
