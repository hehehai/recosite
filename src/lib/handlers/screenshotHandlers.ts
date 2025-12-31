import { ImageFormat } from "@/types/screenshot";
import { JPEG_QUALITY } from "@/lib/constants/common";
import { captureFullPage, captureViewport } from "@/lib/screenshot";
import { dataURLToBlob, generateFileName } from "@/lib/file";
import { openResultPage } from "@/lib/resultPage";

// Storage quota threshold in bytes (~5MB)
// If image data URL is larger than this, convert to Blob for IndexedDB storage
const STORAGE_QUOTA_THRESHOLD = 5 * 1024 * 1024;

/**
 * 处理视窗截图
 */
export async function handleCaptureViewport(data: {
  format: ImageFormat;
  quality?: number;
}): Promise<{
  success: boolean;
  fileName: string;
  width: number;
  height: number;
  error?: string;
}> {
  try {
    const format = data.format || ImageFormat.PNG;
    const quality = data.quality || JPEG_QUALITY;

    const result = await captureViewport(format, quality);
    const fileName = generateFileName(format);

    // Convert to Blob if data URL is too large
    const dataUrlSize = result.dataUrl.length;
    let imageData: Blob | string = result.dataUrl;
    let imageSize = result.blob?.size || 0;

    if (dataUrlSize > STORAGE_QUOTA_THRESHOLD) {
      console.log(
        `[ScreenshotHandler] Image size ${dataUrlSize} exceeds threshold, using IndexedDB`,
      );
      imageData = dataURLToBlob(result.dataUrl);
      imageSize = imageData.size;
    }

    // 打开结果页面显示截图
    await openResultPage(imageData, fileName, result.width, result.height, imageSize);

    return {
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    return {
      success: false,
      fileName: "",
      width: 0,
      height: 0,
      error: String(error),
    };
  }
}

/**
 * 处理长截图
 */
export async function handleCaptureFullPage(data: {
  format: ImageFormat;
  quality?: number;
}): Promise<{
  success: boolean;
  fileName: string;
  width: number;
  height: number;
  error?: string;
}> {
  try {
    const format = data.format || ImageFormat.PNG;
    const quality = data.quality || JPEG_QUALITY;

    console.log("[ScreenshotHandler] Starting full page capture...");
    const result = await captureFullPage(format, quality);
    console.log("[ScreenshotHandler] Full page capture complete, opening result page...");

    const fileName = generateFileName(format);

    // Convert to Blob if data URL is too large (full page screenshots are often large)
    const dataUrlSize = result.dataUrl.length;
    let imageData: Blob | string = result.dataUrl;
    let imageSize = result.blob?.size || 0;

    if (dataUrlSize > STORAGE_QUOTA_THRESHOLD) {
      console.log(
        `[ScreenshotHandler] Image size ${dataUrlSize} exceeds threshold, using IndexedDB`,
      );
      imageData = dataURLToBlob(result.dataUrl);
      imageSize = imageData.size;
    }

    // 打开结果页面显示截图
    await openResultPage(imageData, fileName, result.width, result.height, imageSize);
    console.log("[ScreenshotHandler] Result page opened");

    return {
      success: true,
      fileName,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error("[ScreenshotHandler] Full page capture failed:", error);
    return {
      success: false,
      fileName: "",
      width: 0,
      height: 0,
      error: String(error),
    };
  }
}
