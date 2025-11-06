<script setup lang="ts">
  import type { Notification } from "@/composables/useNotification";

  defineProps<{
    notification: Notification | null;
  }>();

  const emit = defineEmits<{
    close: [];
  }>();
</script>

<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="notification"
      class="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6"
      style="z-index: 9999"
    >
      <div class="flex w-full flex-col items-center space-y-4 sm:items-end">
        <div
          class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5"
          :class="{
            'bg-white dark:bg-gray-800': notification.type === 'info',
            'bg-green-50 dark:bg-green-900/30': notification.type === 'success',
            'bg-red-50 dark:bg-red-900/30': notification.type === 'error',
          }"
        >
          <div class="p-4">
            <div class="flex items-start">
              <div class="shrink-0">
                <svg
                  v-if="notification.type === 'success'"
                  class="size-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <svg
                  v-else-if="notification.type === 'error'"
                  class="size-6 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <svg
                  v-else
                  class="size-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div class="ml-3 w-0 flex-1 pt-0.5">
                <p
                  class="text-sm font-medium"
                  :class="{
                    'text-gray-900 dark:text-white': notification.type === 'info',
                    'text-green-800 dark:text-green-200': notification.type === 'success',
                    'text-red-800 dark:text-red-200': notification.type === 'error',
                  }"
                >
                  {{ notification.message }}
                </p>
              </div>
              <div class="ml-4 flex shrink-0">
                <button
                  type="button"
                  class="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                  :class="{
                    'text-gray-400 hover:text-gray-500 focus:ring-gray-500': notification.type === 'info',
                    'text-green-500 hover:text-green-600 focus:ring-green-500': notification.type === 'success',
                    'text-red-500 hover:text-red-600 focus:ring-red-500': notification.type === 'error',
                  }"
                  @click="emit('close')"
                >
                  <span class="sr-only">关闭</span>
                  <svg class="size-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fill-rule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clip-rule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
