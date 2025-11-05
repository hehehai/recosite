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
    permissions: ["activeTab", "tabs", "scripting", "downloads"],
    host_permissions: ["<all_urls>"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
