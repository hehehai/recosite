/**
 * 通用常量
 */

/**
 * 文件扩展名正则表达式
 * 匹配文件扩展名（如 .png, .jpg, .mp4）
 */
export const FILE_EXTENSION_REGEX = /\.[^.]+$/;

/**
 * MIME 类型提取正则表达式
 * 从 data URL 中提取 MIME 类型（如 "image/png"）
 */
export const MIME_TYPE_PATTERN = /:(.*?);/;

/**
 * JPEG 图片质量（0-1）
 */
export const JPEG_QUALITY = 0.92;

/**
 * 默认 MIME 类型
 */
export const DEFAULT_MIME_TYPES = {
  IMAGE_PNG: "image/png",
  VIDEO_WEBM: "video/webm",
} as const;

/**
 * 文件名前缀
 */
export const FILE_NAME_PREFIXES = {
  SCREENSHOT: "screenshot-",
  RECORDING: "recording_",
} as const;

/**
 * 时间戳格式化正则表达式
 * 用于替换 ISO 字符串中的特殊字符
 */
export const TIMESTAMP_REPLACE_PATTERN = /[:.]/g;
