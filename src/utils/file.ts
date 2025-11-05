import { browser } from "wxt/browser";
import type { ImageFormat } from "@/types/screenshot";

// Regex pattern for extracting MIME type from data URL
const MIME_TYPE_PATTERN = /:(.*?);/;

/**
 * 将 dataURL 转换为 Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(MIME_TYPE_PATTERN)?.[1] || "image/png";
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
export async function downloadFile(
  dataUrl: string,
  fileName: string
): Promise<void> {
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
  const timestamp = date.toISOString().replace(/[:.]/g, "-").slice(0, -5);
  return `screenshot-${timestamp}.${format}`;
}

/**
 * 将 canvas 转换为 blob
 */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality = 0.92
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
      quality
    );
  });
}
