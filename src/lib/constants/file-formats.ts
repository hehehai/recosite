import type { ImageFormat, VideoFormat } from "@/types/screenshot";

/**
 * 文件格式相关的常量
 */

/**
 * 图片导出格式列表
 */
export const IMAGE_EXPORT_FORMATS: ImageFormat[] = ["png", "jpeg"];

/**
 * 视频导出格式列表
 */
export const VIDEO_EXPORT_FORMATS: VideoFormat[] = ["webm", "mp4", "mov", "gif"];
