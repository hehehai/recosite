import { browser } from "wxt/browser";
import {
  ImageFormat,
  type ScreenshotOptions,
  type ScreenshotResult,
  ScreenshotType,
  type SelectionArea,
} from "@/types/screenshot";
import { dataURLToBlob } from "./file";

/**
 * 从 dataURL 获取图片尺寸
 * 在 service worker 中通过注入脚本获取
 */
async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  // 获取当前标签页
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  // 在页面中执行获取尺寸的代码
  const result = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: (url: string) =>
      new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = url;
      }),
    args: [dataUrl],
  });

  return result[0]?.result || { width: 0, height: 0 };
}

/**
 * 捕获当前视窗
 */
export async function captureViewport(
  format: ImageFormat = ImageFormat.PNG,
  quality = 0.92
): Promise<ScreenshotResult> {
  // 使用 chrome.tabs API 捕获当前标签页
  const dataUrl = await browser.tabs.captureVisibleTab({
    format: format === ImageFormat.PNG ? "png" : "jpeg",
    quality:
      format === ImageFormat.JPEG ? Math.round(quality * 100) : undefined,
  });

  const blob = dataURLToBlob(dataUrl);

  // 从 dataURL 获取图片尺寸（不使用 Image 对象）
  const { width, height } = await getImageDimensions(dataUrl);

  return {
    dataUrl,
    blob,
    width,
    height,
  };
}

/**
 * 捕获选区（需要先在 content script 中获取选区信息）
 */
export async function captureSelection(
  area: SelectionArea,
  format: ImageFormat = ImageFormat.PNG,
  quality = 0.92
): Promise<ScreenshotResult> {
  // 先捕获整个视窗
  const dataUrl = await browser.tabs.captureVisibleTab({
    format: format === ImageFormat.PNG ? "png" : "jpeg",
    quality:
      format === ImageFormat.JPEG ? Math.round(quality * 100) : undefined,
  });

  // 获取当前标签页
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  // 在页面中执行裁剪
  const result = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: (
      imageDataUrl: string,
      cropArea: SelectionArea,
      imageFormat: ImageFormat,
      imageQuality: number
    ) => {
      return new Promise<{ dataUrl: string; width: number; height: number }>(
        (resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            // 创建 canvas
            const canvas = document.createElement("canvas");
            canvas.width = cropArea.width;
            canvas.height = cropArea.height;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("Failed to get 2d context"));
              return;
            }

            // 裁剪并绘制
            ctx.drawImage(
              img,
              cropArea.x,
              cropArea.y,
              cropArea.width,
              cropArea.height,
              0,
              0,
              cropArea.width,
              cropArea.height
            );

            // 转换为 dataURL
            const croppedDataUrl = canvas.toDataURL(
              `image/${imageFormat}`,
              imageFormat === "jpeg" ? imageQuality : undefined
            );

            resolve({
              dataUrl: croppedDataUrl,
              width: cropArea.width,
              height: cropArea.height,
            });
          };
          img.onerror = reject;
          img.src = imageDataUrl;
        }
      );
    },
    args: [dataUrl, area, format, quality],
  });

  if (!result[0]?.result) {
    throw new Error("Failed to crop image");
  }

  const croppedDataUrl = result[0].result.dataUrl;
  const blob = dataURLToBlob(croppedDataUrl);

  return {
    dataUrl: croppedDataUrl,
    blob,
    width: area.width,
    height: area.height,
  };
}

/**
 * 加载并拼接多张图片
 */
async function mergeImages(
  dataUrls: string[],
  imageFormat: ImageFormat,
  imageQuality: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  // 先加载第一张图片获取实际宽度
  const firstImg = await new Promise<HTMLImageElement>(
    (resolveImg, rejectImg) => {
      const image = new Image();
      image.onload = () => resolveImg(image);
      image.onerror = rejectImg;
      image.src = dataUrls[0];
    }
  );

  // 计算总高度并加载所有图片
  let totalHeight = firstImg.naturalHeight;
  const images = [firstImg];

  // 加载剩余图片
  for (let i = 1; i < dataUrls.length; i += 1) {
    const img = await new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
      const image = new Image();
      image.onload = () => resolveImg(image);
      image.onerror = rejectImg;
      image.src = dataUrls[i];
    });
    totalHeight += img.naturalHeight;
    images.push(img);
  }

  // 创建 canvas（使用实际图片尺寸）
  const canvas = document.createElement("canvas");
  canvas.width = firstImg.naturalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  // 拼接图片
  let offsetY = 0;
  for (const img of images) {
    ctx.drawImage(img, 0, offsetY);
    offsetY += img.naturalHeight;
  }

  // 转换为 dataURL
  const mergedDataUrl = canvas.toDataURL(
    `image/${imageFormat}`,
    imageFormat === "jpeg" ? imageQuality : undefined
  );

  return {
    dataUrl: mergedDataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * 捕获整个页面（长截图）
 * 通过滚动页面并拼接多张截图实现
 */
export async function captureFullPage(
  format: ImageFormat = ImageFormat.PNG,
  quality = 0.92
): Promise<ScreenshotResult> {
  // 获取当前标签页
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  // 1. 获取页面信息并隐藏滚动条
  const pageInfo = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const height = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      const viewport = window.innerHeight;
      const scrollTop = window.scrollY;

      // 隐藏滚动条
      const overflow = document.documentElement.style.overflow;
      const bodyOverflow = document.body.style.overflow;
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";

      return {
        pageHeight: height,
        viewportHeight: viewport,
        originalScrollTop: scrollTop,
        originalOverflow: overflow,
        originalBodyOverflow: bodyOverflow,
        screenshotCount: Math.ceil(height / viewport),
      };
    },
  });

  if (!pageInfo[0]?.result) {
    throw new Error("Failed to get page info");
  }

  const {
    viewportHeight,
    originalScrollTop,
    originalOverflow,
    originalBodyOverflow,
    screenshotCount,
  } = pageInfo[0].result;

  // 2. 逐屏滚动并截图
  const screenshots: string[] = [];

  for (let i = 0; i < screenshotCount; i += 1) {
    // 滚动到指定位置
    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (scrollTop: number) => {
        window.scrollTo(0, scrollTop);
      },
      args: [i * viewportHeight],
    });

    // 等待渲染
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 截图
    const dataUrl = await browser.tabs.captureVisibleTab({
      format: format === ImageFormat.PNG ? "png" : "jpeg",
      quality:
        format === ImageFormat.JPEG ? Math.round(quality * 100) : undefined,
    });

    screenshots.push(dataUrl);
  }

  // 3. 恢复滚动位置和滚动条显示
  await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: (scrollTop: number, overflow: string, bodyOverflow: string) => {
      window.scrollTo(0, scrollTop);
      document.documentElement.style.overflow = overflow;
      document.body.style.overflow = bodyOverflow;
    },
    args: [originalScrollTop, originalOverflow, originalBodyOverflow],
  });

  // 4. 在页面中拼接所有截图
  const mergeResult = await browser.scripting.executeScript({
    target: { tabId: tab.id },
    func: mergeImages,
    args: [screenshots, format, quality],
  });

  if (!mergeResult[0]?.result) {
    throw new Error("Failed to merge screenshots");
  }

  const {
    dataUrl: finalDataUrl,
    width,
    height: resultHeight,
  } = mergeResult[0].result;
  const blob = dataURLToBlob(finalDataUrl);

  return {
    dataUrl: finalDataUrl,
    blob,
    width,
    height: resultHeight,
  };
}

/**
 * 便捷函数：根据选项执行截图
 */
export async function captureScreenshot(
  options: ScreenshotOptions
): Promise<ScreenshotResult> {
  const { type, format, quality } = options;

  switch (type) {
    case ScreenshotType.VIEWPORT:
      return captureViewport(format, quality);

    case ScreenshotType.FULL_PAGE:
      return captureFullPage(format, quality);

    case ScreenshotType.SELECTION:
      throw new Error(
        "Selection capture requires area parameter. Use captureSelection directly."
      );

    default:
      throw new Error(`Unknown screenshot type: ${type}`);
  }
}
