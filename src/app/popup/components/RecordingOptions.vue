<script setup lang="ts">
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VideoResolution } from "@/types/screenshot";
import { t } from "@/lib/i18n";

const props = defineProps<{
  modelValue: VideoResolution;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: VideoResolution];
}>();

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

function handleUpdate(value: unknown) {
  if (value !== null && typeof value === "string" && Object.values(VideoResolution).includes(value as VideoResolution)) {
    emit("update:modelValue", value as VideoResolution);
  }
}
</script>

<template>
  <Select :model-value="props.modelValue" @update:model-value="handleUpdate">
    <SelectTrigger size="sm" class="w-20">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem v-for="option in resolutionOptions" :key="option.value" :value="option.value">
        {{ option.label }}
      </SelectItem>
    </SelectContent>
  </Select>
</template>
<<<<<<< Updated upstream ======= >>>>>>> Stashed changes
