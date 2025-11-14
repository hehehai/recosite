/**
 * Recording-related constants
 * Centralized configuration for recording functionality
 */

/**
 * Default bitrates for recording
 * Higher bitrate for window/desktop capture for better quality
 * Standard bitrate for tab capture to balance quality and file size
 */
export const RECORDING_BITRATES = {
  VIDEO_HIGH: 8_000_000, // 8 Mbps - for window/desktop capture
  VIDEO_STANDARD: 2_500_000, // 2.5 Mbps - for tab capture
  AUDIO: 128_000, // 128 kbps - for all audio
} as const;

/**
 * Timing constants for recording operations
 */
export const RECORDING_TIMING = {
  DATA_COLLECTION_INTERVAL: 1000, // Collect recording chunks every 1 second
  OFFSCREEN_LOAD_DELAY: 100, // Wait time for offscreen document initialization
} as const;

/**
 * Badge configuration for recording state indicators
 */
export const RECORDING_BADGE = {
  TEXT: {
    RECORDING: "REC",
    DOM_SELECTION: "DOM",
  },
  COLORS: {
    RECORDING_BG: "#FF0000",
    DOM_BG: "#3b82f6",
    TEXT: "#FFFFFF",
  },
} as const;

/**
 * Supported MIME types for recording
 */
export const RECORDING_MIME_TYPES = {
  WEBM_VP9_OPUS: "video/webm;codecs=vp9,opus",
  WEBM: "video/webm",
  MP4: "video/mp4",
} as const;

/**
 * Message types for recording operations
 * Used for communication between different contexts
 */
export const RECORDING_MESSAGES = {
  // Public API messages (popup <-> background)
  START_REQUEST: "recording:start-request",
  STOP_REQUEST: "recording:stop-request",
  GET_STATUS: "recording:get-status",
  TRACK_ENDED: "recording:track-ended",

  // Internal messages (background <-> offscreen)
  START_INTERNAL: "recording:start-internal",
  STOP_INTERNAL: "recording:stop-internal",
  START_WINDOW_CAPTURE: "recording:start-window-capture",
  STATUS_INTERNAL: "recording:status-internal",
} as const;

/**
 * Display surface types for getDisplayMedia
 * Controls which panel is focused in the browser's share picker
 */
export const DISPLAY_SURFACE_TYPES = {
  BROWSER: "browser" as const, // Browser tabs
  WINDOW: "window" as const, // Application windows
  MONITOR: "monitor" as const, // Entire screens/monitors
};
