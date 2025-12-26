import { browser } from "wxt/browser";
import type { ImageFormat } from "@/types/screenshot";
import { t } from "./i18n";
import {
  DEFAULT_MIME_TYPES,
  FILE_NAME_PREFIXES,
  JPEG_QUALITY,
  MIME_TYPE_PATTERN,
  TIMESTAMP_REPLACE_PATTERN,
} from "./constants/common";

/**
 * 将 dataURL 转换为 Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(MIME_TYPE_PATTERN)?.[1] || DEFAULT_MIME_TYPES.IMAGE_PNG;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n > 0) {
    n -= 1;
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * 下载文件（用于 background service worker）
 */
export async function downloadFile(dataUrl: string, fileName: string): Promise<void> {
  await browser.downloads.download({
    url: dataUrl,
    filename: fileName,
    saveAs: false,
  });
}

/**
 * 生成文件名
 */
export function generateFileName(format: ImageFormat): string {
  const date = new Date();
  const timestamp = date.toISOString().replace(TIMESTAMP_REPLACE_PATTERN, "-").slice(0, -5);
  return `${FILE_NAME_PREFIXES.SCREENSHOT}${timestamp}.${format}`;
}

/**
 * 将 canvas 转换为 blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas to Blob conversion failed"));
        }
      },
      `image/${format}`,
      quality,
    );
  });
}

/**
 * 格式化文件大小
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} ${t("size_unit_bytes")}`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} ${t("size_unit_kilobytes")}`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} ${t("size_unit_megabytes")}`;
}

/**
 * 格式化视频时长
 * @param seconds - 视频时长（秒）
 * @returns 格式化后的时长字符串（如 "1:23" 或 "1:02:34"）
 */
export function formatVideoDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
