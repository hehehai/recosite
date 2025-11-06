<script setup lang="ts">
  defineProps<{
    resultTypeLabel: string;
    fileName: string;
    originalFormat: string;
    width: number;
    height: number;
    fileSizeFormatted: string;
    isVideo: boolean;
    duration?: string;
  }>();

  const emit = defineEmits<{
    close: [];
    showDetails: [];
  }>();
</script>

<template>
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
              v-if="!isVideo"
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

        <!-- 按钮组 -->
        <div class="flex gap-2">
          <button
            v-if="isVideo"
            type="button"
            class="rounded-lg border border-blue-500 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            @click="emit('showDetails')"
          >
            视频详情
          </button>
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="emit('close')"
          >
            关闭
          </button>
        </div>
      </div>

      <!-- 文件信息 -->
      <div class="mt-4 flex flex-wrap gap-6 text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >文件名:</span
          >
          <span
            class="rounded bg-gray-100 px-2 py-1 font-mono text-gray-900 dark:bg-gray-800 dark:text-gray-100"
          >
            {{ fileName }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >格式:</span
          >
          <span
            class="rounded bg-blue-100 px-2 py-1 font-mono uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          >
            {{ originalFormat }}
          </span>
        </div>
        <div v-if="!isVideo" class="flex items-center gap-2">
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >尺寸:</span
          >
          <span
            class="rounded bg-green-100 px-2 py-1 font-mono text-green-700 dark:bg-green-900/30 dark:text-green-400"
          >
            {{ width }}× {{ height }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >大小:</span
          >
          <span
            class="rounded bg-purple-100 px-2 py-1 font-mono text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          >
            {{ fileSizeFormatted }}
          </span>
        </div>
        <div v-if="isVideo && duration" class="flex items-center gap-2">
          <span class="font-medium text-gray-700 dark:text-gray-300"
            >时长:</span
          >
          <span
            class="rounded bg-orange-100 px-2 py-1 font-mono text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          >
            {{ duration }}
          </span>
        </div>
      </div>
    </div>
  </header>
</template>
