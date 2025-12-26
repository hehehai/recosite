import { browser } from "wxt/browser";
import type { PageInfo } from "@/types/screenshot";
import { storeBlobData } from "@/lib/blobStorage";

/**
 * 打开结果页面并显示截图或录屏
 * 对于视频和大图片使用 IndexedDB 存储 Blob,避免 storage.local 的容量限制
 * 对于小图片使用 data URL 存储在 storage.local
 */
export async function openResultPage(
  data: Blob | string, // Accept Blob or data URL
  fileName: string,
  width: number,
  height: number,
  size = 0,
  type: "image" | "video" = "image",
): Promise<void> {
  // 生成唯一 ID
  const resultId = `screenshot_${Date.now()}`;

  // For videos or large images (passed as Blob), store in IndexedDB
  if (data instanceof Blob) {
    await storeBlobData(resultId, data);

    // Store metadata in storage.local (small)
    await browser.storage.local.set({
      [resultId]: {
        usesIndexedDB: true,
        fileName,
        width,
        height,
        size,
        type,
      },
    });
  } else {
    // For small images (data URL), use existing storage.local approach
    await browser.storage.local.set({
      [resultId]: {
        dataUrl: data,
        fileName,
        width,
        height,
        size,
        type,
      },
    });
  }

  // 打开结果页面，只传递 ID
  const resultUrl = browser.runtime.getURL("/result.html");
  const params = new URLSearchParams({
    id: resultId,
  });

  await browser.tabs.create({
    url: `${resultUrl}?${params.toString()}`,
  });
}

/**
 * 打开页面信息结果页面
 */
export async function openPageInfoResultPage(pageInfo: PageInfo): Promise<void> {
  const resultId = `pageinfo_${Date.now()}`;

  await browser.storage.local.set({
    [resultId]: {
      type: "pageinfo",
      pageInfo,
    },
  });

  const resultUrl = browser.runtime.getURL("/result.html");
  const params = new URLSearchParams({
    id: resultId,
  });

  await browser.tabs.create({
    url: `${resultUrl}?${params.toString()}`,
  });
}
