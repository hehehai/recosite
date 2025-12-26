import { VideoResolution } from "@/types/screenshot";

/**
 * 视频分辨率相关的常量
 */

/**
 * 分辨率对应的尺寸映射
 */
export const RESOLUTION_DIMENSIONS: Record<
  VideoResolution,
  { width: number; height: number } | null
> = {
  [VideoResolution.AUTO]: null, // 使用原始尺寸
  [VideoResolution.HD]: { width: 1280, height: 720 },
  [VideoResolution.FHD]: { width: 1920, height: 1080 },
  [VideoResolution.UHD]: { width: 3840, height: 2160 },
} as const;

/**
 * 获取分辨率对应的尺寸
 */
export function getResolutionDimensions(
  resolution: VideoResolution,
): { width: number; height: number } | null {
  return RESOLUTION_DIMENSIONS[resolution];
}
