/**
 * 导出尺寸相关的常量
 */

// 预设缩放比例
export const PRESET_SCALES = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3] as const;

// 尺寸限制
export const SIZE_LIMITS = {
  MIN_WIDTH: 100,
  MAX_WIDTH: 10_000,
  MIN_HEIGHT: 100,
  MAX_HEIGHT: 10_000,
} as const;

// 默认值
export const DEFAULT_VALUES = {
  SCALE: 1,
  SHOW_ORIGINAL: false,
} as const;
