/**
 * Recording state management utilities
 * Provides centralized functions for managing recording state
 */

import { browser } from "wxt/browser";
import { RecordingState, RecordingType } from "@/types/screenshot";
import { closeOffscreenDocument } from "@/lib/recording";

/**
 * Recording state manager interface
 * Defines the shape of the recording state
 */
export interface RecordingStateManager {
  state: RecordingState;
  recordingType: RecordingType;
  tabId: number | null;
  currentRecordingOptions: any | null;
}

/**
 * Reset recording state to initial values
 * Does not affect UI (icons, badges, etc.)
 */
export function resetRecordingState(manager: RecordingStateManager): void {
  manager.state = RecordingState.IDLE;
  manager.recordingType = RecordingType.TAB;
  manager.tabId = null;
  manager.currentRecordingOptions = null;
}

/**
 * Reset recording state and update UI
 * Clears badge, resets icon, and closes offscreen document
 */
export async function resetRecordingUI(manager: RecordingStateManager): Promise<void> {
  // Reset state
  resetRecordingState(manager);

  // Update UI
  await updateRecordingIcon(false);
  await clearRecordingBadge();

  // Cleanup resources
  await closeOffscreenDocument().catch((error) => {
    console.warn("[RecordingState] Failed to close offscreen document:", error);
  });
}

/**
 * Update recording icon to show/hide recording indicator
 */
export async function updateRecordingIcon(isRecording: boolean): Promise<void> {
  try {
    const iconPath = isRecording
      ? {
          16: "/icon/16-recording.png",
          32: "/icon/32-recording.png",
          48: "/icon/48-recording.png",
          128: "/icon/128-recording.png",
        }
      : {
          16: "/icon/16.png",
          32: "/icon/32.png",
          48: "/icon/48.png",
          128: "/icon/128.png",
        };

    await browser.action.setIcon({ path: iconPath });
    console.log(`[RecordingState] Icon updated to ${isRecording ? "recording" : "idle"} state`);
  } catch (error) {
    console.error("[RecordingState] Failed to update icon:", error);
  }
}

/**
 * Clear recording badge
 */
async function clearRecordingBadge(): Promise<void> {
  try {
    await browser.action.setBadgeText({ text: "" });
    console.log("[RecordingState] Badge cleared");
  } catch (error) {
    console.error("[RecordingState] Failed to clear badge:", error);
  }
}

/**
 * Set recording badge with text and color
 */
export async function setRecordingBadge(
  text: string,
  backgroundColor: string,
  textColor = "#FFFFFF",
): Promise<void> {
  try {
    await browser.action.setBadgeText({ text });
    await browser.action.setBadgeBackgroundColor({ color: backgroundColor });
    await browser.action.setBadgeTextColor({ color: textColor });
    console.log(`[RecordingState] Badge set: ${text}`);
  } catch (error) {
    console.error("[RecordingState] Failed to set badge:", error);
  }
}
