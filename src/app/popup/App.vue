<script setup lang="ts">
  import { onMounted, ref, watch } from "vue";
  import { sendMessage } from "webext-bridge/popup";
  import { browser } from "wxt/browser";
  import Toast from "@/components/Toast.vue";
  import { useToast } from "@/composables/useToast";
  import {
    ImageFormat,
    MessageType,
    RecordingState,
    VideoFormat,
  } from "@/types/screenshot";

  const { error } = useToast();
  const isCapturing = ref(false);
  const lastResult = ref<{
    fileName: string;
    width: number;
    height: number;
  } | null>(null);

  // 当前激活的标签页
  const activeTab = ref<"screenshot" | "recording">("screenshot");

  // 录制状态
  const recordingState = ref<RecordingState>(RecordingState.IDLE);
  const lastRecordingResult = ref<{
    fileName: string;
    size: number;
  } | null>(null);

  // 录制选项
  const recordingOptions = ref({
    systemAudio: true,
    microphone: true,
    camera: true,
  });

  // 检查录制状态
  async function checkRecordingStatus() {
    try {
      const response = await sendMessage(
        "recording:get-status",
        {},
        "background"
      );
      recordingState.value = response.state;
    } catch (err) {
      console.error("Failed to get recording status:", err);
    }
  }

  // 从 storage 加载上次的 tab 位置
  async function loadLastActiveTab() {
    try {
      const result = await browser.storage.local.get("activeTab");
      if (result.activeTab) {
        activeTab.value = result.activeTab as "screenshot" | "recording";
      }
    } catch (err) {
      console.error("Failed to load last active tab:", err);
    }
  }

  // 监听 tab 变化并保存到 storage
  watch(activeTab, async (newTab) => {
    try {
      await browser.storage.local.set({ activeTab: newTab });
    } catch (err) {
      console.error("Failed to save active tab:", err);
    }
  });

  // 页面加载时检查录制状态和恢复 tab 位置
  onMounted(() => {
    loadLastActiveTab();
    checkRecordingStatus();
  });

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

      // 获取当前活动标签页
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        error("未找到活动标签页");
        return;
      }

      // 注入 DOM 选择器脚本
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["/content-scripts/dom-selector.js"],
      });

      // 发送开始选择消息
      await browser.tabs.sendMessage(tab.id, {
        type: MessageType.START_DOM_SELECTION,
      });

      // 关闭 popup
      window.close();
    } catch (err) {
      error(`DOM截图失败: ${err}`);
      isCapturing.value = false;
    }
  }

  async function toggleRecording() {
    try {
      if (recordingState.value === RecordingState.RECORDING) {
        // 停止录制
        recordingState.value = RecordingState.PROCESSING;
        lastRecordingResult.value = null;

        const response = await sendMessage(
          "recording:stop-request",
          {},
          "background"
        );

        if (response.error) {
          error(`停止录制失败: ${response.error}`);
          recordingState.value = RecordingState.IDLE;
          return;
        }

        if (response.fileName && response.size !== undefined) {
          lastRecordingResult.value = {
            fileName: response.fileName,
            size: response.size,
          };
        }
        recordingState.value = RecordingState.IDLE;
      } else {
        // 开始录制
        lastRecordingResult.value = null;

        const response = await sendMessage(
          "recording:start-request",
          {
            format: VideoFormat.WEBM,
          },
          "background"
        );

        if (response.error) {
          error(`开始录制失败: ${response.error}`);
          return;
        }

        // 只有成功时才更新状态
        recordingState.value = RecordingState.RECORDING;
      }
    } catch (err) {
      error(`录制操作失败: ${err}`);
      recordingState.value = RecordingState.IDLE;
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
            <button
              type="button"
              class="flex-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md disabled:opacity-50 border-2 border-transparent hover:border-blue-500 active:border-green-500 flex flex-col items-center justify-center gap-1.5"
              :disabled="isCapturing"
              @click="captureFullPage"
            >
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >全页截图</span
              >
            </button>

            <!-- DOM截图 -->
            <button
              type="button"
              class="flex-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md disabled:opacity-50 border-2 border-transparent hover:border-blue-500 active:border-green-500 flex flex-col items-center justify-center gap-1.5"
              :disabled="isCapturing"
              @click="captureDom"
            >
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >DOM截图</span
              >
            </button>
          </div>

          <!-- 右侧：两个按钮垂直排列 -->
          <div class="flex flex-col gap-2.5">
            <!-- 视窗截图 -->
            <button
              type="button"
              class="flex-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md disabled:opacity-50 border-2 border-transparent hover:border-blue-500 active:border-green-500 flex flex-col items-center justify-center gap-1.5"
              :disabled="isCapturing"
              @click="captureViewport"
            >
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >视窗截图</span
              >
            </button>

            <!-- 选区截图 -->
            <button
              type="button"
              class="flex-1 rounded-lg bg-white dark:bg-gray-800 shadow-sm transition-all hover:shadow-md disabled:opacity-50 border-2 border-transparent hover:border-blue-500 active:border-green-500 flex flex-col items-center justify-center gap-1.5"
              :disabled="isCapturing"
              @click="captureSelection"
            >
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >选区截图</span
              >
            </button>
          </div>
        </div>

        <!-- 状态提示 -->
        <div
          v-if="isCapturing"
          class="mt-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2.5 text-center"
        >
          <div class="text-xs text-blue-700 dark:text-blue-300">截图中...</div>
        </div>

        <!-- 结果显示 -->
        <div
          v-if="lastResult"
          class="mt-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 p-2.5"
        >
          <div class="text-xs text-green-700 dark:text-green-300">
            <div class="font-medium">截图成功！</div>
            <div class="mt-0.5">
              {{ lastResult.fileName }}({{ lastResult.width }}×
              {{ lastResult.height }})
            </div>
          </div>
        </div>
      </div>

      <!-- 录制标签页内容 -->
      <div v-if="activeTab === 'recording'" class="h-full">
        <!-- 录制类型选择 -->
        <div class="grid grid-cols-2 gap-2.5 h-full">
          <!-- 页面录制 -->
          <button
            type="button"
            :class="[
                        'rounded-lg p-5 shadow-sm transition-all hover:shadow-md border-2 flex flex-col items-center justify-center gap-1.5',
                        recordingState === RecordingState.RECORDING
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-500 animate-pulse'
                            : 'bg-white dark:bg-gray-800 border-transparent hover:border-blue-500 active:border-green-500'
                    ]"
            :disabled="recordingState === RecordingState.PROCESSING || isCapturing"
            @click="toggleRecording"
          >
            <svg
              v-if="recordingState !== RecordingState.RECORDING"
              class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              class="w-10 h-10 text-red-600 dark:text-red-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="8"/>
              <rect x="9" y="9" width="6" height="6" fill="white" rx="1"/>
            </svg>
            <span
              v-if="recordingState !== RecordingState.RECORDING"
              class="text-xs font-medium text-gray-800 dark:text-gray-200"
              >页面录制</span
            >
            <div v-else class="text-center">
              <div class="text-xs font-bold text-red-600 dark:text-red-400">
                录制中
              </div>
              <div class="text-[10px] text-red-500 dark:text-red-500 mt-0.5">
                点击停止录制
              </div>
            </div>
          </button>

          <!-- 窗口录制（暂不实现） -->
          <button
            type="button"
            class="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm transition-all opacity-50 cursor-not-allowed border-2 border-transparent"
            disabled
          >
            <div class="flex flex-col items-center gap-1.5">
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M3 9 L3 7 C3 5.89543 3.89543 5 5 5 L19 5 C20.1046 5 21 5.89543 21 7 L21 9 M3 9 L21 9 M3 9 L3 17 C3 18.1046 3.89543 19 5 19 L19 19 C20.1046 19 21 18.1046 21 17 L21 9"
                  stroke-width="1.5"
                />
              </svg>
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >窗口录制</span
              >
            </div>
          </button>

          <!-- 桌面录制（暂不实现） -->
          <button
            type="button"
            class="rounded-lg bg-white dark:bg-gray-800 p-5 shadow-sm transition-all opacity-50 cursor-not-allowed border-2 border-transparent"
            disabled
          >
            <div class="flex flex-col items-center gap-1.5">
              <svg
                class="w-10 h-10 text-gray-600 dark:text-gray-400"
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
              <span class="text-xs font-medium text-gray-800 dark:text-gray-200"
                >桌面录制</span
              >
            </div>
          </button>

          <!-- 录制选项 -->
          <div
            class="rounded-lg bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <div class="space-y-3">
              <!-- 系统音频 -->
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-medium text-gray-700 dark:text-gray-300"
                  >系统音频</span
                >
                <button
                  type="button"
                  :class="[
                                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                    recordingOptions.systemAudio ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                ]"
                  @click="recordingOptions.systemAudio = !recordingOptions.systemAudio"
                >
                  <span
                    :class="[
                                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                        recordingOptions.systemAudio ? 'translate-x-5' : 'translate-x-0.5'
                                    ]"
                  />
                </button>
              </div>

              <!-- 麦克风 -->
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-medium text-gray-700 dark:text-gray-300"
                  >麦克风</span
                >
                <button
                  type="button"
                  :class="[
                                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                    recordingOptions.microphone ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                ]"
                  @click="recordingOptions.microphone = !recordingOptions.microphone"
                >
                  <span
                    :class="[
                                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                        recordingOptions.microphone ? 'translate-x-5' : 'translate-x-0.5'
                                    ]"
                  />
                </button>
              </div>

              <!-- 摄像头 -->
              <div class="flex items-center justify-between">
                <span
                  class="text-xs font-medium text-gray-700 dark:text-gray-300"
                  >摄像头</span
                >
                <button
                  type="button"
                  :class="[
                                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                                    recordingOptions.camera ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                ]"
                  @click="recordingOptions.camera = !recordingOptions.camera"
                >
                  <span
                    :class="[
                                        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                                        recordingOptions.camera ? 'translate-x-5' : 'translate-x-0.5'
                                    ]"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 录制状态提示 -->
        <div
          v-if="recordingState === RecordingState.RECORDING"
          class="rounded-lg bg-red-50 dark:bg-red-900/30 p-2.5 text-center"
        >
          <div class="text-xs text-red-700 dark:text-red-300">
            <div class="font-medium">🔴 正在录制中...</div>
          </div>
        </div>

        <div
          v-if="recordingState === RecordingState.PROCESSING"
          class="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2.5 text-center"
        >
          <div class="text-xs text-blue-700 dark:text-blue-300">
            处理录制文件中...
          </div>
        </div>

        <!-- 录制结果显示 -->
        <div
          v-if="lastRecordingResult"
          class="rounded-lg bg-green-50 dark:bg-green-900/30 p-2.5"
        >
          <div class="text-xs text-green-700 dark:text-green-300">
            <div class="font-medium">录制成功！</div>
            <div class="mt-0.5">
              {{ lastRecordingResult.fileName }}(
              {{ formatFileSize(lastRecordingResult.size) }})
            </div>
          </div>
        </div>
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
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
