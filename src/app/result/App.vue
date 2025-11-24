<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import {
    useImageExport,
    useNotification,
    useResultData,
    useVideoExport,
    useVideoMetadata,
  } from "@/composables";
  import type { ImageFormat, VideoFormat } from "@/types/screenshot";
  import ExportSizeSettings from "./components/ExportSizeSettings.vue";
  import NotificationToast from "./components/NotificationToast.vue";
  import ResultHeader from "./components/ResultHeader.vue";
  import VideoMetadataDialog from "./components/VideoMetadataDialog.vue";
  import VideoPlayer from "./components/VideoPlayer.vue";

  // 使用 composables
  const { notification, showNotification, hideNotification } =
    useNotification();
  const {
    resultType,
    mediaData,
    svgData,
    fileName,
    width,
    height,
    originalFormat,
    loading,
    error,
    fileSizeFormatted,
    resultTypeLabel,
    loadResultData,
  } = useResultData();

  const {
    exportingFormat: imageExportingFormat,
    exportImage,
    copyToClipboard,
  } = useImageExport();

  const {
    exportingFormat: videoExportingFormat,
    exportVideo,
    downloadFile: videoDownloadFile,
  } = useVideoExport();

  const { metadata: videoMetadata, extractMetadata } = useVideoMetadata();

  // 导出状态
  const exportingFormat = computed(
    () => imageExportingFormat.value || videoExportingFormat.value
  );
  const copySuccess = ref(false);

  // 导出尺寸设置
  const exportSizeSettings = ref({
    width: width.value || 0,
    height: height.value || 0,
    scale: 1,
    showOriginal: false,
  });

  // 预览图片URL（用于显示调整后的尺寸）
  const previewImageUrl = ref<string>("");

  // Regex 常量
  const FILE_EXTENSION_REGEX = /\.\w+$/;

  // 视频元数据对话框
  const showMetadataDialog = ref(false);

  // 视频时长
  const videoDuration = ref<string>();

  // 图片导出选项
  const imageExportFormats: ImageFormat[] = ["png", "jpeg"];

  // 视频导出选项
  const videoExportFormats: VideoFormat[] = ["webm", "mp4", "mov", "gif"];

  // 当前可用的导出格式（如果有 SVG 数据，添加 SVG 选项）
  const availableFormats = computed(() => {
    if (resultType.value === "image") {
      // 如果原始格式是 SVG，只显示 SVG
      if (originalFormat.value === "svg") {
        return ["svg"];
      }
      // 如果有 SVG 数据，添加 SVG 选项
      return svgData.value
        ? [...imageExportFormats, "svg"]
        : imageExportFormats;
    }
    return videoExportFormats;
  });

  // 监听导出尺寸设置变化
  watch(
    exportSizeSettings,
    () => {
      if (resultType.value === "image") {
        generateResizedPreview();
      }
    },
    { deep: true }
  );

  // 监听媒体数据加载完成
  watch([mediaData, width, height], () => {
    if (mediaData.value && width.value && height.value) {
      exportSizeSettings.value = {
        width: width.value,
        height: height.value,
        scale: 1,
        showOriginal: false,
      };
      if (resultType.value === "image") {
        generateResizedPreview();
      }
    }
  });

  onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    const resultId = params.get("id");

    if (!resultId) {
      error.value = "未找到数据";
      loading.value = false;
      return;
    }

    await loadResultData(resultId);

    // 如果是视频，获取时长
    if (resultType.value === "video") {
      await handleVideoLoaded();
    }
  });

  async function handleExport(format: string) {
    if (!mediaData.value) {
      return;
    }

    if (resultType.value === "image") {
      // 处理 SVG 导出
      if (format === "svg") {
        if (!svgData.value) {
          showNotification("SVG 数据不可用", "error");
          return;
        }
        // 直接下载 SVG
        const svgFileName = fileName.value.replace(
          FILE_EXTENSION_REGEX,
          ".svg"
        );
        const blob = await fetch(svgData.value).then((r) => r.blob());
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = svgFileName;
        a.click();
        URL.revokeObjectURL(url);
        showNotification("已导出为 SVG", "success");
        return;
      }

      // 准备导出的图片数据
      let exportData = mediaData.value;

      // 如果需要调整尺寸且不是显示原图，使用调整后的数据
      if (!exportSizeSettings.value.showOriginal && previewImageUrl.value) {
        exportData = previewImageUrl.value;
      }

      const result = await exportImage(
        exportData,
        fileName.value,
        originalFormat.value,
        format as ImageFormat
      );
      if (result.success) {
        const sizeText = exportSizeSettings.value.showOriginal
          ? "原始尺寸"
          : `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;
        showNotification(
          `已导出为 ${format.toUpperCase()} (${sizeText})`,
          "success"
        );
      } else {
        showNotification(result.error || "导出失败", "error");
      }
    } else {
      showNotification(`正在转换为 ${format.toUpperCase()}...`, "info");
      const sizeSettings =
        exportSizeSettings.value && exportSizeSettings.value.scale !== 1
          ? exportSizeSettings.value
          : undefined;

      const result = await exportVideo(
        mediaData.value,
        fileName.value,
        originalFormat.value,
        format as VideoFormat,
        sizeSettings
      );
      if (result.success) {
        let sizeText = "未知尺寸";
        if (exportSizeSettings.value) {
          if (exportSizeSettings.value.scale === 1) {
            sizeText = "原始尺寸";
          } else {
            sizeText = `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;
          }
        }
        showNotification(
          `已成功导出为 ${format.toUpperCase()} (${sizeText})`,
          "success"
        );
      } else {
        showNotification(result.error || "导出失败", "error");
      }
    }
  }

  async function handleCopyToClipboard() {
    if (!mediaData.value) {
      return;
    }

    if (resultType.value === "image") {
      // 如果需要调整尺寸且不是显示原图，使用调整后的数据
      let copyData = mediaData.value;
      if (!exportSizeSettings.value.showOriginal && previewImageUrl.value) {
        copyData = previewImageUrl.value;
      }

      const success = await copyToClipboard(copyData);
      if (success) {
        copySuccess.value = true;
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
        const sizeText = exportSizeSettings.value.showOriginal
          ? "原始尺寸"
          : `${exportSizeSettings.value.width}×${exportSizeSettings.value.height}`;
        showNotification(`已复制到剪贴板 (${sizeText})`, "success");
      } else {
        showNotification("复制失败，请手动下载", "error");
      }
    } else {
      // 视频不支持复制到剪贴板，直接下载
      videoDownloadFile(mediaData.value, fileName.value);
      showNotification("已开始下载视频", "success");
    }
  }

  function handleClose() {
    window.close();
  }

  function handleShowDetails() {
    showMetadataDialog.value = true;
  }

  function handleCloseDetails() {
    showMetadataDialog.value = false;
  }

  // 格式化视频时长
  function formatVideoDuration(seconds: number): string {
    if (!Number.isFinite(seconds)) {
      return "0:00";
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  // 视频加载完成后获取时长
  async function handleVideoLoaded() {
    if (mediaData.value && resultType.value === "video") {
      try {
        await extractMetadata(mediaData.value);
        if (videoMetadata.value) {
          videoDuration.value = formatVideoDuration(
            videoMetadata.value.duration
          );
        }
      } catch (err) {
        console.error("Failed to get video duration:", err);
      }
    }
  }

  // 生成调整后的图片预览
  async function generateResizedPreview() {
    if (
      !mediaData.value ||
      resultType.value !== "image" ||
      exportSizeSettings.value.showOriginal
    ) {
      previewImageUrl.value = mediaData.value || "";
      return;
    }

    try {
      // 创建图片元素
      const img = new Image();
      img.crossOrigin = "anonymous";

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = mediaData.value!;
      });

      // 创建canvas来调整尺寸
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("无法获取 canvas context");
      }

      canvas.width = exportSizeSettings.value.width;
      canvas.height = exportSizeSettings.value.height;

      // 绘制调整后的图片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 转换为data URL
      previewImageUrl.value = canvas.toDataURL("image/png");
    } catch (previewError) {
      console.error("生成预览图片失败:", previewError);
      previewImageUrl.value = mediaData.value || "";
    }
  }
</script>

<template>
  <div class="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
    <!-- 顶部信息栏 -->
    <ResultHeader
      v-if="!loading && !error"
      :result-type-label="resultTypeLabel"
      :file-name="fileName"
      :original-format="originalFormat"
      :width="width"
      :height="height"
      :file-size-formatted="fileSizeFormatted"
      :is-video="resultType === 'video'"
      :duration="videoDuration"
      @close="handleClose"
      @show-details="handleShowDetails"
    />

    <!-- 主内容区域 -->
    <main class="flex flex-1 overflow-hidden">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <div class="text-center">
          <div
            class="mx-auto size-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
          />
          <p class="mt-4 text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex flex-1 items-center justify-center p-8"
      >
        <div
          class="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/30"
        >
          <svg
            class="mx-auto size-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p class="mt-4 text-lg font-medium text-red-700 dark:text-red-300">
            {{ error }}
          </p>
        </div>
      </div>

      <!-- 内容区域：左侧预览 + 右侧操作 -->
      <div v-else-if="mediaData" class="flex flex-1 gap-6 overflow-hidden p-6">
        <!-- 左侧：预览区域 -->
        <div
          class="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
              预览
            </h2>
          </div>
          <div
            class="flex flex-1 items-center justify-center overflow-auto bg-gray-50 p-6 dark:bg-gray-950"
          >
            <!-- 图片预览 -->
            <img
              v-if="resultType === 'image'"
              :src="previewImageUrl || mediaData"
              :alt="fileName"
              class="max-h-full max-w-full rounded shadow-lg"
            >

            <!-- 视频预览 -->
            <VideoPlayer
              v-else
              :data-url="mediaData"
              :target-width="exportSizeSettings && exportSizeSettings.scale !== 1 ? exportSizeSettings.width : undefined"
              :target-height="exportSizeSettings && exportSizeSettings.scale !== 1 ? exportSizeSettings.height : undefined"
              :original-width="width || undefined"
              :original-height="height || undefined"
            />
          </div>
        </div>

        <!-- 右侧：操作面板 -->
        <div class="w-80 shrink-0 space-y-4">
          <!-- 导出尺寸设置 -->
          <ExportSizeSettings
            :original-width="width || 0"
            :original-height="height || 0"
            v-model="exportSizeSettings"
          />

          <!-- 快速操作 -->
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h3
              class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              快速操作
            </h3>
            <div class="space-y-2">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                @click="handleCopyToClipboard"
              >
                <svg
                  v-if="!copySuccess"
                  class="size-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <svg
                  v-else
                  class="size-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>
                  {{
                      copySuccess
                          ? "已复制"
                          : resultType === "image"
                              ? "复制到剪贴板"
                              : "下载视频"
                  }}
                </span>
              </button>
            </div>
          </div>

          <!-- 导出选项 -->
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <h3
              class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              导出格式
            </h3>
            <div class="space-y-2">
              <button
                v-for="format in availableFormats"
                :key="format"
                type="button"
                :disabled="exportingFormat === format"
                :class="[
                                    'flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm font-medium transition',
                                    format === originalFormat
                                        ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
                                    exportingFormat === format &&
                                    'cursor-not-allowed opacity-50',
                                ]"
                @click="handleExport(format)"
              >
                <span class="flex items-center gap-2">
                  <svg
                    v-if="exportingFormat !== format"
                    class="size-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <div
                    v-else
                    class="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                  <span class="uppercase">{{ format }}</span>
                </span>
                <span
                  v-if="format === originalFormat"
                  class="rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-200"
                >
                  原始
                </span>
              </button>
            </div>
            <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
              点击格式按钮可导出为对应格式的文件
            </p>
          </div>

          <!-- 提示信息 -->
          <div
            class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/30"
          >
            <div class="flex gap-3">
              <svg
                class="size-5 shrink-0 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div class="text-xs text-blue-700 dark:text-blue-300">
                <p class="font-medium">提示</p>
                <p class="mt-1">
                  {{ resultType === "image" ? "转换为 JPEG 可以减小文件大小，但会失去透明度支持" : "MP4 格式兼容性更好，适合大多数播放器"
                                    }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 通知消息 -->
    <NotificationToast :notification="notification" @close="hideNotification"/>

    <!-- 视频元数据对话框 -->
    <VideoMetadataDialog
      :show="showMetadataDialog"
      :data-url="mediaData || ''"
      @close="handleCloseDetails"
    />
  </div>
</template>
