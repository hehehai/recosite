<script setup lang="ts">
  import { computed } from "vue";

  interface Props {
    disabled?: boolean;
    active?: boolean;
    animate?: boolean;
    label: string;
    sublabel?: string;
  }

  const props = withDefaults(defineProps<Props>(), {
    disabled: false,
    active: false,
    animate: false,
  });

  defineEmits<{
    click: [];
  }>();

  const buttonClasses = computed(() => [
    "flex-1 rounded-lg shadow-sm transition-all hover:shadow-md disabled:opacity-50",
    "border-2 flex flex-col items-center justify-center gap-1.5 p-5",
    props.active
      ? "bg-red-50 dark:bg-red-900/20 border-red-500"
      : "bg-white dark:bg-gray-800 border-transparent hover:border-blue-500 active:border-green-500",
    props.animate ? "animate-pulse" : "",
  ]);

  const iconColor = computed(() =>
    props.active
      ? "text-red-600 dark:text-red-400"
      : "text-gray-600 dark:text-gray-400"
  );

  const labelColor = computed(() =>
    props.active
      ? "text-red-600 dark:text-red-400"
      : "text-gray-800 dark:text-gray-200"
  );
</script>

<template>
  <button
    type="button"
    :class="buttonClasses"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <div :class="['w-10 h-10', iconColor]">
      <slot name="icon"/>
    </div>
    <div v-if="active && sublabel" class="text-center">
      <div :class="['text-xs font-bold', labelColor]">{{ label }}</div>
      <div class="text-[10px] text-red-500 dark:text-red-500 mt-0.5">
        {{ sublabel }}
      </div>
    </div>
    <span v-else :class="['text-xs font-medium', labelColor]">
      {{ label }}
    </span>
  </button>
</template>
