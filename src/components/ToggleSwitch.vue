<script setup lang="ts">
  import { computed } from "vue";

  interface Props {
    modelValue: boolean;
    label: string;
    disabled?: boolean;
  }

  const props = withDefaults(defineProps<Props>(), {
    disabled: false,
  });

  const emit = defineEmits<{
    "update:modelValue": [value: boolean];
  }>();

  function toggle() {
    if (!props.disabled) {
      emit("update:modelValue", !props.modelValue);
    }
  }

  const switchClasses = computed(() => [
    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
    props.modelValue ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600",
    props.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
  ]);

  const thumbClasses = computed(() => [
    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
    props.modelValue ? "translate-x-5" : "translate-x-0.5",
  ]);
</script>

<template>
  <div class="flex items-center justify-between">
    <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </span>
    <button
      type="button"
      :class="switchClasses"
      :disabled="disabled"
      @click="toggle"
    >
      <span :class="thumbClasses"/>
    </button>
  </div>
</template>
