# 开发文档

## 架构说明

### 核心模块

#### 1. Background Script (`src/app/background.ts`)

**职责**：
- 处理来自 popup 和 content script 的消息
- 执行截图操作
- 管理文件下载

**主要函数**：
- `handleCaptureViewport()` - 处理视窗截图
- `handleCaptureFullPage()` - 处理长截图
- `handleStartSelection()` - 处理选区截图
- `handleInternalCaptureViewport()` - 内部视窗截图（用于长截图拼接）

**消息类型**：
```typescript
enum MessageType {
  CAPTURE_VIEWPORT = "capture_viewport",
  CAPTURE_FULL_PAGE = "capture_full_page",
  START_SELECTION = "start_selection",
  SELECTION_COMPLETE = "selection_complete",
}
```

#### 2. Popup (`src/app/popup/App.vue`)

**职责**：
- 提供用户界面
- 向 background script 发送截图请求
- 显示截图结果反馈

**主要功能**：
- 6 个截图按钮（视窗/长截图/选区 × PNG/JPEG）
- 实时状态显示
- 结果反馈

#### 3. Content Script - Selection (`src/app/content-selection.ts`)

**职责**：
- 注入选区工具到页面
- 处理用户选区操作
- 返回选区坐标给 background

**工作流程**：
1. 接收 background 的 `START_SELECTION` 消息
2. 创建 Vue 应用并挂载 SelectionTool 组件
3. 用户完成选区或取消
4. 返回结果给 background
5. 卸载组件并清理

#### 4. Selection Tool Component (`src/components/SelectionTool.vue`)

**职责**：
- 渲染可视化选区界面
- 处理鼠标事件
- 计算选区坐标

**功能**：
- 拖拽选择区域
- 实时显示尺寸
- ESC 取消
- 遮罩效果

### 工具模块

#### 1. Screenshot Utils (`src/utils/screenshot.ts`)

**ScreenshotCapture 类**：

```typescript
class ScreenshotCapture {
  // 捕获视窗
  static async captureViewport(format, quality): Promise<ScreenshotResult>

  // 捕获选区
  static async captureSelection(area, format, quality): Promise<ScreenshotResult>

  // 捕获整页（长截图）
  static async captureFullPage(format, quality): Promise<ScreenshotResult>
}
```

**长截图实现原理**：
1. 获取页面总高度和视窗高度
2. 计算需要截图的次数 = ceil(总高度 / 视窗高度)
3. 循环滚动并截图：
   - 滚动到指定位置
   - 等待渲染（100ms）
   - 调用 `captureVisibleTab()`
   - 保存截图
4. 使用 Canvas 拼接所有截图
5. 导出为最终图片

#### 2. Canvas Utils (`src/utils/canvas.ts`)

**主要函数**：
- `createCanvas(width, height)` - 创建 canvas
- `loadImage(url)` - 加载图片
- `cropCanvas(canvas, area)` - 裁剪 canvas
- `drawImageToCanvas(img)` - 绘制图片到 canvas
- `mergeCanvas(canvasList)` - 合并多个 canvas

#### 3. File Utils (`src/utils/file.ts`)

**主要函数**：
- `dataURLToBlob(dataURL)` - dataURL 转 Blob
- `downloadFile(blob, fileName)` - 下载文件
- `generateFileName(format)` - 生成文件名（带时间戳）
- `canvasToBlob(canvas, format, quality)` - canvas 转 Blob

### 消息通信流程

#### 视窗截图流程

```
Popup                Background              Chrome API
  |                      |                       |
  |--CAPTURE_VIEWPORT--->|                       |
  |                      |----captureVisibleTab->|
  |                      |<---dataURL------------|
  |                      |----download---------->|
  |<--result-------------|                       |
```

#### 选区截图流程

```
Popup          Background      Content Script    SelectionTool
  |                |                 |                  |
  |--START-------->|                 |                  |
  |   SELECTION    |----START------->|                  |
  |                |    SELECTION    |----mount-------->|
  |                |                 |                  |
  |                |                 |<--user action----|
  |                |                 |<--complete-------|
  |                |<--area----------|                  |
  |                |                 |----cleanup------>|
  |                |----capture----->Chrome API         |
  |<--result-------|                 |                  |
```

#### 长截图流程

```
Popup          Background           Content Script        Chrome API
  |                |                      |                    |
  |--FULL_PAGE---->|                      |                    |
  |                |----executeScript---->|                    |
  |                |                      |----scroll--------->|
  |                |                      |<--viewport---------|
  |                |<--request capture----|                    |
  |                |----captureTab------->|                    |
  |                |<--dataURL------------|                    |
  |                |----dataURL---------->|                    |
  |                |                      |----repeat N times--|
  |                |<--merged dataURL-----|                    |
  |                |----download--------->|                    |
  |<--result-------|                      |                    |
```

## 调试技巧

### 1. Background Script 调试

```javascript
// 在 background.ts 中添加日志
console.log("Background: handling message", message);
```

查看日志：
1. 打开 `chrome://extensions/`
2. 找到 Recosite 扩展
3. 点击"Service Worker"链接
4. 在 DevTools 中查看 Console

### 2. Content Script 调试

```javascript
// 在 content-selection.ts 中添加日志
console.log("Content: received message", message);
```

查看日志：
1. 在目标网页上右键 → 检查
2. 在 DevTools Console 中查看

### 3. Popup 调试

1. 右键点击扩展图标
2. 选择"检查弹出内容"
3. 在 DevTools 中调试

### 4. 常见问题

**问题 1**: content script 没有注入
- 检查 manifest.json 中的 matches 配置
- 确认页面 URL 匹配规则

**问题 2**: 消息通信失败
- 确认使用 `return true` 保持消息通道开启
- 检查消息类型是否正确
- 使用 `sendResponse()` 回复消息

**问题 3**: 截图质量问题
- PNG 格式不支持 quality 参数
- JPEG quality 范围是 0-100
- Chrome API 的 quality 参数范围是 0-100

**问题 4**: 长截图失败
- 页面可能有固定定位元素
- 某些页面使用虚拟滚动
- 滚动等待时间可能不够

## 测试指南

### 手动测试清单

#### 视窗截图
- [ ] PNG 格式正常下载
- [ ] JPEG 格式正常下载
- [ ] 文件名包含时间戳
- [ ] 图片尺寸正确

#### 长截图
- [ ] 短页面（小于 1 屏）正常
- [ ] 长页面（多屏）拼接正确
- [ ] 超长页面性能可接受
- [ ] 滚动后页面恢复到原位置

#### 选区截图
- [ ] 选区工具正确显示
- [ ] 拖拽选择正常
- [ ] 尺寸提示正确
- [ ] ESC 取消功能正常
- [ ] 小选区自动取消（< 10px）
- [ ] 裁剪区域准确

### 测试页面推荐

1. **短页面测试**：`https://example.com`
2. **长页面测试**：`https://github.com`
3. **复杂布局**：`https://amazon.com`
4. **固定元素**：`https://docs.github.com`

## 性能优化建议

### 1. 长截图优化

当前实现：
```javascript
// 等待固定时间
await new Promise(resolve => setTimeout(resolve, 100));
```

优化方案：
```javascript
// 等待页面稳定（requestAnimationFrame）
await new Promise(resolve => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});
```

### 2. Canvas 内存管理

```javascript
// 及时清理不需要的 canvas
canvas.width = 0;
canvas.height = 0;
canvas = null;
```

### 3. 分段下载（大图片）

对于超大图片，考虑：
- 使用 Blob chunks
- 流式写入
- 压缩后下载

## 扩展功能建议

### 1. 快捷键支持

在 manifest 中添加：
```json
{
  "commands": {
    "capture-viewport": {
      "suggested_key": {
        "default": "Ctrl+Shift+V"
      },
      "description": "Capture viewport"
    }
  }
}
```

### 2. 右键菜单

```javascript
chrome.contextMenus.create({
  id: "capture-selection",
  title: "截取选区",
  contexts: ["all"]
});
```

### 3. 历史记录

使用 `chrome.storage.local` 保存截图历史：
```javascript
await chrome.storage.local.set({
  history: screenshots
});
```

### 4. 云同步

使用 `chrome.storage.sync` 同步配置：
```javascript
await chrome.storage.sync.set({
  defaultFormat: "png",
  quality: 0.92
});
```

## 发布清单

- [ ] 更新版本号（package.json 和 manifest）
- [ ] 运行 `npm run build`
- [ ] 测试所有功能
- [ ] 准备商店截图和描述
- [ ] 打包 `npm run zip`
- [ ] 上传到 Chrome Web Store
- [ ] 创建 GitHub Release
