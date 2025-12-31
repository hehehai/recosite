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

        // 获取所有 favicon links
        const iconSelectors = [
          'link[rel="icon"]',
          'link[rel="shortcut icon"]',
          'link[rel="apple-touch-icon"]',
          'link[rel="apple-touch-icon-precomposed"]',
          'link[rel="mask-icon"]',
          'link[rel*="icon"]',
        ];

        const iconLinksSet = new Set<HTMLLinkElement>();
        for (const selector of iconSelectors) {
          const links = document.querySelectorAll(selector);
          for (const link of links) {
            iconLinksSet.add(link as HTMLLinkElement);
          }
        }

        const favicons: {
          url: string;
          html: string;
          rel: string;
          sizes?: string;
          type?: string;
        }[] = [];

        for (const link of iconLinksSet) {
          let href = link.getAttribute("href") || "";
          if (href && !href.startsWith("http") && !href.startsWith("data:")) {
            href = new URL(href, window.location.origin).href;
          }
          if (href) {
            favicons.push({
              url: href,
              html: link.outerHTML,
              rel: link.getAttribute("rel") || "",
              sizes: link.getAttribute("sizes") || undefined,
              type: link.getAttribute("type") || undefined,
            });
          }
        }

        let pageFavicon = "";
        if (favicons.length > 0) {
          pageFavicon = favicons[0].url;
        } else {
          pageFavicon = `${window.location.origin}/favicon.ico`;
        }

        const iconLinksHtml = Array.from(iconLinksSet)
          .map((link) => link.outerHTML)
          .join("\n");

        // 获取 OG 图片
        const ogImageMeta = document.querySelector('meta[property="og:image"]');
        let pageOgImage = ogImageMeta?.getAttribute("content") || "";
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
          favicons,
          iconLinks: iconLinksHtml,
          ogImage: pageOgImage,
          metaTags: pageMetaTags,
        };
      },
    });

    if (!result?.result) {
      return { success: false, error: "Failed to get page meta info" };
    }

    const { description, favicon, favicons, iconLinks, ogImage, metaTags } = result.result;

    const pageInfo: PageInfo = {
      url: tab.url,
      title: tab.title || "",
      description,
      favicon,
      favicons: favicons as PageInfo["favicons"],
      iconLinks,
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
