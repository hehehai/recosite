import { createCanvas, loadImage } from "./canvas";

/**
 * ICO 图像条目信息
 */
interface IcoImageEntry {
  width: number;
  height: number;
  offset: number;
  size: number;
}

/**
 * 检测 URL 是否为 ICO 格式
 */
export function isIcoUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();

  // 检查文件扩展名
  if (lowerUrl.endsWith(".ico")) {
    return true;
  }

  // 检查 data URL
  if (
    lowerUrl.startsWith("data:image/x-icon") ||
    lowerUrl.startsWith("data:image/vnd.microsoft.icon")
  ) {
    return true;
  }

  return false;
}

/**
 * 将 BMP 数据转换为 PNG Blob
 * 使用 Canvas API 进行转换
 */
async function convertBmpToPng(bmpData: ArrayBuffer, width: number, height: number): Promise<Blob> {
  // 创建临时 Blob URL
  const blob = new Blob([bmpData], { type: "image/bmp" });
  const bmpUrl = URL.createObjectURL(blob);

  try {
    // 加载为图像
    const img = await loadImage(bmpUrl);

    // 创建 Canvas 并绘制
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    ctx.drawImage(img, 0, 0, width, height);

    // 转换为 PNG Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob);
        } else {
          reject(new Error("Failed to convert canvas to blob"));
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(bmpUrl);
  }
}

/**
 * 从 ICO 文件中提取最大尺寸的 PNG 图像
 * @param icoUrl ICO 文件的 URL 或 data URL
 * @returns PNG Blob
 */
export async function extractLargestIcoImage(icoUrl: string): Promise<Blob> {
  try {
    // 1. 获取 ICO 文件数据
    const response = await fetch(icoUrl);
    const arrayBuffer = await response.arrayBuffer();
    const dataView = new DataView(arrayBuffer);

    // 2. 验证 ICO 文件头
    const reserved = dataView.getUint16(0, true); // little-endian
    const type = dataView.getUint16(2, true);
    const count = dataView.getUint16(4, true);

    if (reserved !== 0 || type !== 1) {
      throw new Error("Invalid ICO file format");
    }

    if (count === 0) {
      throw new Error("ICO file contains no images");
    }

    // 3. 解析所有图像条目
    const entries: IcoImageEntry[] = [];
    for (let i = 0; i < count; i++) {
      const entryOffset = 6 + i * 16;
      // Width/Height: 0 表示 256
      const width = dataView.getUint8(entryOffset) || 256;
      const height = dataView.getUint8(entryOffset + 1) || 256;
      const imageSize = dataView.getUint32(entryOffset + 8, true);
      const imageOffset = dataView.getUint32(entryOffset + 12, true);

      entries.push({
        width,
        height,
        offset: imageOffset,
        size: imageSize,
      });
    }

    // 4. 找到最大尺寸的图像（按面积）
    const largestEntry = entries.reduce((max, entry) => {
      const maxArea = max.width * max.height;
      const entryArea = entry.width * entry.height;
      return entryArea > maxArea ? entry : max;
    });

    // 5. 提取图像数据
    const imageData = arrayBuffer.slice(
      largestEntry.offset,
      largestEntry.offset + largestEntry.size,
    );

    // 6. 检测图像格式（PNG 或 BMP）
    const imageBytes = new Uint8Array(imageData);
    const isPng =
      imageBytes[0] === 0x89 &&
      imageBytes[1] === 0x50 &&
      imageBytes[2] === 0x4e &&
      imageBytes[3] === 0x47;

    if (isPng) {
      // 已经是 PNG，直接返回
      return new Blob([imageData], { type: "image/png" });
    }
    // BMP 格式，需要转换为 PNG
    return await convertBmpToPng(imageData, largestEntry.width, largestEntry.height);
  } catch (error) {
    console.error("Failed to extract ICO image:", error);

    // 降级方案：使用浏览器原生加载
    try {
      const img = await loadImage(icoUrl);
      const canvas = createCanvas(img.naturalWidth, img.naturalHeight);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }
      ctx.drawImage(img, 0, 0);

      return new Promise((resolve, reject) => {
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        }, "image/png");
      });
    } catch (fallbackError) {
      console.error("Fallback loading also failed:", fallbackError);
      throw new Error("Failed to load favicon");
    }
  }
}
