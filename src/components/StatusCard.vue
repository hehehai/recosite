<script setup lang="ts">
  import { computed } from "vue";

  interface Props {
    type: "info" | "success" | "error" | "warning";
    title?: string;
    message: string;
  }

  const props = defineProps<Props>();

  const cardClasses = computed(() => {
    const base = "mt-2.5 rounded-lg p-2.5";
    const variants = {
      info: "bg-blue-50 dark:bg-blue-900/30",
      success: "bg-green-50 dark:bg-green-900/30",
      error: "bg-red-50 dark:bg-red-900/30",
      warning: "bg-yellow-50 dark:bg-yellow-900/30",
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
</script>

<template>
  <div :class="cardClasses">
    <div :class="['text-xs', textClasses]">
      <div v-if="title" class="font-medium">{{ title }}</div>
      <div :class="{ 'mt-0.5': title }">{{ message }}</div>
    </div>
  </div>
</template>
