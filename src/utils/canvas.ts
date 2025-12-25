/**
 * 创建 canvas 元素
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * 从图片 URL 加载图片
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.src = url;
  });
}

/**
 * 将图片绘制到 canvas
 */
export function drawImageToCanvas(
  img: HTMLImageElement,
  width?: number,
  height?: number
): HTMLCanvasElement {
  const w = width || img.naturalWidth;
  const h = height || img.naturalHeight;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/**
 * 合并多个 canvas（用于长截图）
 */
export function mergeCanvas(
  canvasList: HTMLCanvasElement[]
): HTMLCanvasElement {
  if (canvasList.length === 0) {
    throw new Error("Canvas list is empty");
  }

  const width = canvasList[0].width;
  const totalHeight = canvasList.reduce(
    (sum, canvas) => sum + canvas.height,
    0
  );

  const mergedCanvas = createCanvas(width, totalHeight);
  const ctx = mergedCanvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  let offsetY = 0;
  for (const canvas of canvasList) {
    ctx.drawImage(canvas, 0, offsetY);
    offsetY += canvas.height;
  }

  return mergedCanvas;
}
