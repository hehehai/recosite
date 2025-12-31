/**
 * 截图相关常量
 */

/**
 * 超长页面阈值 (px)
 * 超过此高度将启用流式截图模式
 */
export const LONG_PAGE_THRESHOLD = 20_000;

/**
 * 单个 Canvas 最大高度 (px)
 * 浏览器 Canvas 限制约为 32,767px，使用较保守的值确保兼容性
 */
export const MAX_CANVAS_HEIGHT = 16_000;

/**
 * 截图分片存储的最大数量
 * 超过此数量将警告用户
 */
export const MAX_SCREENSHOT_CHUNKS = 200;
