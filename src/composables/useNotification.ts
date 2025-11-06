import { ref } from "vue";

export type NotificationType = "success" | "error" | "info";

export interface Notification {
  message: string;
  type: NotificationType;
}

export function useNotification() {
  const notification = ref<Notification | null>(null);

  function showNotification(
    message: string,
    type: NotificationType = "info",
    duration = 3000
  ) {
    notification.value = { message, type };
    setTimeout(() => {
      notification.value = null;
    }, duration);
  }

  function hideNotification() {
    notification.value = null;
  }

  return {
    notification,
    showNotification,
    hideNotification,
  };
}
