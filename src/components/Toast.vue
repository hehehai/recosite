<script setup lang="ts">
  import { useToast } from "@/composables/useToast";

  const { toasts, remove } = useToast();

  const getToastClasses = (type: string) => {
    const baseClasses =
      "mb-2 flex min-w-[280px] items-center gap-3 rounded-lg p-4 shadow-lg transition-all duration-300";

    const typeClasses = {
      success: "bg-green-500 text-white dark:bg-green-600",
      error: "bg-red-500 text-white dark:bg-red-600",
      warning: "bg-yellow-500 text-white dark:bg-yellow-600",
      info: "bg-blue-500 text-white dark:bg-blue-600",
    };

    return `${baseClasses} ${typeClasses[type as keyof typeof typeClasses] || typeClasses.info}`;
  };

  const getIcon = (type: string) => {
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };
    return icons[type as keyof typeof icons] || icons.info;
  };
</script>

<template>
  <div
    class="pointer-events-none fixed right-4 top-4 z-9999 flex flex-col items-end"
  >
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :class="getToastClasses(toast.type)"
        class="pointer-events-auto"
      >
        <div
          class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg font-bold"
        >
          {{ getIcon(toast.type) }}
        </div>
        <div class="flex-1 text-sm font-medium">{{ toast.message }}</div>
        <button
          type="button"
          class="shrink-0 rounded p-1 transition hover:bg-white/20"
          @click="remove(toast.id)"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
  .toast-enter-active,
  .toast-leave-active {
    transition: all 0.3s ease;
  }

  .toast-enter-from {
    opacity: 0;
    transform: translateX(100%);
  }

  .toast-leave-to {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
  }

  .toast-move {
    transition: transform 0.3s ease;
  }
</style>
