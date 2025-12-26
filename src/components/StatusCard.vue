<script setup lang="ts">
import { computed, ref } from "vue";

interface Props {
  type: "info" | "success" | "error" | "warning";
  title?: string;
  message: string;
  closable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
});

const emit = defineEmits<{
  close: [];
}>();

const isCollapsed = ref(false);

const cardClasses = computed(() => {
  if (isCollapsed.value) {
    return "";
  }
  const base =
    "fixed bottom-14 left-3 right-3 rounded-lg p-2.5 shadow-lg border z-50 transition-all";
  const variants = {
    info: "bg-primary/10 border-primary/30",
    success: "bg-success/10 border-success/30",
    error: "bg-destructive/10 border-destructive/30",
    warning: "bg-warning/10 border-warning/30",
  };
  return `${base} ${variants[props.type]}`;
});

const collapsedButtonClasses = computed(() => {
  const base =
    "fixed bottom-14 left-3 size-[38px] rounded-full shadow-lg border-2 z-50 flex items-center justify-center transition-all hover:scale-110";
  const variants = {
    info: "bg-primary border-primary/50 text-primary-foreground",
    success: "bg-success border-success/50 text-white",
    error: "bg-destructive border-destructive/50 text-white",
    warning: "bg-warning border-warning/50 text-white",
  };
  return `${base} ${variants[props.type]}`;
});

const textClasses = computed(() => {
  const variants = {
    info: "text-primary",
    success: "text-success",
    error: "text-destructive",
    warning: "text-warning",
  };
  return variants[props.type];
});

const iconClasses = computed(() => {
  const variants = {
    info: "i-hugeicons-information-circle",
    success: "i-hugeicons-tick-02",
    error: "i-hugeicons-alert-circle",
    warning: "i-hugeicons-alert-01",
  };
  return variants[props.type];
});

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value;
}
</script>

<template>
  <!-- 折叠后的小按钮 -->
  <button v-if="isCollapsed" type="button" :class="collapsedButtonClasses" @click="toggleCollapse">
    <span :class="[iconClasses, 'text-lg']" />
  </button>

  <!-- 展开的卡片 -->
  <div v-else :class="cardClasses">
    <div class="flex items-start gap-2">
      <!-- 图标 -->
      <span :class="[iconClasses, 'text-base shrink-0', textClasses]" />

      <!-- 内容 -->
      <div :class="['text-xs flex-1 leading-tight', textClasses]">
        <div v-if="title" class="font-medium">{{ title }}</div>
        <div :class="{ 'mt-0.5': title }">{{ message }}</div>
      </div>

      <!-- 折叠按钮 -->
      <button
        type="button"
        :class="[
          'shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors size-4 flex items-center justify-center',
          textClasses,
        ]"
        @click="toggleCollapse"
      >
        <span class="i-hugeicons-arrow-left-01 text-base" />
      </button>

      <!-- 关闭按钮 -->
      <button
        v-if="closable"
        type="button"
        :class="[
          'shrink-0 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors size-4 flex items-center justify-center',
          textClasses,
        ]"
        @click="emit('close')"
      >
        <span class="i-hugeicons-cancel-01 text-base" />
      </button>
    </div>
  </div>
</template>
