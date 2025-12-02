<script setup lang="ts">
  import { computed, onMounted, ref, watch } from "vue";
  import { sendMessage } from "webext-bridge/popup";
  import { browser } from "wxt/browser";
  import ActionButton from "@/components/ActionButton.vue";
  import StatusCard from "@/components/StatusCard.vue";
  import Toast from "@/components/Toast.vue";
  import ToggleSwitch from "@/components/ToggleSwitch.vue";
  import { useRecordingState, useTabPersistence } from "@/composables";
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

  // Tab 持久化
  const { activeTab } = useTabPersistence("screenshot");

  // 录制状态管理
  const {
    recordingState,
    recordingType,
    lastRecordingResult,
    toggleRecording,
  } = useRecordingState();

  // 录制选项
  const recordingOptions = ref({
    systemAudio: true,
    microphone: true,
    camera: true,
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
          ...result.recordingOptions,
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

  async function captureSelection() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await sendMessage(
        "capture:selection",
        { format: ImageFormat.PNG, quality: 0.92 },
        "background"
      );

      if (response.cancelled) {
        isCapturing.value = false;
        return;
      }

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

  async function captureDom() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        error(t("error_no_active_tab"));
        return;
      }

      try {
        // 使用 webext-bridge 发送消息到 content script
        await sendMessage(
          "dom:start-selection",
          {},
          `content-script@${tab.id}`
        );

        window.close();
      } catch (err) {
        // 如果 content script 未加载（新标签页或扩展刚安装）
        // 自动刷新页面并重试
        console.log("[Popup] Content script not loaded, reloading tab...");

        await browser.tabs.reload(tab.id);

        // 等待页面加载完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          await sendMessage(
            "dom:start-selection",
            {},
            `content-script@${tab.id}`
          );
          window.close();
        } catch (retryErr) {
          error(t("error_loading_failed"));
          isCapturing.value = false;
        }
      }
    } catch (err) {
      error(t("error_screenshot_failed", String(err)));
      isCapturing.value = false;
    }
  }

  async function handleToggleRecording(type = "tab") {
    const result = await toggleRecording(VideoFormat.WEBM, {
      type: type as any,
      microphone: recordingOptions.value.microphone,
      camera: recordingOptions.value.camera,
      resolution: recordingOptions.value.resolution,
    });
    if (!result.success && result.error) {
      error(
        recordingState.value === RecordingState.RECORDING
          ? t("error_recording_failed", result.error)
          : t("error_recording_failed", result.error)
      );
    }
  }

  function handleCloseStatusCard() {
    // 关闭 StatusCard，清除状态
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
    if (activeTab.value === "screenshot") {
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
    }

    // 录制状态
    if (activeTab.value === "recording") {
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
  <div class="flex flex-col h-80 w-[340px] bg-gray-50 dark:bg-gray-900">
    <!-- 内容区域 -->
    <div class="flex-1 overflow-y-auto p-3">
      <!-- 截图标签页内容 -->
      <div v-if="activeTab === 'screenshot'" class="h-full">
        <div class="grid grid-cols-2 gap-2.5 h-full">
          <!-- 左侧：全页截图和DOM截图垂直排列 -->
          <div class="flex flex-col gap-2.5">
            <!-- 全页截图 -->
            <ActionButton
              :label="t('action_fullpage_screenshot')"
              :disabled="isCapturing"
              @click="captureFullPage"
            >
              <template #icon>
                <span class="i-hugeicons-border-full text-3xl"/>
              </template>
            </ActionButton>

            <!-- DOM截图 -->
            <ActionButton
              :label="t('action_dom_screenshot')"
              :disabled="isCapturing"
              @click="captureDom"
            >
              <template #icon>
                <span class="i-hugeicons-cursor-pointer-02 text-3xl"/>
              </template>
            </ActionButton>
          </div>

          <!-- 右侧：视窗截图和选区截图 -->
          <div class="flex flex-col gap-2.5">
            <!-- 视窗截图 -->
            <ActionButton
              :label="t('action_viewport_screenshot')"
              :disabled="isCapturing"
              @click="captureViewport"
            >
              <template #icon>
                <span class="i-hugeicons-cursor-in-window text-3xl"/>
              </template>
            </ActionButton>

            <!-- 选区截图 -->
            <ActionButton
              :label="t('action_selection_screenshot')"
              :disabled="isCapturing"
              @click="captureSelection"
            >
              <template #icon>
                <span
                  class="i-hugeicons-cursor-rectangle-selection-02 text-3xl"
                />
              </template>
            </ActionButton>
          </div>
        </div>
      </div>

      <!-- 录制标签页内容 -->
      <div v-if="activeTab === 'recording'" class="h-full">
        <!-- 录制类型选择 -->
        <div class="grid grid-cols-2 gap-2.5 h-full">
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

          <!-- 桌面录制 -->
          <ActionButton
            :label="recordingState === RecordingState.RECORDING && recordingType === 'desktop' ? t('status_recording') : t('action_desktop_recording')"
            :sublabel="recordingState === RecordingState.RECORDING && recordingType === 'desktop' ? t('status_click_to_stop') : undefined"
            :active="recordingState === RecordingState.RECORDING && recordingType === 'desktop'"
            :animate="recordingState === RecordingState.RECORDING && recordingType === 'desktop'"
            :disabled="recordingState === RecordingState.PROCESSING || isCapturing || (recordingState === RecordingState.RECORDING && recordingType !== 'desktop')"
            @click="handleToggleRecording('desktop')"
          >
            <template #icon>
              <span
                :class="['text-3xl', {
                    'i-hugeicons-laptop-video': recordingState === RecordingState.IDLE || recordingType !== 'desktop',
                    'i-hugeicons-stop-circle': recordingState === RecordingState.RECORDING && recordingType === 'desktop',
                }]"
              />
            </template>
          </ActionButton>

          <!-- 录制选项 -->
          <div
            class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="flex flex-col justify-between px-4 py-3 h-full w-full">
              <ToggleSwitch
                v-model="recordingOptions.microphone"
                :label="t('recording_option_microphone')"
                disabled
              />
              <ToggleSwitch
                v-model="recordingOptions.camera"
                :label="t('recording_option_camera')"
                disabled
              />

              <!-- 分辨率选择 -->
              <div class="flex items-center justify-between gap-1">
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {{ t('recording_option_resolution') }}
                </label>
                <select
                  v-model="recordingOptions.resolution"
                  class="w-16 rounded-lg border border-gray-300 bg-white px-1 py-0.5 h-7 text-xs font-medium text-gray-700 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
        </div>
      </div>
    </div>

    <!-- 底部标签栏 -->
    <div
      class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div class="grid grid-cols-2 h-12">
        <!-- 截图标签 -->
        <button
          type="button"
          :class="[
                    'flex items-center justify-center gap-1 transition-colors border-t-2',
                    activeTab === 'screenshot'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                ]"
          @click="activeTab = 'screenshot'"
        >
          <span class="i-hugeicons-image-03 text-lg"/>
          <span class="text-sm font-medium"
            >{{ t('popup_screenshot_tab') }}</span
          >
        </button>

        <!-- 录制标签 -->
        <button
          type="button"
          :class="[
                    'flex items-center justify-center gap-1 transition-colors border-t-2',
                    activeTab === 'recording'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                ]"
          @click="activeTab = 'recording'"
        >
          <span
            :class="['i-hugeicons-projector text-lg', {'text-ref-500': recordingState === RecordingState.RECORDING}]"
          />
          <span class="text-sm font-medium"
            >{{ t('popup_recording_tab') }}</span
          >
        </button>
      </div>
    </div>

    <!-- 状态卡片 - 固定在底部左侧，支持折叠 -->
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
