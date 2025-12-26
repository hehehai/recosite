<script setup lang="ts">
import RecordingButton from "@/components/RecordingButton.vue";
import { RecordingState, RecordingType } from "@/types/screenshot";
import { t } from "@/lib/i18n";
import { Component } from "vue";

defineProps<{
  recordingState: RecordingState;
  recordingType: RecordingType;
  isCapturing: boolean;
  headerExtra?: Component;
}>();

defineEmits<{
  "toggle-recording": [type: "tab" | "window"];
}>();
</script>

<template>
  <div>
    <header class="flex items-center justify-between mb-2 ">
      <div class="text-sm font-medium text-muted-foreground">
        {{ t("section_recording") }}
      </div>
      <slot name="header-extra" />
    </header>
    <div class="grid grid-cols-2 gap-2.5">
      <!-- 页面录制 -->
      <RecordingButton
        :label="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'tab'
            ? t('status_recording')
            : t('action_tab_recording')
        "
        :sublabel="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'tab'
            ? t('status_click_to_stop')
            : undefined
        "
        :active="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'tab'
        "
        :animate="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'tab'
        "
        :disabled="
          recordingState === RecordingState.PROCESSING ||
          isCapturing ||
          (recordingState === RecordingState.RECORDING &&
            recordingType !== 'tab')
        "
        @click="$emit('toggle-recording', 'tab')"
      >
        <template #icon>
          <span
            :class="[
              'text-3xl',
              {
                'i-hugeicons-file-video':
                  recordingState === RecordingState.IDLE ||
                  recordingType !== 'tab',
                'i-hugeicons-stop-circle':
                  recordingState === RecordingState.RECORDING &&
                  recordingType === 'tab',
              },
            ]"
          />
        </template>
      </RecordingButton>

      <!-- 窗口录制 -->
      <RecordingButton
        :label="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'window'
            ? t('status_recording')
            : t('action_window_recording')
        "
        :sublabel="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'window'
            ? t('status_click_to_stop')
            : undefined
        "
        :active="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'window'
        "
        :animate="
          recordingState === RecordingState.RECORDING &&
          recordingType === 'window'
        "
        :disabled="
          recordingState === RecordingState.PROCESSING ||
          isCapturing ||
          (recordingState === RecordingState.RECORDING &&
            recordingType !== 'window')
        "
        @click="$emit('toggle-recording', 'window')"
      >
        <template #icon>
          <span
            :class="[
              'text-3xl',
              {
                'i-hugeicons-video-ai':
                  recordingState === RecordingState.IDLE ||
                  recordingType !== 'window',
                'i-hugeicons-stop-circle':
                  recordingState === RecordingState.RECORDING &&
                  recordingType === 'window',
              },
            ]"
          />
        </template>
      </RecordingButton>
    </div>
  </div>
</template>
<<<<<<< Updated upstream ======= >>>>>>> Stashed changes
