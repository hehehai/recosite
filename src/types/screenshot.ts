import type { ExportSizeSettings } from "@/composables/useExportSize";

/**
 * 截图类型
 */
export const ScreenshotType = {
  VIEWPORT: "viewport", // 视窗截图
  FULL_PAGE: "full_page", // 长截图
  SELECTION: "selection", // 局部选择截图
} as const;

export type ScreenshotType =
  (typeof ScreenshotType)[keyof typeof ScreenshotType];

/**
 * 图片格式
 */
export const ImageFormat = {
  PNG: "png",
  JPEG: "jpeg",
} as const;

export type ImageFormat = (typeof ImageFormat)[keyof typeof ImageFormat];

/**
 * 视频格式
 */
export const VideoFormat = {
  WEBM: "webm",
  MP4: "mp4",
  MOV: "mov",
  GIF: "gif",
} as const;

export type VideoFormat = (typeof VideoFormat)[keyof typeof VideoFormat];

/**
 * 截图配置选项
 */
export interface ScreenshotOptions {
  type: ScreenshotType;
  format: ImageFormat;
  quality?: number; // JPEG 质量 0-100
  fileName?: string;
}

/**
 * 选区数据
 */
export interface SelectionArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 截图结果
 */
export interface ScreenshotResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * DOM 截图状态
 */
export const DomCaptureState = {
  IDLE: "idle",
  SELECTING: "selecting",
  SELECTED: "selected",
  CAPTURING: "capturing",
} as const;

export type DomCaptureState =
  (typeof DomCaptureState)[keyof typeof DomCaptureState];

/**
 * 消息类型
 */
export const MessageType = {
  START_SELECTION: "start_selection",
  CAPTURE_VIEWPORT: "capture_viewport",
  CAPTURE_FULL_PAGE: "capture_full_page",
  SELECTION_COMPLETE: "selection_complete",
  START_RECORDING: "start_recording",
  STOP_RECORDING: "stop_recording",
  GET_RECORDING_STATUS: "get_recording_status",
  RECORDING_COMPLETE: "recording_complete",
  START_DOM_SELECTION: "start_dom_selection",
  CANCEL_DOM_SELECTION: "cancel_dom_selection",
  CONFIRM_DOM_SELECTION: "confirm_dom_selection",
  CAPTURE_DOM: "capture_dom",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

/**
 * 录制类型
 */
export const RecordingType = {
  TAB: "tab", // 标签页录制
  WINDOW: "window", // 窗口录制
  DESKTOP: "desktop", // 桌面录制（暂未实现）
} as const;

export type RecordingType = (typeof RecordingType)[keyof typeof RecordingType];

/**
 * 录制状态
 */
export const RecordingState = {
  IDLE: "idle",
  RECORDING: "recording",
  PROCESSING: "processing",
} as const;

export type RecordingState =
  (typeof RecordingState)[keyof typeof RecordingState];

/**
 * 视频分辨率选项
 */
export const VideoResolution = {
  AUTO: "auto", // 自动（页面原始尺寸）
  HD: "720p", // 1280x720
  FHD: "1080p", // 1920x1080
  UHD: "4k", // 3840x2160
} as const;

export type VideoResolution =
  (typeof VideoResolution)[keyof typeof VideoResolution];

/**
 * 录制配置选项
 */
export interface RecordingOptions {
  type?: RecordingType; // 录制类型
  format: VideoFormat;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  sizeSettings?: ExportSizeSettings;
  resolution?: VideoResolution;
  microphone?: boolean;
  camera?: boolean;
}

/**
 * 消息数据
 */
export interface Message {
  type: MessageType;
  data?: unknown;
}
