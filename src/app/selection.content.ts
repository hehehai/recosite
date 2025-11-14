import { createApp } from "vue";
import SelectionTool from "@/components/SelectionTool.vue";
import type { ContentScriptContext } from "@/types/index";
import type { SelectionArea } from "@/types/screenshot";

export default defineContentScript({
  registration: "runtime",
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",

  async main(ctx) {
    // 动态导入 webext-bridge 以避免构建时初始化
    const { onMessage } = await import("webext-bridge/content-script");

    // 使用 webext-bridge 监听消息
    onMessage("selection:start", async () => {
      const result = await startSelection(ctx);
      return result;
    });
  },
});

/**
 * 启动选区工具
 */
async function startSelection(
  _ctx: ContentScriptContext
): Promise<{ area?: SelectionArea; cancelled?: boolean }> {
  return new Promise((resolve) => {
    // 创建容器
    const container = document.createElement("div");
    container.id = "recosite-selection-tool";
    document.body.appendChild(container);

    // 创建 Vue 应用
    const app = createApp(SelectionTool);

    // 处理完成事件
    app.provide("onComplete", async (area: SelectionArea) => {
      try {
        // 先隐藏选区UI
        container.style.display = "none";

        // 等待一帧确保UI已隐藏
        await new Promise((resolveFrame) =>
          requestAnimationFrame(resolveFrame)
        );

        // 考虑设备像素比
        const dpr = window.devicePixelRatio || 1;
        const adjustedArea = {
          x: Math.round(area.x * dpr),
          y: Math.round(area.y * dpr),
          width: Math.round(area.width * dpr),
          height: Math.round(area.height * dpr),
        };

        resolve({ area: adjustedArea });
      } finally {
        // 确保清理总是执行
        try {
          cleanup();
        } catch (err) {
          console.error("[Selection] Cleanup error:", err);
        }
      }
    });

    // 处理取消事件
    app.provide("onCancel", () => {
      try {
        resolve({ cancelled: true });
      } finally {
        // 确保清理总是执行
        try {
          cleanup();
        } catch (err) {
          console.error("[Selection] Cleanup error:", err);
        }
      }
    });

    // 挂载应用
    app.mount(container);

    // 清理函数
    function cleanup() {
      app.unmount();
      container.remove();
    }
  });
}
