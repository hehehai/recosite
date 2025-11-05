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
 * 消息类型
 */
export const MessageType = {
  START_SELECTION: "start_selection",
  CAPTURE_VIEWPORT: "capture_viewport",
  CAPTURE_FULL_PAGE: "capture_full_page",
  SELECTION_COMPLETE: "selection_complete",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

/**
 * 消息数据
 */
export interface Message {
  type: MessageType;
  data?: unknown;
}
