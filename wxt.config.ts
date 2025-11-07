import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  entrypointsDir: "app",
  outDir: "dist",
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "Recosite",
    description: "网页截图与录屏工具 - 支持长截图、局部截图和视频录制",
    permissions: [
      "activeTab",
      "tabs",
      "scripting",
      "downloads",
      "tabCapture", // 用于捕获标签页内容进行录制
      "offscreen", // 用于创建 offscreen document 进行录制
      "storage", // 用于存储录制数据
    ],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["content-scripts/dom-selector.js"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      minify: false, // 禁用压缩以避免 UTF-8 编码问题
    },
  }),
});
