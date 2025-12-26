<template>
  <div class="flex w-[340px] flex-col bg-background">
    <!-- 内容区域 -->
    <div class="space-y-3 p-3">
      <!-- 截图区域 -->
      <ScreenshotSection
        :is-capturing="isCapturing"
        :recording-state="recordingState"
        @capture-fullpage="captureFullPage"
        @capture-viewport="captureViewport"
      />

      <!-- 录制区域 -->
      <RecordingSection
        :recording-state="recordingState"
        :recording-type="recordingType"
        :is-capturing="isCapturing"
        @toggle-recording="handleToggleRecording"
      >
        <template #header-extra>
          <RecordingOptions v-model="recordingOptions.resolution" />
        </template>
      </RecordingSection>

      <!-- 工具区域 -->
      <ToolsSection
        :is-getting-page-info="isGettingPageInfo"
        :is-capturing="isCapturing"
        :recording-state="recordingState"
        @capture-pageinfo="capturePageInfo"
      />
    </div>

    <Toaster />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { sendMessage } from "webext-bridge/popup";
import ScreenshotSection from "./components/ScreenshotSection.vue";
import RecordingSection from "./components/RecordingSection.vue";
import RecordingOptions from "./components/RecordingOptions.vue";
import ToolsSection from "./components/ToolsSection.vue";
import { toast } from "vue-sonner";
import { Toaster } from "@/components/ui/sonner";
import { useRecordingState } from "@/composables";
import {
  ImageFormat,
  RecordingState,
  VideoFormat,
  VideoResolution,
} from "@/types/screenshot";
import { t } from "@/lib/i18n";
import { formatFileSize } from "@/lib/file";
import { JPEG_QUALITY } from "@/lib/constants/common";

const isCapturing = ref(false);
const isGettingPageInfo = ref(false);
const lastScreenshotResult = ref<{
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


async function captureViewport() {
  try {
    isCapturing.value = true;
    lastScreenshotResult.value = null;

    const response = await sendMessage(
      "capture:viewport",
      { format: ImageFormat.PNG, quality: JPEG_QUALITY },
      "background"
    );

    if (!response.success || response.error) {
      toast.error(t("error_screenshot_failed", response.error));
      return;
    }

    lastScreenshotResult.value = {
      fileName: response.fileName,
      width: response.width,
      height: response.height,
    };
  } catch (err) {
    toast.error(t("error_screenshot_failed", String(err)));
  } finally {
    isCapturing.value = false;
  }
}

async function captureFullPage() {
  try {
    isCapturing.value = true;
    lastScreenshotResult.value = null;

    const response = await sendMessage(
      "capture:fullPage",
      { format: ImageFormat.PNG, quality: JPEG_QUALITY },
      "background"
    );

    if (!response.success || response.error) {
      toast.error(t("error_screenshot_failed", response.error));
      return;
    }

    lastScreenshotResult.value = {
      fileName: response.fileName,
      width: response.width,
      height: response.height,
    };
  } catch (err) {
    toast.error(t("error_screenshot_failed", String(err)));
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
    toast.error(t("error_recording_failed", result.error));
  }
}

async function capturePageInfo() {
  try {
    isGettingPageInfo.value = true;

    const response = await sendMessage("pageinfo:capture", {}, "background");

    if (!response.success || response.error) {
      toast.error(t("error_pageinfo_failed", response.error));
    }
  } catch (err) {
    toast.error(t("error_pageinfo_failed", String(err)));
  } finally {
    isGettingPageInfo.value = false;
  }
}

// 监听截图成功，显示 toast
watch(
  lastScreenshotResult,
  (newResult) => {
    if (newResult) {
      toast.success(t("status_screenshot_success"), {
        description: `${newResult.fileName} (${newResult.width}×${newResult.height})`,
      });
    }
  },
  { immediate: false }
);

// 监听录制状态变化，显示 toast
watch(
  recordingState,
  (newState, oldState) => {
    // 录制开始
    if (
      newState === RecordingState.RECORDING &&
      oldState === RecordingState.IDLE
    ) {
      toast.info(t("status_recording_in_progress"));
    }
    // 录制处理中
    if (
      newState === RecordingState.PROCESSING &&
      oldState === RecordingState.RECORDING
    ) {
      toast.info(t("status_processing_recording"));
    }
  },
  { immediate: false }
);

// 监听录制结果，显示成功 toast
watch(
  lastRecordingResult,
  (newResult) => {
    if (newResult) {
      toast.success(t("status_recording_success"), {
        description: `${newResult.fileName} (${formatFileSize(newResult.size)})`,
      });
    }
  },
  { immediate: false }
);

// 组件挂载时加载录制选项
onMounted(() => {
  loadRecordingOptions();
});
</script>
