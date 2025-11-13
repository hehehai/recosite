<script setup lang="ts">
  import { onMounted, ref, watch } from "vue";
  import { browser } from "wxt/browser";
  import ActionButton from "@/components/ActionButton.vue";
  import StatusCard from "@/components/StatusCard.vue";
  import Toast from "@/components/Toast.vue";
  import ToggleSwitch from "@/components/ToggleSwitch.vue";
  import { useRecordingState, useTabPersistence } from "@/composables";
  import { useToast } from "@/composables/useToast";
  import {
    ImageFormat,
    MessageType,
    RecordingState,
    VideoFormat,
    VideoResolution,
  } from "@/types/screenshot";

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
  const { recordingState, lastRecordingResult, toggleRecording } =
    useRecordingState();

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
    { value: VideoResolution.AUTO, label: "自动", description: "页面原始尺寸" },
    { value: VideoResolution.HD, label: "720p", description: "1280×720" },
    { value: VideoResolution.FHD, label: "1080p", description: "1920×1080" },
    { value: VideoResolution.UHD, label: "4K", description: "3840×2160" },
  ];

  async function captureViewport() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await browser.runtime.sendMessage({
        type: MessageType.CAPTURE_VIEWPORT,
        data: { format: ImageFormat.PNG, quality: 0.92 },
      });

      if (response.error) {
        error(`截图失败: ${response.error}`);
        return;
      }

      lastResult.value = {
        fileName: response.fileName,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error(`截图失败: ${err}`);
    } finally {
      isCapturing.value = false;
    }
  }

  async function captureFullPage() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await browser.runtime.sendMessage({
        type: MessageType.CAPTURE_FULL_PAGE,
        data: { format: ImageFormat.PNG, quality: 0.92 },
      });

      if (response.error) {
        error(`长截图失败: ${response.error}`);
        return;
      }

      lastResult.value = {
        fileName: response.fileName,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error(`长截图失败: ${err}`);
    } finally {
      isCapturing.value = false;
    }
  }

  async function captureSelection() {
    try {
      isCapturing.value = true;
      lastResult.value = null;

      const response = await browser.runtime.sendMessage({
        type: MessageType.START_SELECTION,
        data: { format: ImageFormat.PNG, quality: 0.92 },
      });

      if (response.cancelled) {
        isCapturing.value = false;
        return;
      }

      if (response.error) {
        error(`选区截图失败: ${response.error}`);
        return;
      }

      lastResult.value = {
        fileName: response.fileName,
        width: response.width,
        height: response.height,
      };
    } catch (err) {
      error(`选区截图失败: ${err}`);
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
        error("未找到活动标签页");
        return;
      }

      try {
        // Content script 已通过 manifest 自动注入，直接发送消息
        await browser.tabs.sendMessage(tab.id, {
          type: MessageType.START_DOM_SELECTION,
        });

        window.close();
      } catch (err) {
        // 如果 content script 未加载（新标签页或扩展刚安装）
        // 自动刷新页面并重试
        console.log("[Popup] Content script not loaded, reloading tab...");

        await browser.tabs.reload(tab.id);

        // 等待页面加载完成
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          await browser.tabs.sendMessage(tab.id, {
            type: MessageType.START_DOM_SELECTION,
          });
          window.close();
        } catch (retryErr) {
          error("加载失败，请手动刷新页面后重试");
          isCapturing.value = false;
        }
      }
    } catch (err) {
      error(`DOM截图失败: ${err}`);
      isCapturing.value = false;
    }
  }

  async function handleToggleRecording() {
    const result = await toggleRecording(VideoFormat.WEBM, {
      microphone: recordingOptions.value.microphone,
      camera: recordingOptions.value.camera,
      resolution: recordingOptions.value.resolution,
    });
    if (!result.success && result.error) {
      error(
        recordingState.value === RecordingState.RECORDING
          ? `停止录制失败: ${result.error}`
          : `开始录制失败: ${result.error}`
      );
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

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
              label="全页截图"
              :disabled="isCapturing"
              @click="captureFullPage"
            >
              <template #icon>
                <svg
                  class="w-full h-full"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke-width="1.5"
                  />
                </svg>
              </template>
            </ActionButton>

            <!-- DOM截图 -->
            <ActionButton
              label="DOM截图"
              :disabled="isCapturing"
              @click="captureDom"
            >
              <template #icon>
                <svg
                  class="w-full h-full"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 9h18M3 15h18M9 3v18M15 3v18"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="2"
                    stroke-width="1.5"
                  />
                </svg>
              </template>
            </ActionButton>
          </div>

          <!-- 右侧：视窗截图和选区截图 -->
          <div class="flex flex-col gap-2.5">
            <!-- 视窗截图 -->
            <ActionButton
              label="视窗截图"
              :disabled="isCapturing"
              @click="captureViewport"
            >
              <template #icon>
                <svg
                  class="w-full h-full"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="4"
                    y="6"
                    width="16"
                    height="12"
                    rx="2"
                    stroke-width="1.5"
                  />
                </svg>
              </template>
            </ActionButton>

            <!-- 选区截图 -->
            <ActionButton
              label="选区截图"
              :disabled="isCapturing"
              @click="captureSelection"
            >
              <template #icon>
                <svg
                  class="w-full h-full"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M3 12 L8 12 M12 3 L12 8 M16 12 L21 12 M12 16 L12 21"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                  <path
                    d="M8 8 L16 16 M16 8 L8 16"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    opacity="0.5"
                  />
                </svg>
              </template>
            </ActionButton>
          </div>
        </div>

        <!-- 状态提示 -->
        <StatusCard v-if="isCapturing" type="info" message="截图中..."/>

        <!-- 结果显示 -->
        <StatusCard
          v-if="lastResult"
          type="success"
          title="截图成功！"
          :message="`${lastResult.fileName}(${lastResult.width}×${lastResult.height})`"
        />
      </div>

      <!-- 录制标签页内容 -->
      <div v-if="activeTab === 'recording'" class="h-full">
        <!-- 录制类型选择 -->
        <div class="grid grid-cols-2 gap-2.5 h-full">
          <!-- 页面录制 -->
          <ActionButton
            :label="recordingState === RecordingState.RECORDING ? '录制中' : '页面录制'"
            sublabel="点击停止录制"
            :active="recordingState === RecordingState.RECORDING"
            :animate="recordingState === RecordingState.RECORDING"
            :disabled="recordingState === RecordingState.PROCESSING || isCapturing"
            @click="handleToggleRecording"
          >
            <template #icon>
              <svg
                v-if="recordingState !== RecordingState.RECORDING"
                class="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="2"
                  stroke-width="1.5"
                />
              </svg>
              <svg
                v-else
                class="w-full h-full"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="8"/>
                <rect x="9" y="9" width="6" height="6" fill="white" rx="1"/>
              </svg>
            </template>
          </ActionButton>

          <!-- 窗口录制（暂不实现） -->
          <ActionButton label="窗口录制" :disabled="true">
            <template #icon>
              <svg
                class="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 9 L3 7 C3 5.89543 3.89543 5 5 5 L19 5 C20.1046 5 21 5.89543 21 7 L21 9 M3 9 L21 9 M3 9 L3 17 C3 18.1046 3.89543 19 5 19 L19 19 C20.1046 19 21 18.1046 21 17 L21 9"
                  stroke-width="1.5"
                />
              </svg>
            </template>
          </ActionButton>

          <!-- 桌面录制（暂不实现） -->
          <ActionButton label="桌面录制" :disabled="true">
            <template #icon>
              <svg
                class="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="12"
                  rx="2"
                  stroke-width="1.5"
                />
                <path
                  d="M8 20 L16 20 M12 16 L12 20"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </template>
          </ActionButton>

          <!-- 录制选项 -->
          <div
            class="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="space-y-2">
              <ToggleSwitch
                v-model="recordingOptions.microphone"
                label="麦克风"
              />
              <ToggleSwitch v-model="recordingOptions.camera" label="摄像头"/>

              <!-- 分辨率选择 -->
              <div
                v-if="recordingOptions.camera"
                class="flex items-center justify-between gap-1"
              >
                <label
                  class="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  分辨率
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

        <!-- 录制状态提示 -->
        <StatusCard
          v-if="recordingState === RecordingState.RECORDING"
          type="error"
          message="🔴 正在录制中..."
        />

        <StatusCard
          v-if="recordingState === RecordingState.PROCESSING"
          type="info"
          message="处理录制文件中..."
        />

        <!-- 录制结果显示 -->
        <StatusCard
          v-if="lastRecordingResult"
          type="success"
          title="录制成功！"
          :message="`${lastRecordingResult.fileName}( ${formatFileSize(lastRecordingResult.size)})`"
        />
      </div>
    </div>

    <!-- 底部标签栏 -->
    <div
      class="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
    >
      <div class="grid grid-cols-2 h-16">
        <!-- 截图标签 -->
        <button
          type="button"
          :class="[
                    'flex flex-col items-center justify-center gap-1 transition-colors border-t-2',
                    activeTab === 'screenshot'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                ]"
          @click="activeTab = 'screenshot'"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M4 16 L4 18 C4 19.1046 4.89543 20 6 20 L18 20 C19.1046 20 20 19.1046 20 18 L20 16 M16 8 L12 4 M12 4 L8 8 M12 4 L12 16"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="text-xs font-medium">截图</span>
        </button>

        <!-- 录制标签 -->
        <button
          type="button"
          :class="[
                    'flex flex-col items-center justify-center gap-1 transition-colors border-t-2',
                    activeTab === 'recording'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                ]"
          @click="activeTab = 'recording'"
        >
          <div class="relative">
            <svg
              v-if="recordingState !== RecordingState.RECORDING"
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="8" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="8"/>
              <rect x="9" y="9" width="6" height="6" fill="white"/>
            </svg>
          </div>
          <span class="text-xs font-medium">录制</span>
        </button>
      </div>
    </div>
  </div>
</template>
