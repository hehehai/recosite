<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import type { ImageFormat, VideoFormat } from "@/types/screenshot";

  // 结果类型
  type ResultType = "image" | "video";

  // 数据
  const resultType = ref<ResultType>("image");
  const mediaData = ref<string | null>(null);
  const fileName = ref<string>("");
  const width = ref<number>(0);
  const height = ref<number>(0);
  const fileSize = ref<number>(0);
  const originalFormat = ref<string>("");
  const loading = ref(true);
  const error = ref<string | null>(null);

  // 导出选项
  const exportingFormat = ref<string | null>(null);
  const copySuccess = ref(false);

  // 通知消息
  const notification = ref<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  function showNotification(
    message: string,
    type: "success" | "error" | "info" = "info"
  ) {
    notification.value = { message, type };
    setTimeout(() => {
      notification.value = null;
    }, 3000);
  }

  // 计算文件大小
  const fileSizeFormatted = computed(() => {
    if (fileSize.value === 0 && mediaData.value) {
      // 估算 dataURL 的大小
      const base64Length = mediaData.value.split(",")[1]?.length || 0;
      const bytes = (base64Length * 3) / 4;
      return formatBytes(bytes);
    }
    return formatBytes(fileSize.value);
  });

  // 获取结果类型标签
  const resultTypeLabel = computed(() => {
    if (resultType.value === "image") {
      return "截图";
    }
    return "录屏";
  });

  // 图片导出选项
  const imageExportFormats: ImageFormat[] = ["png", "jpeg"];

  // 视频导出选项（预留）
  const videoExportFormats: VideoFormat[] = ["webm", "mp4", "gif"];

  // 当前可用的导出格式
  const availableFormats = computed(() =>
    resultType.value === "image" ? imageExportFormats : videoExportFormats
  );

  onMounted(async () => {
    try {
      // 从 URL 参数获取 ID
      const params = new URLSearchParams(window.location.search);
      const resultId = params.get("id");

      if (!resultId) {
        error.value = "未找到数据";
        loading.value = false;
        return;
      }

      // 从 storage 读取数据
      const { browser } = await import("wxt/browser");
      const storageData = await browser.storage.local.get(resultId);
      const data = storageData[resultId];

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

      // 从文件名提取原始格式
      const ext = fileName.value.split(".").pop()?.toLowerCase() || "";
      originalFormat.value = ext;

      // 清理 storage 数据
      await browser.storage.local.remove(resultId);

      loading.value = false;
    } catch (err) {
      error.value = `加载失败: ${err}`;
      loading.value = false;
    }
  });

  // Regex for file extension replacement
  const FILE_EXTENSION_REGEX = /\.[^.]+$/;

  function formatBytes(bytes: number): string {
    if (bytes === 0) {
      return "0 B";
    }
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  }

  async function handleExport(format: string) {
    if (!mediaData.value) {
      return;
    }

    exportingFormat.value = format;

    try {
      if (resultType.value === "image") {
        await exportImage(format as ImageFormat);
      } else {
        // 视频导出（预留）
        await exportVideo(format as VideoFormat);
      }
    } finally {
      exportingFormat.value = null;
    }
  }

  async function exportImage(format: ImageFormat) {
    if (!mediaData.value) {
      return;
    }

    // 如果格式相同，直接下载
    if (format === originalFormat.value) {
      downloadFile(mediaData.value, fileName.value);
      return;
    }

    // 转换格式
    const img = new Image();
    img.src = mediaData.value;

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

    const quality = format === "jpeg" ? 0.92 : undefined;
    const mimeType = `image/${format}`;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          showNotification("导出失败", "error");
          return;
        }

        const url = URL.createObjectURL(blob);
        const newFileName = fileName.value.replace(
          FILE_EXTENSION_REGEX,
          `.${format}`
        );
        downloadFile(url, newFileName);
        URL.revokeObjectURL(url);
        showNotification(`已导出为 ${format.toUpperCase()}`, "success");
      },
      mimeType,
      quality
    );
  }

  async function exportVideo(format: VideoFormat) {
    if (!mediaData.value) {
      return;
    }

    try {
      // 如果格式相同，直接下载
      if (format === originalFormat.value) {
        downloadFile(mediaData.value, fileName.value);
        showNotification(`已导出为 ${format.toUpperCase()}`, "success");
        return;
      }

      // 使用 MediaBunny 进行格式转换 - 完全按照官方示例
      const {
        Input,
        Output,
        Conversion,
        BlobSource,
        BufferTarget,
        Mp4OutputFormat,
        WebMOutputFormat,
        ALL_FORMATS,
      } = await import("mediabunny");

      showNotification(`正在转换为 ${format.toUpperCase()}...`, "info");

      // 将 dataURL 转换为 Blob
      const blob = await fetch(mediaData.value).then((res) => res.blob());

      // Create a new input from the resource - 按照官方示例
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS, // Accept all formats
      });

      // 配置输出格式 - 完全按照官方示例，不添加额外配置
      let outputFormat:
        | InstanceType<typeof Mp4OutputFormat>
        | InstanceType<typeof WebMOutputFormat>;
      if (format === "mp4") {
        outputFormat = new Mp4OutputFormat();
      } else if (format === "webm") {
        outputFormat = new WebMOutputFormat();
      } else if (format === "gif") {
        showNotification("GIF 导出功能即将推出", "info");
        return;
      } else {
        showNotification("不支持的格式", "error");
        return;
      }

      // Define the output file - 按照官方示例
      const output = new Output({
        target: new BufferTarget(),
        format: outputFormat,
      });

      // Initialize the conversion process - 完全按照官方示例
      // 不指定任何编解码器，让 MediaBunny 自动选择
      const conversion = await Conversion.init({
        input,
        output,
      });

      // 检查转换是否有效
      if (!conversion.isValid) {
        console.warn(
          "Conversion invalid, discarded tracks:",
          conversion.discardedTracks
        );
        const discardedInfo = conversion.discardedTracks
          .map((t: any) => `${t.track?.type || "unknown"}: ${t.reason}`)
          .join(", ");
        showNotification(
          `转换失败：${discardedInfo || "不支持的轨道"}`,
          "error"
        );
        return;
      }

      // Keep track of progress
      let progress = 0;
      conversion.onProgress = (newProgress: number) => {
        progress = newProgress;
        console.log(`Conversion progress: ${Math.round(progress * 100)}%`);
      };

      // Start the conversion process
      await conversion.execute();

      // Display the final media file - 按照官方示例
      const outputBuffer = output.target.buffer;
      if (!outputBuffer) {
        throw new Error("转换失败：输出为空");
      }

      const mimeType = output.format.mimeType;
      const outputBlob = new Blob([outputBuffer], { type: mimeType });

      // 下载转换后的文件
      const url = URL.createObjectURL(outputBlob);
      const newFileName = fileName.value.replace(
        FILE_EXTENSION_REGEX,
        `.${format}`
      );
      downloadFile(url, newFileName);
      URL.revokeObjectURL(url);

      showNotification(`已成功导出为 ${format.toUpperCase()}`, "success");
    } catch (err) {
      console.error("视频导出失败:", err);
      showNotification(`导出失败: ${err}`, "error");
    }
  }

  function downloadFile(url: string, name: string) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCopyToClipboard() {
    if (!mediaData.value) {
      return;
    }

    try {
      if (resultType.value === "image") {
        const blob = await fetch(mediaData.value).then((res) => res.blob());
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);

        copySuccess.value = true;
        setTimeout(() => {
          copySuccess.value = false;
        }, 2000);
        showNotification("已复制到剪贴板", "success");
      } else {
        // 视频不支持复制到剪贴板，提供下载链接
        downloadFile(mediaData.value, fileName.value);
        showNotification("已开始下载视频", "success");
      }
    } catch (err) {
      console.error("操作失败:", err);
      showNotification("操作失败，请手动下载", "error");
    }
  }

  function handleClose() {
    window.close();
  }
</script>

<template>
  <div class="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950">
    <!-- 顶部信息栏 -->
    <header
      class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mx-auto max-w-screen-2xl px-6 py-4">
        <div class="flex items-center justify-between">
          <!-- Logo 和标题 -->
          <div class="flex items-center gap-4">
            <div
              class="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600"
            >
              <svg
                v-if="resultType === 'image'"
                class="size-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <svg
                v-else
                class="size-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ resultTypeLabel }}结果
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Recosite - 网页截图与录屏工具
              </p>
            </div>
          </div>

          <!-- 关闭按钮 -->
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="handleClose"
          >
            关闭
          </button>
        </div>

        <!-- 文件信息 -->
        <div
          v-if="!loading && !error"
          class="mt-4 flex flex-wrap gap-6 text-sm"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-700 dark:text-gray-300"
              >文件名:</span
            >
            <span
              class="rounded bg-gray-100 px-2 py-1 font-mono text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              >{{
                                fileName }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-700 dark:text-gray-300"
              >格式:</span
            >
            <span
              class="rounded bg-blue-100 px-2 py-1 font-mono uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >{{
                                originalFormat }}</span
            >
          </div>
          <div v-if="resultType === 'image'" class="flex items-center gap-2">
            <span class="font-medium text-gray-700 dark:text-gray-300"
              >尺寸:</span
            >
            <span
              class="rounded bg-green-100 px-2 py-1 font-mono text-green-700 dark:bg-green-900/30 dark:text-green-400"
              >{{
                                width }}
              × {{ height }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-700 dark:text-gray-300"
              >大小:</span
            >
            <span
              class="rounded bg-purple-100 px-2 py-1 font-mono text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
              >{{
                                fileSizeFormatted }}</span
            >
          </div>
        </div>
      </div>
    </header>

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

            <!-- 视频预览（预留） -->
            <video
              v-else
              :src="mediaData"
              controls
              class="max-h-full max-w-full rounded shadow-lg"
            />
          </div>
        </div>

        <!-- 右侧：操作面板 -->
        <div class="w-80 flex-shrink-0 space-y-4">
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
                  >{{ copySuccess ? '已复制' : (resultType === 'image' ? '复制到剪贴板' : '下载视频') }}</span
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
                                    exportingFormat === format && 'opacity-50 cursor-not-allowed'
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
                class="size-5 flex-shrink-0 text-blue-500"
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
                  转换为 JPEG 可以减小文件大小，但会失去透明度支持
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 通知消息 -->
    <transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="notification"
        class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
        style="z-index: 9999"
      >
        <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
          <div
            class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5"
            :class="{
                            'bg-white dark:bg-gray-800': notification.type === 'info',
                            'bg-green-50 dark:bg-green-900/30': notification.type === 'success',
                            'bg-red-50 dark:bg-red-900/30': notification.type === 'error',
                        }"
          >
            <div class="p-4">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg
                    v-if="notification.type === 'success'"
                    class="size-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <svg
                    v-else-if="notification.type === 'error'"
                    class="size-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <svg
                    v-else
                    class="size-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div class="ml-3 w-0 flex-1 pt-0.5">
                  <p
                    class="text-sm font-medium"
                    :class="{
                                        'text-gray-900 dark:text-white': notification.type === 'info',
                                        'text-green-800 dark:text-green-200': notification.type === 'success',
                                        'text-red-800 dark:text-red-200': notification.type === 'error',
                                    }"
                  >
                    {{ notification.message }}
                  </p>
                </div>
                <div class="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    :class="{
                                            'text-gray-400 hover:text-gray-500 focus:ring-gray-500': notification.type === 'info',
                                            'text-green-500 hover:text-green-600 focus:ring-green-500': notification.type === 'success',
                                            'text-red-500 hover:text-red-600 focus:ring-red-500': notification.type === 'error',
                                        }"
                    @click="notification = null"
                  >
                    <span class="sr-only">关闭</span>
                    <svg class="size-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
