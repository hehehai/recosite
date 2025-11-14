/**
 * Recording configuration utilities
 * Business logic for preparing recording options
 */

import {
  DISPLAY_SURFACE_TYPES,
  RECORDING_BITRATES,
  RECORDING_MIME_TYPES,
} from "@/constants/recording";
import {
  type RecordingOptions,
  RecordingType,
  VideoFormat,
} from "@/types/screenshot";

/**
 * Get display surface type based on recording type
 * Controls which panel is focused in the browser's share picker
 *
 * @param type - Recording type (TAB, WINDOW, DESKTOP)
 * @returns Display surface type or undefined for tab recording
 */
export function getDisplaySurface(
  type?: RecordingType
): "window" | "monitor" | undefined {
  if (type === RecordingType.WINDOW) {
    return DISPLAY_SURFACE_TYPES.WINDOW;
  }
  if (type === RecordingType.DESKTOP) {
    return DISPLAY_SURFACE_TYPES.MONITOR;
  }
  return; // Tab recording doesn't need displaySurface
}

/**
 * Get default video bitrate based on recording type
 * Business rule: Higher bitrate for window/desktop capture for better quality
 *
 * @param type - Recording type (TAB, WINDOW, DESKTOP)
 * @returns Video bitrate in bits per second
 */
export function getDefaultVideoBitrate(type?: RecordingType): number {
  // Window and desktop recording use higher bitrate for better quality
  if (type === RecordingType.WINDOW || type === RecordingType.DESKTOP) {
    return RECORDING_BITRATES.VIDEO_HIGH;
  }
  // Tab recording uses standard bitrate to balance quality and file size
  return RECORDING_BITRATES.VIDEO_STANDARD;
}

/**
 * Get MIME type for recording format
 * Attempts to use VP9+Opus codec, falls back to basic WebM if not supported
 *
 * @param format - Video format (WEBM or MP4)
 * @returns MIME type string
 */
export function getMimeType(format: VideoFormat): string {
  if (format === VideoFormat.MP4) {
    return RECORDING_MIME_TYPES.MP4;
  }

  // Try VP9+Opus codec for better quality
  if (
    typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported(RECORDING_MIME_TYPES.WEBM_VP9_OPUS)
  ) {
    return RECORDING_MIME_TYPES.WEBM_VP9_OPUS;
  }

  // Fallback to basic WebM
  return RECORDING_MIME_TYPES.WEBM;
}

/**
 * Prepare complete recording options with defaults
 * Applies business rules for bitrates, display surface, etc.
 *
 * @param data - Partial recording options from user input
 * @returns Complete recording options with all defaults applied
 */
export function prepareRecordingOptions(
  data: RecordingOptions
): RecordingOptions {
  const type = data.type || RecordingType.TAB;
  const format = data.format || VideoFormat.WEBM;

  return {
    type,
    format,
    videoBitsPerSecond: data.videoBitsPerSecond ?? getDefaultVideoBitrate(type),
    audioBitsPerSecond: data.audioBitsPerSecond ?? RECORDING_BITRATES.AUDIO,
    sizeSettings: data.sizeSettings,
    resolution: data.resolution,
    microphone: data.microphone,
    camera: data.camera,
    displaySurface: getDisplaySurface(type),
  };
}

/**
 * Get MediaRecorder options for recording
 *
 * @param format - Video format
 * @param videoBitrate - Video bitrate in bps
 * @param audioBitrate - Audio bitrate in bps
 * @returns MediaRecorder options object
 */
export function getMediaRecorderOptions(
  format: VideoFormat,
  videoBitrate: number,
  audioBitrate: number
): MediaRecorderOptions {
  return {
    mimeType: getMimeType(format),
    videoBitsPerSecond: videoBitrate,
    audioBitsPerSecond: audioBitrate,
  };
}
