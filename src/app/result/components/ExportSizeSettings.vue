<script setup lang="ts">
  import { watch } from "vue";
  import {
    type ExportSizeSettings,
    useExportSize,
  } from "@/composables/useExportSize";

  interface Props {
    originalWidth: number;
    originalHeight: number;
    modelValue?: ExportSizeSettings;
  }

  type Emits = (e: "update:modelValue", value: ExportSizeSettings) => void;

  const props = defineProps<Props>();
  const emit = defineEmits<Emits>();

  // 使用 composable hook
  const {
    currentScale,
    currentWidth,
    currentHeight,
    showOriginal,
    presetScales,
    onScaleChange,
    onWidthChange,
    onHeightChange,
    toggleShowOriginal,
    formatScale,
    setSettings,
  } = useExportSize({
    originalWidth: props.originalWidth,
    originalHeight: props.originalHeight,
    initialValue: props.modelValue,
  });

  // 发送更新事件
  function emitUpdate() {
    emit("update:modelValue", {
      width: currentWidth.value,
      height: currentHeight.value,
      scale: currentScale.value,
      showOriginal: showOriginal.value,
    });
  }

  // 包装事件处理函数，在调用后发送更新事件
  function handleScaleChange(newScale: number) {
    onScaleChange(newScale);
    emitUpdate();
  }

  function handleWidthChange(newWidth: number) {
    onWidthChange(newWidth);
    emitUpdate();
  }

  function handleHeightChange(newHeight: number) {
    onHeightChange(newHeight);
    emitUpdate();
  }

  function handleToggleShowOriginal() {
    toggleShowOriginal();
    emitUpdate();
  }

  // 监听外部变化
  watch(
    () => props.modelValue,
    (newValue) => {
      if (newValue) {
        setSettings(newValue);
      }
    },
    { deep: true }
  );
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
  >
    <!-- 卡片 Header -->
    <div class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">
          导出尺寸
        </h3>
        <span
          class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        >
          {{ showOriginal ? `${originalWidth} × ${originalHeight}` : `${currentWidth} × ${currentHeight}` }}
        </span>
      </div>
      <button
        type="button"
        :class="[
          'flex size-8 items-center justify-center rounded-lg transition-colors',
          showOriginal
            ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300'
        ]"
        :title="showOriginal ? '点击显示调整后的尺寸' : '点击显示原始尺寸'"
        @click="handleToggleShowOriginal"
      >
        <!-- 眼睛图标 -->
        <svg
          class="size-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="showOriginal"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            v-if="showOriginal"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
      </button>
    </div>

    <!-- 卡片内容 -->
    <div class="space-y-3">
      <!-- 缩放控制和尺寸输入 -->
      <div class="flex items-center gap-2">
        <!-- 左侧：缩放下拉列表 -->
        <div class="w-20 relative">
          <select
            :value="currentScale"
            class="w-full appearance-none rounded-lg border border-gray-300 bg-white px-2 py-1.5 h-9 pr-6 text-sm font-medium text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            @change="handleScaleChange(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="scale in presetScales" :key="scale" :value="scale">
              {{ formatScale(scale) }}
            </option>
          </select>
          <!-- 下拉箭头 -->
          <div
            class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1"
          >
            <svg
              class="size-3.5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        <!-- 右侧：宽高输入框 -->
        <div class="flex items-center gap-1.5">
          <!-- 宽度输入 -->
          <div class="flex items-center gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">
              宽
            </label>
            <input
              :value="currentWidth"
              type="number"
              min="100"
              max="10000"
              class="w-20 rounded-lg h-9 border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              @input="handleWidthChange(Number(($event.target as HTMLInputElement).value))"
            >
          </div>

          <!-- 高度输入 -->
          <div class="flex items-center gap-1">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-400">
              高
            </label>
            <input
              :value="currentHeight"
              type="number"
              min="100"
              max="10000"
              class="w-20 rounded-lg h-9 border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              @input="handleHeightChange(Number(($event.target as HTMLInputElement).value))"
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
