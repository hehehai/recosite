<script setup lang="ts">
import RecordingButton from "@/components/RecordingButton.vue";
import { RecordingState } from "@/types/screenshot";
import { t } from "@/lib/i18n";

defineProps<{
  isGettingPageInfo: boolean;
  isCapturing: boolean;
  recordingState: RecordingState;
}>();

defineEmits<{
  "capture-pageinfo": [];
}>();
</script>

<template>
  <div>
    <div class="mb-2 text-xs font-medium text-muted-foreground">
      {{ t("section_tools") }}
    </div>
    <div class="grid grid-cols-2 gap-2.5">
      <!-- 页面信息 -->
      <RecordingButton
        :label="t('action_pageinfo')"
        :disabled="
          isGettingPageInfo ||
          isCapturing ||
          recordingState === RecordingState.RECORDING
        "
        @click="$emit('capture-pageinfo')"
      >
        <template #icon>
          <span class="i-hugeicons-file-search text-3xl" />
        </template>
      </RecordingButton>
    </div>
  </div>
</template>
<<<<<<< Updated upstream ======= >>>>>>> Stashed changes
