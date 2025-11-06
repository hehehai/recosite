<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import {
    useImageExport,
    useNotification,
    useResultData,
    useVideoExport,
  } from "@/composables";
  import type { ImageFormat, VideoFormat } from "@/types/screenshot";
  import NotificationToast from "./components/NotificationToast.vue";
  import ResultHeader from "./components/ResultHeader.vue";

  // 使用 composables
  const { notification, showNotification, hideNotification } =
    useNotification();
  const {
    resultType,
    mediaData,
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
    downloadFile: imageDownloadFile,
  } = useImageExport();

  const {
    exportingFormat: videoExportingFormat,
    exportVideo,
    downloadFile: videoDownloadFile,
  } = useVideoExport();

  // 导出状态
  const exportingFormat = computed(
    () => imageExportingFormat.value || videoExportingFormat.value
  );
  const copySuccess = ref(false);

  // 图片导出选项
  const imageExportFormats: ImageFormat[] = ["png", "jpeg"];

  // 视频导出选项
  const videoExportFormats: VideoFormat[] = ["webm", "mp4", "gif"];

  // 当前可用的导出格式
  const availableFormats = computed(() =>
    resultType.value === "image" ? imageExportFormats : videoExportFormats
  );

  onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    const resultId = params.get("id");

    if (!resultId) {
      error.value = "未找到数据";
      loading.value = false;
      return;
    }

    await loadResultData(resultId);
  });

  async function handleExport(format: string) {
    if (!mediaData.value) {
      return;
    }

    if (resultType.value === "image") {
      const result = await exportImage(
        mediaData.value,
        fileName.value,
        originalFormat.value,
        format as ImageFormat
      );
      if (result.success) {
        showNotification(`已导出为 ${format.toUpperCase()}`, "success");
      } else {
        showNotification(result.error || "导出失败", "error");
      }
    } else {
      showNotification(`正在转换为 ${format.toUpperCase()}...`, "info");
      const result = await exportVideo(
        mediaData.value,
        fileName.value,
        originalFormat.value,
        format as VideoFormat
      );
      if (result.success) {
        showNotification(`已成功导出为 ${format.toUpperCase()}`, "success");
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
      const success = await copyToClipboard(mediaData.value);
      if (success) {
        copySuccess.value = true;
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
        showNotification("已复制到剪贴板", "success");
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
      @close="handleClose"
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
              :src="mediaData"
              :alt="fileName"
              class="max-h-full max-w-full rounded shadow-lg"
            >

            <!-- 视频预览 -->
            <video
              v-else
              :src="mediaData"
              controls
              class="max-h-full max-w-full rounded shadow-lg"
            />
          </div>
        </div>

        <!-- 右侧：操作面板 -->
        <div class="w-80 shrink-0 space-y-4">
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
                <span
                  >{{
                  copySuccess
                    ? "已复制"
                    : resultType === "image"
                      ? "复制到剪贴板"
                      : "下载视频"
                }}</span
                >
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
                  {{ resultType === "image" ? "转换为 JPEG 可以减小文件大小，但会失去透明度支持" : "MP4 格式兼容性更好，适合大多数播放器" }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 通知消息 -->
    <NotificationToast :notification="notification" @close="hideNotification"/>
  </div>
</template>
