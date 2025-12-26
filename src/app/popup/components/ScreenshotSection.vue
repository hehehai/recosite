<script setup lang="ts">
import RecordingButton from "@/components/RecordingButton.vue";
import { RecordingState } from "@/types/screenshot";
import { t } from "@/lib/i18n";

defineProps<{
  isCapturing: boolean;
  recordingState: RecordingState;
}>();

defineEmits<{
  "capture-fullpage": [];
  "capture-viewport": [];
}>();
</script>

<template>
  <div>
    <div class="mb-2 text-sm font-medium text-muted-foreground">
      {{ t("section_screenshot") }}
    </div>
    <div class="grid grid-cols-2 gap-2.5">
      <!-- 全页截图 -->
      <RecordingButton
        :label="t('action_fullpage_screenshot')"
        :disabled="isCapturing || recordingState === RecordingState.RECORDING"
        @click="$emit('capture-fullpage')"
      >
        <template #icon>
          <span class="i-hugeicons-border-full text-3xl" />
        </template>
      </RecordingButton>

      <!-- 视窗截图 -->
      <RecordingButton
        :label="t('action_viewport_screenshot')"
        :disabled="isCapturing || recordingState === RecordingState.RECORDING"
        @click="$emit('capture-viewport')"
      >
        <template #icon>
          <span class="i-hugeicons-cursor-in-window text-3xl" />
        </template>
      </RecordingButton>
    </div>
  </div>
</template>
<<<<<<< Updated upstream ======= >>>>>>> Stashed changes
