import { createApp } from "vue";
import SelectionTool from "@/components/SelectionTool.vue";
import type { ContentScriptContext } from "@/types/index";
import type { SelectionArea } from "@/types/screenshot";

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // 监听来自 background 的消息
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "start_selection") {
        startSelection(ctx, sendResponse);
        return true; // 保持消息通道开启
      }
      return false;
    });
  },
});

/**
 * 启动选区工具
 */
function startSelection(
  _ctx: ContentScriptContext,
  sendResponse: (response: {
    area?: SelectionArea;
    cancelled?: boolean;
  }) => void
) {
  // 创建容器
  const container = document.createElement("div");
  container.id = "recosite-selection-tool";
  document.body.appendChild(container);

  // 创建 Vue 应用
  const app = createApp(SelectionTool);

  // 处理完成事件
  app.provide("onComplete", async (area: SelectionArea) => {
    // 先隐藏选区UI
    container.style.display = "none";

    // 等待一帧确保UI已隐藏
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // 考虑设备像素比
    const dpr = window.devicePixelRatio || 1;
    const adjustedArea = {
      x: Math.round(area.x * dpr),
      y: Math.round(area.y * dpr),
      width: Math.round(area.width * dpr),
      height: Math.round(area.height * dpr),
    };

    cleanup();
    sendResponse({ area: adjustedArea });
  });

  // 处理取消事件
  app.provide("onCancel", () => {
    cleanup();
    sendResponse({ cancelled: true });
  });

  // 挂载应用
  app.mount(container);

  // 清理函数
  function cleanup() {
    app.unmount();
    container.remove();
  }
}
