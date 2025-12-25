import { browser } from "wxt/browser";
import {
  ImageFormat,
  type ScreenshotOptions,
  type ScreenshotResult,
  ScreenshotType,
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
 * 计算安全重叠像素，避免因舍入/布局抖动造成丢段
 */
function computeOverlap(viewportHeight: number): number {
  const ratio = 0.05; // 5% 视口高度
  const minPx = 20;
  const maxPx = 160;
  const raw = Math.round(viewportHeight * ratio);
  return Math.max(minPx, Math.min(maxPx, raw));
}

/**
 * 构建滚动计划
 */
function buildScrollPlan(totalHeight: number, viewportHeight: number) {
  const safeViewport = Math.max(1, viewportHeight);
  const maxOffset = Math.max(0, totalHeight - safeViewport);
  const overlap = computeOverlap(safeViewport);
  const stride = Math.max(1, safeViewport - overlap);
  const offsetSet = new Set<number>();

  // 强制包含 0 和末尾 maxOffset
  offsetSet.add(0);
  for (let y = 0; y < maxOffset; y += stride) {
    offsetSet.add(Math.min(y, maxOffset));
  }
  offsetSet.add(maxOffset);

  const offsets = Array.from(offsetSet).sort((a, b) => a - b);
  return offsets;
}

/**
 * 页面准备函数（在页面上下文中执行）
 */
function preparePageScript() {
  const w = window as any;
  if (w.__snapshotBackup) {
    return {
      totalHeight: w.__snapshotBackup.totalHeight,
      viewportHeight: w.__snapshotBackup.viewportHeight,
      dpr: window.devicePixelRatio || 1,
    };
  }

  const backups: Array<{ el: HTMLElement; cssText: string }> = [];
  const originalScrollTop = window.scrollY;
  const originalOverflow = document.documentElement.style.overflow || "";
  const originalBodyOverflow = document.body.style.overflow || "";

  // 收集并处理定位元素
  const all = Array.from(document.querySelectorAll("*")) as HTMLElement[];
  for (const el of all) {
    const cs = getComputedStyle(el);
    const position = cs.position;

    if (position === "fixed" || position === "sticky") {
      backups.push({ el, cssText: el.style.cssText });
    }
  }

  // 创建隐藏滚动条样式
  let styleEl = document.querySelector(
    'style[data-snapshot="hide-scrollbar"]'
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.setAttribute("data-snapshot", "hide-scrollbar");
    styleEl.textContent = `
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }
      html, body { scrollbar-width: none !important; }
    `;
    document.documentElement.appendChild(styleEl);
  }

  // 隐藏滚动条并滚动到顶部
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  window.scrollTo(0, 0);

  // 处理定位元素
  for (const backup of backups) {
    const cs = getComputedStyle(backup.el);
    if (cs.position === "fixed") {
      const rect = backup.el.getBoundingClientRect();
      backup.el.style.setProperty("position", "absolute", "important");
      backup.el.style.setProperty("top", `${rect.top}px`, "important");
      backup.el.style.setProperty("left", `${rect.left}px`, "important");
      backup.el.style.setProperty("right", "auto", "important");
      backup.el.style.setProperty("bottom", "auto", "important");
    } else if (cs.position === "sticky") {
      backup.el.style.setProperty("position", "static", "important");
      backup.el.style.setProperty("top", "auto", "important");
      backup.el.style.setProperty("z-index", "auto", "important");
    }
  }

  // 计算内容高度
  const layoutH = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    document.documentElement.offsetHeight,
    document.body.offsetHeight
  );

  let maxBottom = 0;
  const nodes = Array.from(
    document.body.getElementsByTagName("*")
  ) as HTMLElement[];
  for (const el of nodes) {
    const rect = el.getBoundingClientRect();
    if (rect) {
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
  }
  const bboxH = maxBottom + window.scrollY;
  const totalHeight = Math.max(layoutH, bboxH);
  const viewportHeight = window.innerHeight;

  w.__snapshotBackup = {
    backups,
    originalScrollTop,
    originalOverflow,
    originalBodyOverflow,
    styleEl,
    totalHeight,
    viewportHeight,
  };

  return {
    totalHeight,
    viewportHeight,
    dpr: window.devicePixelRatio || 1,
  };
}

/**
 * 准备页面进行截图（隐藏固定元素、滚动条等）
 */
async function preparePageForCapture(tabId: number) {
  return await browser.scripting.executeScript({
    target: { tabId },
    func: preparePageScript,
  });
}

/**
 * 恢复页面状态
 */
async function restorePageState(tabId: number) {
  await browser.scripting.executeScript({
    target: { tabId },
    func: () => {
      const w = window as any;
      const b = w.__snapshotBackup;
      if (b) {
        for (const item of b.backups || []) {
          item.el.style.cssText = item.cssText;
        }
        if (b.styleEl?.parentNode) {
          b.styleEl.parentNode.removeChild(b.styleEl);
        }
        document.documentElement.style.overflow = b.originalOverflow;
        document.body.style.overflow = b.originalBodyOverflow;
        window.scrollTo(0, b.originalScrollTop);
      }
      w.__snapshotBackup = undefined;
    },
  });
}

/**
 * 执行滚动步骤
 */
async function performScrollStep(tabId: number, y: number) {
  await browser.scripting.executeScript({
    target: { tabId },
    func: (yy: number) =>
      new Promise((resolve) => {
        window.scrollTo(0, yy);
        document.body.getBoundingClientRect();
        requestAnimationFrame(() =>
          requestAnimationFrame(() => resolve({ y: yy }))
        );
      }),
    args: [y],
  });
}

/**
 * 捕获整个页面（长截图）
 * 使用带重叠的智能滚动策略
 */
export async function captureFullPage(
  format: ImageFormat = ImageFormat.PNG,
  quality = 0.92
): Promise<ScreenshotResult> {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tab.id) {
    throw new Error("No active tab found");
  }

  try {
    // 1. 准备页面
    const prepResult = await preparePageForCapture(tab.id);
    if (!prepResult[0]?.result) {
      throw new Error("Failed to prepare page");
    }

    const { totalHeight, viewportHeight } = prepResult[0].result;

    // 2. 构建滚动计划
    const offsets = buildScrollPlan(totalHeight, viewportHeight);

    // 3. 执行滚动并截图
    const screenshots: string[] = [];
    const actualOffsets: number[] = [];

    for (const offset of offsets) {
      // 滚动到目标位置
      await performScrollStep(tab.id, offset);

      // 等待渲染
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 获取实际滚动位置
      const actualPosResult = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.scrollY,
      });
      const actualPos = actualPosResult[0]?.result || offset;

      // 截图
      const dataUrl = await browser.tabs.captureVisibleTab({
        format: format === ImageFormat.PNG ? "png" : "jpeg",
        quality:
          format === ImageFormat.JPEG ? Math.round(quality * 100) : undefined,
      });

      screenshots.push(dataUrl);
      actualOffsets.push(actualPos);
    }

    // 4. 拼接截图
    const mergeResult = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (
        dataUrls: string[],
        imageFormat: ImageFormat,
        imageQuality: number,
        pageHeight: number,
        viewportH: number,
        scrollOffsets: number[]
      ) => {
        // 加载所有图片
        const images = await Promise.all(
          dataUrls.map(
            (url) =>
              new Promise<HTMLImageElement>((resolveImg, rejectImg) => {
                const image = new Image();
                image.onload = () => resolveImg(image);
                image.onerror = rejectImg;
                image.src = url;
              })
          )
        );

        const scale = images[0].naturalHeight / viewportH;
        const canvas = document.createElement("canvas");
        canvas.width = images[0].naturalWidth;
        canvas.height = Math.ceil(pageHeight * scale);
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Failed to get 2d context");
        }

        // 使用实际偏移量进行精确拼接
        const segments = images.map((bitmap, index) => ({
          bitmap,
          destY: scrollOffsets[index] * scale,
        }));

        segments.sort((a, b) => a.destY - b.destY);

        let canvasFilledHeight = 0;

        for (const { bitmap, destY } of segments) {
          const roundedDestY = Math.round(destY);

          let srcY = 0;
          let drawDestY = roundedDestY;
          let srcH = bitmap.naturalHeight;

          // 处理重叠
          if (roundedDestY < canvasFilledHeight) {
            const overlap = canvasFilledHeight - roundedDestY;
            srcY = Math.min(overlap, bitmap.naturalHeight);
            drawDestY = canvasFilledHeight;
            srcH = bitmap.naturalHeight - srcY;
          }

          // 确保不超出画布
          const remaining = canvas.height - drawDestY;
          if (remaining <= 0 || srcH <= 0) {
            continue;
          }

          srcH = Math.min(srcH, remaining);

          if (srcH > 0) {
            ctx.drawImage(
              bitmap,
              0,
              srcY,
              bitmap.naturalWidth,
              srcH,
              0,
              drawDestY,
              bitmap.naturalWidth,
              srcH
            );
            canvasFilledHeight = Math.max(canvasFilledHeight, drawDestY + srcH);
          }
        }

        const mergedDataUrl = canvas.toDataURL(
          `image/${imageFormat}`,
          imageFormat === "jpeg" ? imageQuality : undefined
        );

        return {
          dataUrl: mergedDataUrl,
          width: canvas.width,
          height: canvas.height,
        };
      },
      args: [
        screenshots,
        format,
        quality,
        totalHeight,
        viewportHeight,
        actualOffsets,
      ],
    });

    if (!mergeResult[0]?.result) {
      throw new Error("Failed to merge screenshots");
    }

    const { dataUrl: finalDataUrl, width, height } = mergeResult[0].result;
    const blob = dataURLToBlob(finalDataUrl);

    return {
      dataUrl: finalDataUrl,
      blob,
      width,
      height,
    };
  } finally {
    // 5. 恢复页面状态
    await restorePageState(tab.id);
  }
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

    default:
      throw new Error(`Unknown screenshot type: ${type}`);
  }
}
