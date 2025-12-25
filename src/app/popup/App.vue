<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import { sendMessage } from "webext-bridge/popup";
  import { browser } from "wxt/browser";
  import ActionButton from "@/components/ActionButton.vue";
  import StatusCard from "@/components/StatusCard.vue";
  import Toast from "@/components/Toast.vue";
  import { useRecordingState } from "@/composables";
  import { useToast } from "@/composables/useToast";
  import {
    ImageFormat,
    RecordingState,
    VideoFormat,
    VideoResolution,
  } from "@/types/screenshot";
  import { t } from "@/utils/i18n";

  const { error } = useToast();
  const isCapturing = ref(false);
  const lastResult = ref<{
    fileName: string;
    width: number;
    height: number;
  } | null>(null);

  // 录制状态管理
  const {
    recordingState,
    recordingType,
    lastRecordingResult,
    toggleRecording,
  } = useRecordingState();

  // 录制选项
  const recordingOptions = ref({
    resolution: VideoResolution.AUTO as VideoResolution,
  });

  // 从本地存储加载录制选项
  async function loadRecordingOptions() {
    try {
      const { browser: browserAPI } = await import("wxt/browser");
      const result = await browserAPI.storage.local.get(["recordingOptions"]);
      if (result.recordingOptions) {
        recordingOptions.value = {
          ...recordingOptions.value,
          resolution:
            result.recordingOptions.resolution || VideoResolution.AUTO,
        };
      }
    } catch (loadError) {
      console.warn("[Popup] Failed to load recording options:", loadError);
    }
  }

  // 保存录制选项到本地存储
  async function saveRecordingOptions() {
    try {
      const { browser: browserAPI } = await import("wxt/browser");
      await browserAPI.storage.local.set({
        recordingOptions: recordingOptions.value,
      });
    } catch (saveError) {
      console.warn("[Popup] Failed to save recording options:", saveError);
    }
  }

  // 监听录制选项变化并保存
  watch(
    recordingOptions,
    () => {
      saveRecordingOptions();
    },
    { deep: true }
  );

  // 分辨率选项
  const resolutionOptions = [
    {
      value: VideoResolution.AUTO,
      label: t("resolution_auto"),
      description: t("resolution_auto_desc"),
    },
    {
      value: VideoResolution.HD,
      label: t("resolution_720p"),
      description: t("resolution_720p_desc"),
    },
    {
      value: VideoResolution.FHD,
      label: t("resolution_1080p"),
      description: t("resolution_1080p_desc"),
    },
    {
      value: VideoResolution.UHD,
      label: t("resolution_4k"),
      description: t("resolution_4k_desc"),
    },
  ];

  async function captureViewport() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await sendMessage(
        "capture:viewport",
        { format: ImageFormat.PNG, quality: 0.92 },
        "background"
      );

      if (!response.success || response.error) {
        error(t("error_screenshot_failed", response.error));
        return;
      }

      lastResult.value = {
        fileName: response.fileName,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error(t("error_screenshot_failed", String(err)));
    } finally {
      isCapturing.value = false;
    }
  }

  async function captureFullPage() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await sendMessage(
        "capture:fullPage",
        { format: ImageFormat.PNG, quality: 0.92 },
        "background"
      );

      if (!response.success || response.error) {
        error(t("error_screenshot_failed", response.error));
        return;
      }

      lastResult.value = {
        fileName: response.fileName,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error(t("error_screenshot_failed", String(err)));
    } finally {
      isCapturing.value = false;
    }
  }

  async function handleToggleRecording(type = "tab") {
    const result = await toggleRecording(VideoFormat.WEBM, {
      type: type as "tab" | "window",
      resolution: recordingOptions.value.resolution,
    });
    if (!result.success && result.error) {
      error(t("error_recording_failed", result.error));
    }
  }

  function handleCloseStatusCard() {
    lastResult.value = null;
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} ${t("size_unit_bytes")}`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} ${t("size_unit_kilobytes")}`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} ${t("size_unit_megabytes")}`;
  }

  // 计算当前状态卡片的配置
  const statusCardConfig = computed(() => {
    // 截图状态
    if (isCapturing.value) {
      return {
        show: true,
        type: "info" as const,
        message: t("status_capturing"),
        closable: false,
      };
    }
    if (lastResult.value) {
      return {
        show: true,
        type: "success" as const,
        title: t("status_screenshot_success"),
        message: `${lastResult.value.fileName} (${lastResult.value.width}×${lastResult.value.height})`,
        closable: true,
      };
    }

    // 录制状态
    if (recordingState.value === RecordingState.RECORDING) {
      return {
        show: true,
        type: "error" as const,
        message: t("status_recording_in_progress"),
        closable: false,
      };
    }
    if (recordingState.value === RecordingState.PROCESSING) {
      return {
        show: true,
        type: "info" as const,
        message: t("status_processing_recording"),
        closable: false,
      };
    }
    if (lastRecordingResult.value) {
      return {
        show: true,
        type: "success" as const,
        title: t("status_recording_success"),
        message: `${lastRecordingResult.value.fileName} (${formatFileSize(lastRecordingResult.value.size)})`,
        closable: true,
      };
    }

    return { show: false };
  });

  // 组件挂载时加载录制选项
  onMounted(() => {
    loadRecordingOptions();
  });
</script>

<template>
  <Toast/>
  <div class="flex flex-col w-[340px] bg-gray-50 dark:bg-gray-900">
    <!-- 内容区域 -->
    <div class="p-3 space-y-3">
      <!-- 截图区域 -->
      <div>
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {{ t('section_screenshot') }}
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <!-- 全页截图 -->
          <ActionButton
            :label="t('action_fullpage_screenshot')"
            :disabled="isCapturing || recordingState === RecordingState.RECORDING"
            @click="captureFullPage"
          >
            <template #icon>
              <span class="i-hugeicons-border-full text-3xl"/>
            </template>
          </ActionButton>

          <!-- 视窗截图 -->
          <ActionButton
            :label="t('action_viewport_screenshot')"
            :disabled="isCapturing || recordingState === RecordingState.RECORDING"
            @click="captureViewport"
          >
            <template #icon>
              <span class="i-hugeicons-cursor-in-window text-3xl"/>
            </template>
          </ActionButton>
        </div>
      </div>

      <!-- 录制区域 -->
      <div>
        <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          {{ t('section_recording') }}
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <!-- 页面录制 -->
          <ActionButton
            :label="recordingState === RecordingState.RECORDING && recordingType === 'tab' ? t('status_recording') : t('action_tab_recording')"
            :sublabel="recordingState === RecordingState.RECORDING && recordingType === 'tab' ? t('status_click_to_stop') : undefined"
            :active="recordingState === RecordingState.RECORDING && recordingType === 'tab'"
            :animate="recordingState === RecordingState.RECORDING && recordingType === 'tab'"
            :disabled="recordingState === RecordingState.PROCESSING || isCapturing || (recordingState === RecordingState.RECORDING && recordingType !== 'tab')"
            @click="handleToggleRecording('tab')"
          >
            <template #icon>
              <span
                :class="['text-3xl', {
                    'i-hugeicons-file-video': recordingState === RecordingState.IDLE || recordingType !== 'tab',
                    'i-hugeicons-stop-circle': recordingState === RecordingState.RECORDING && recordingType === 'tab',
                }]"
              />
            </template>
          </ActionButton>

          <!-- 窗口录制 -->
          <ActionButton
            :label="recordingState === RecordingState.RECORDING && recordingType === 'window' ? t('status_recording') : t('action_window_recording')"
            :sublabel="recordingState === RecordingState.RECORDING && recordingType === 'window' ? t('status_click_to_stop') : undefined"
            :active="recordingState === RecordingState.RECORDING && recordingType === 'window'"
            :animate="recordingState === RecordingState.RECORDING && recordingType === 'window'"
            :disabled="recordingState === RecordingState.PROCESSING || isCapturing || (recordingState === RecordingState.RECORDING && recordingType !== 'window')"
            @click="handleToggleRecording('window')"
          >
            <template #icon>
              <span
                :class="['text-3xl', {
                    'i-hugeicons-video-ai': recordingState === RecordingState.IDLE || recordingType !== 'window',
                    'i-hugeicons-stop-circle': recordingState === RecordingState.RECORDING && recordingType === 'window',
                }]"
              />
            </template>
          </ActionButton>
        </div>
      </div>

      <!-- 录制选项 -->
      <div
        class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3"
      >
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t('recording_option_resolution') }}
          </label>
          <select
            v-model="recordingOptions.resolution"
            class="w-20 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <option
              v-for="option in resolutionOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 状态卡片 -->
    <StatusCard
      v-if="statusCardConfig.show"
      :type="statusCardConfig.type!"
      :title="statusCardConfig.title"
      :message="statusCardConfig.message!"
      :closable="statusCardConfig.closable!"
      @close="handleCloseStatusCard"
    />
  </div>
</template>
