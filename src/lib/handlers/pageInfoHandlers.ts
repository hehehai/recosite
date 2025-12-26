import { browser } from "wxt/browser";
import type { PageInfo } from "@/types/screenshot";
import { ImageFormat } from "@/types/screenshot";
import { JPEG_QUALITY } from "@/lib/constants/common";
import { captureViewport } from "@/lib/screenshot";
import { openPageInfoResultPage } from "@/lib/resultPage";

/**
 * 处理获取页面信息
 */
export async function handleCapturePageInfo(): Promise<{
  success: boolean;
  pageInfo?: PageInfo;
  error?: string;
}> {
  try {
    console.log("[PageInfoHandler] Starting page info capture...");

    // 获取当前活动标签页
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!(tab.id && tab.url)) {
      return { success: false, error: "No active tab found" };
    }

    // 捕获视窗截图
    const screenshot = await captureViewport(ImageFormat.PNG, JPEG_QUALITY);

    // 注入脚本获取页面 meta 信息
    const [result] = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // 获取 meta description
        const descMeta =
          document.querySelector('meta[name="description"]') ||
          document.querySelector('meta[property="og:description"]');
        const pageDescription = descMeta?.getAttribute("content") || "";

        // 获取 favicon
        let pageFavicon = "";
        const iconLink =
          document.querySelector('link[rel="icon"]') ||
          document.querySelector('link[rel="shortcut icon"]') ||
          document.querySelector('link[rel="apple-touch-icon"]');
        if (iconLink) {
          pageFavicon = iconLink.getAttribute("href") || "";
          // 如果是相对路径，转换为绝对路径
          if (pageFavicon && !pageFavicon.startsWith("http")) {
            pageFavicon = new URL(pageFavicon, window.location.origin).href;
          }
        } else {
          // 默认使用 /favicon.ico
          pageFavicon = `${window.location.origin}/favicon.ico`;
        }

        // 获取 OG 图片
        const ogImageMeta = document.querySelector('meta[property="og:image"]');
        let pageOgImage = ogImageMeta?.getAttribute("content") || "";
        // 如果是相对路径，转换为绝对路径
        if (pageOgImage && !pageOgImage.startsWith("http")) {
          pageOgImage = new URL(pageOgImage, window.location.origin).href;
        }

        // 获取所有 meta 标签的 HTML 代码
        const pageMetaTags = Array.from(document.querySelectorAll("meta"))
          .map((meta) => meta.outerHTML)
          .join("\n");

        return {
          description: pageDescription,
          favicon: pageFavicon,
          ogImage: pageOgImage,
          metaTags: pageMetaTags,
        };
      },
    });

    if (!result?.result) {
      return { success: false, error: "Failed to get page meta info" };
    }

    const { description, favicon, ogImage, metaTags } = result.result;

    const pageInfo: PageInfo = {
      url: tab.url,
      title: tab.title || "",
      description,
      favicon,
      ogImage,
      screenshot: screenshot.dataUrl,
      metaTags,
      width: screenshot.width,
      height: screenshot.height,
    };

    console.log("[PageInfoHandler] Page info captured:", {
      url: pageInfo.url,
      title: pageInfo.title,
      hasDescription: !!pageInfo.description,
      hasFavicon: !!pageInfo.favicon,
      hasOgImage: !!pageInfo.ogImage,
    });

    // 打开结果页面
    await openPageInfoResultPage(pageInfo);

    return { success: true, pageInfo };
  } catch (error) {
    console.error("[PageInfoHandler] Failed to capture page info:", error);
    return { success: false, error: String(error) };
  }
}
