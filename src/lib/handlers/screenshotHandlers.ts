import { ImageFormat } from "@/types/screenshot";
import { JPEG_QUALITY } from "@/lib/constants/common";
import { captureFullPage, captureViewport } from "@/lib/screenshot";
import { generateFileName } from "@/lib/file";
import { openResultPage } from "@/lib/resultPage";

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

    // 打开结果页面显示截图
    await openResultPage(result.dataUrl, fileName, result.width, result.height);

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

    // 打开结果页面显示截图
    await openResultPage(result.dataUrl, fileName, result.width, result.height);
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
