import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";
import { viteStaticCopy } from "vite-plugin-static-copy";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  entrypointsDir: "app",
  outDir: "dist",
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    default_locale: "en",
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    permissions: [
      "activeTab",
      "tabs",
      "scripting",
      "tabCapture", // 用于捕获标签页内容进行录制
      "offscreen", // 用于创建 offscreen document 进行录制
      "storage", // 用于存储录制数据
    ],
    host_permissions: ["<all_urls>"],
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      64: "icon/64.png",
      128: "icon/128.png",
      512: "icon/512.png",
    },
  },
  vite: () => ({
    plugins: [
      tailwindcss(),
      // 复制 jSquash WASM 文件到构建输出（仅 JPEG 和 WebP 有损压缩格式）
      viteStaticCopy({
        targets: [
          {
            src: "node_modules/@jsquash/jpeg/codec/enc/*.wasm",
            dest: "chunks",
          },
          {
            src: "node_modules/@jsquash/webp/codec/enc/*.wasm",
            dest: "chunks",
          },
        ],
      }),
    ],
    build: {
      minify: false, // 禁用压缩以避免 UTF-8 编码问题
    },
    optimizeDeps: {
      // jSquash 包使用 WASM，需要排除预构建以保持动态导入正常工作
      exclude: ["@jsquash/jpeg", "@jsquash/webp"],
    },
  }),
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      // 确保 default_locale 和 i18n 字段正确设置
      manifest.default_locale = "en";
      manifest.name = "__MSG_extName__";
      manifest.description = "__MSG_extDescription__";
      if (manifest.action) {
        manifest.action.default_title = "__MSG_extName__";
      }
    },
  },
});
