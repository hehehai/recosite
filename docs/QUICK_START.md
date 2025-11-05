# 快速开始指南

## 🚀 5 分钟上手

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发模式

```bash
npm run dev
```

命令运行后会自动监听文件变化并重新构建。

### 3. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 打开右上角的"开发者模式"开关
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录下的 `.output/chrome-mv3` 文件夹

### 4. 测试功能

1. 打开任意网页（比如 https://github.com）
2. 点击浏览器工具栏中的 Recosite 图标
3. 选择一个截图功能进行测试：
   - **视窗截图**：立即截取当前屏幕
   - **长截图**：滚动整个页面并拼接
   - **选区截图**：拖拽选择特定区域

## 🔧 开发工具

### 调试 Background Script

1. 在 `chrome://extensions/` 页面
2. 找到 Recosite 扩展
3. 点击"Service Worker"链接
4. 在打开的 DevTools 中查看日志

### 调试 Popup

1. 右键点击扩展图标
2. 选择"检查弹出内容"
3. 在 DevTools 中调试

### 调试 Content Script

1. 在目标网页上按 F12 打开 DevTools
2. 在 Console 中查看日志

### 热重载

开发模式下，代码修改会自动触发重新构建。但有些情况需要手动刷新：

- **Background Script 修改**：在 `chrome://extensions/` 点击刷新按钮
- **Content Script 修改**：刷新目标网页
- **Popup 修改**：关闭并重新打开 popup

## 📝 常用命令

```bash
# 开发模式（Chrome）
npm run dev

# 开发模式（Firefox）
npm run dev:firefox

# 生产构建
npm run build

# 代码检查和格式化
npm run check

# TypeScript 类型检查
npm run compile

# 打包为 ZIP（用于发布）
npm run zip
```

## 📂 项目结构速览

```
src/
├── app/
│   ├── popup/              # 弹窗界面
│   ├── background.ts       # 后台脚本（处理截图）
│   └── content-selection.ts # 选区工具
├── components/
│   └── SelectionTool.vue   # 选区UI组件
├── types/
│   └── screenshot.ts       # 类型定义
└── utils/
    ├── screenshot.ts       # 截图核心逻辑
    ├── canvas.ts          # Canvas 操作
    └── file.ts            # 文件处理
```

## 🎯 功能实现检查清单

当前已实现的功能：

- ✅ 视窗截图（PNG/JPEG）
- ✅ 长截图（PNG/JPEG）
- ✅ 选区截图（PNG/JPEG）
- ✅ 自动下载
- ✅ 文件命名（带时间戳）

待实现功能：

- ⬜ 视频录制
- ⬜ 截图编辑
- ⬜ 视频编辑

## 🐛 常见问题

### Q: 选区截图功能不工作？

A: 确保已经授予扩展 `<all_urls>` 权限。在某些特殊页面（如 `chrome://`）上可能无法工作。

### Q: 长截图只截取了部分内容？

A: 某些网站使用虚拟滚动或懒加载，可能导致内容未完全加载。尝试手动滚动到底部后再截图。

### Q: 构建失败？

A: 检查 Node.js 版本（建议 >= 18），删除 `node_modules` 和 `.output` 后重新安装依赖。

### Q: 热重载不工作？

A: 尝试：
1. 停止 `npm run dev`
2. 删除 `.output` 目录
3. 重新运行 `npm run dev`
4. 在 Chrome 扩展页面刷新扩展

## 📚 下一步

- 阅读 [开发文档](./DEVELOPMENT.md) 了解架构细节
- 查看 [README.md](../README.md) 了解完整功能
- 贡献代码或提交 Issue

## 💡 开发技巧

### 1. 使用 WXT 的自动重载

WXT 支持热重载，但注意：
- Background script 需要手动刷新扩展
- Content script 需要刷新页面
- Popup 会自动重载

### 2. 调试消息通信

在代码中添加日志：

```typescript
// Background
console.log('[Background] Received message:', message);

// Content Script
console.log('[Content] Handling selection');

// Popup
console.log('[Popup] Requesting capture');
```

### 3. 快速测试页面

推荐测试页面：
- 短页面：https://example.com
- 长页面：https://github.com
- 复杂页面：https://www.amazon.com
- 固定元素：https://docs.github.com

### 4. 性能分析

使用 Chrome DevTools Performance 标签分析长截图性能。

## 🎉 祝你开发愉快！

如有问题，欢迎提交 Issue。
