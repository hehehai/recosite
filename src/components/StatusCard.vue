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
      info: "bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800",
      success:
        "bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800",
      error: "bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800",
      warning:
        "bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800",
    };
    return `${base} ${variants[props.type]}`;
  });

  const collapsedButtonClasses = computed(() => {
    const base =
      "fixed bottom-14 left-3 size-[38px] rounded-full shadow-lg border-2 z-50 flex items-center justify-center transition-all hover:scale-110";
    const variants = {
      info: "bg-blue-500 dark:bg-blue-600 border-blue-300 dark:border-blue-700 text-white",
      success:
        "bg-green-500 dark:bg-green-600 border-green-300 dark:border-green-700 text-white",
      error:
        "bg-red-500 dark:bg-red-600 border-red-300 dark:border-red-700 text-white",
      warning:
        "bg-yellow-500 dark:bg-yellow-600 border-yellow-300 dark:border-yellow-700 text-white",
    };
    return `${base} ${variants[props.type]}`;
  });

  const textClasses = computed(() => {
    const variants = {
      info: "text-blue-700 dark:text-blue-300",
      success: "text-green-700 dark:text-green-300",
      error: "text-red-700 dark:text-red-300",
      warning: "text-yellow-700 dark:text-yellow-300",
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
  <button
    v-if="isCollapsed"
    type="button"
    :class="collapsedButtonClasses"
    @click="toggleCollapse"
  >
    <span :class="[iconClasses, 'text-lg']"/>
  </button>

  <!-- 展开的卡片 -->
  <div v-else :class="cardClasses">
    <div class="flex items-start gap-2">
      <!-- 图标 -->
      <span :class="[iconClasses, 'text-base shrink-0', textClasses]"/>

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
        <span class="i-hugeicons-arrow-left-01 text-base"/>
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
        <span class="i-hugeicons-cancel-01 text-base"/>
      </button>
    </div>
  </div>
</template>
