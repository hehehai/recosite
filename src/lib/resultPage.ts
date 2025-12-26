import { browser } from "wxt/browser";
import type { PageInfo } from "@/types/screenshot";

/**
 * 打开结果页面并显示截图或录屏
 * 使用 storage API 传递大数据，避免 URL 长度限制
 */
export async function openResultPage(
  dataUrl: string,
  fileName: string,
  width: number,
  height: number,
  size = 0,
  type: "image" | "video" = "image",
): Promise<void> {
  // 生成唯一 ID
  const resultId = `screenshot_${Date.now()}`;

  // 将数据存储到 local storage（跨标签页访问）
  await browser.storage.local.set({
    [resultId]: {
      dataUrl,
      fileName,
      width,
      height,
      size,
      type,
    },
  });

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
