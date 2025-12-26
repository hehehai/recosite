<script setup lang="ts">
import { type Component, computed, onUnmounted, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

interface Props {
  action: "copy" | "download";
  variant?: "default" | "secondary" | "ghost" | "outline";
  size?: "default" | "sm" | "lg";
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  successResetDelay?: number;
  success?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "secondary",
  size: "sm",
  loading: false,
  disabled: false,
  successResetDelay: 2000,
  success: false,
});

const emit = defineEmits<{
  click: [];
}>();

// 内部成功状态
const isSuccess = ref(false);
let resetTimer: NodeJS.Timeout | null = null;

// 监听外部成功状态
watch(
  () => props.success,
  (newVal) => {
    if (newVal) {
      isSuccess.value = true;

      // 清除之前的定时器
      if (resetTimer) {
        clearTimeout(resetTimer);
      }

      // 设置新的重置定时器
      resetTimer = setTimeout(() => {
        isSuccess.value = false;
      }, props.successResetDelay);
    }
  },
);

// 清理定时器
onUnmounted(() => {
  if (resetTimer) {
    clearTimeout(resetTimer);
  }
});

// 计算图标
const icon = computed(() => {
  if (isSuccess.value) {
    return "i-hugeicons-checkmark-circle-01";
  }
  return props.action === "copy"
    ? "i-hugeicons-copy-01"
    : "i-hugeicons-download-01";
});

// 计算文本
const text = computed(() => {
  if (props.label) {
    return props.label;
  }

  if (isSuccess.value) {
    return t("pageinfo_copied");
  }

  return props.action === "copy" ? t("pageinfo_copy") : t("pageinfo_download");
});

const handleClick = () => {
  if (!props.disabled && !props.loading) {
    emit("click");
  }
};
</script>

<template>
  <Button :variant="variant" :size="size" :disabled="disabled || loading" @click="handleClick">
    <span :class="icon" />
    {{ text }}
  </Button>
</template>
