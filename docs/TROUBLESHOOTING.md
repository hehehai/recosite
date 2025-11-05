# 问题排查指南

## 常见问题及解决方案

### 1. Service Worker 环境限制

#### 问题：`Image is not defined` 或 `URL.createObjectURL is not a function`

**原因**：Chrome Manifest V3 使用 Service Worker 作为 background script，它没有 DOM API。

**解决方案**：
- ✅ 将需要 DOM API 的操作移到 content script 中执行
- ✅ 使用 `chrome.scripting.executeScript()` 在页面中运行代码
- ✅ 使用 `chrome.downloads.download()` API 替代 `URL.createObjectURL()`

**错误提示**：
现在所有错误都会通过 Toast 组件友好地显示给用户，不再使用 alert。

**已修复的代码示例**：
```typescript
// ❌ 错误：在 background script 中使用 Image
const img = new Image();
img.src = dataUrl;

// ✅ 正确：在页面中执行
const result = await chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: (url: string) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    });
  },
  args: [dataUrl],
});
```

### 2. 长截图相关问题

#### 问题：长截图失败或只截取了部分内容

**可能原因**：
1. 页面使用懒加载
2. 页面有虚拟滚动
3. 固定定位元素影响
4. 等待时间不足

**解决方案**：

**调整等待时间**：
```typescript
// src/utils/screenshot.ts line ~235
await new Promise((resolve) => setTimeout(resolve, 300)); // 增加到 500-1000ms
```

**测试页面建议**：
- ✅ 简单页面：https://example.com
- ✅ 标准长页面：https://github.com
- ⚠️ 复杂页面：可能需要更长等待时间

#### 问题：长截图拼接错位

**原因**：不同屏截图的高度不一致

**当前实现**：已处理，使用实际图片高度而非理论高度进行拼接

### 3. 选区截图问题

#### 问题：选区工具不显示

**检查项**：
1. ✅ 确认 content script 已注入
2. ✅ 检查 manifest 权限：`host_permissions: ["<all_urls>"]`
3. ✅ 某些特殊页面（`chrome://`、`edge://`）无法注入

**调试代码**：
```typescript
// 在 content-selection.ts 中添加日志
console.log('[Content] Selection tool mounted');
```

#### 问题：选区坐标不准确

**原因**：没有考虑页面滚动位置

**已修复**：
```typescript
// src/components/SelectionTool.vue
startX.value = event.clientX + window.scrollX; // 加上滚动偏移
startY.value = event.clientY + window.scrollY;
```

### 4. 下载问题

#### 问题：文件下载失败

**检查项**：
1. ✅ 确认 `downloads` 权限已添加
2. ✅ 文件名不包含非法字符
3. ✅ dataURL 格式正确
4. ✅ 查看 Toast 错误提示信息

**调试代码**：
```typescript
// 在 background.ts 中添加
console.log('Downloading file:', fileName);
console.log('DataURL length:', dataUrl.length);
```

**错误提示**：
现在会通过 Toast 显示具体错误信息，更容易定位问题。

#### 问题：下载的文件无法打开

**可能原因**：
- dataURL 格式错误
- 图片数据损坏
- 文件扩展名与内容不匹配

**验证代码**：
```typescript
// 检查 dataURL 格式
if (!dataUrl.startsWith('data:image/')) {
  console.error('Invalid dataURL format');
}
```

### 5. 权限问题

#### 问题：`Cannot read properties of undefined (reading 'sendMessage')`

**原因**：Content script 在扩展上下文失效时执行

**解决方案**：
```typescript
try {
  await chrome.runtime.sendMessage(message);
} catch (error) {
  console.error('Extension context invalidated:', error);
}
```

#### 问题：无法截取特定网站

**检查项**：
1. 网站是否阻止扩展
2. 是否是特殊协议（`chrome://`、`about:`）
3. 是否需要额外权限

### 6. 性能问题

#### 问题：长截图很慢

**优化方案**：
1. 减少截图数量（降低精度）
2. 减少等待时间（可能影响准确性）
3. 使用更高效的拼接算法
4. 考虑添加进度提示

**当前配置**：
```typescript
// 每屏等待 300ms
await new Promise((resolve) => setTimeout(resolve, 300));
```

**用户体验改进**：
- 显示"截图中..."状态
- 未来可添加进度条
- Toast 通知截图完成

**优化建议**：
```typescript
// 使用 requestAnimationFrame 替代固定延迟
await new Promise((resolve) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  });
});
```

#### 问题：截图内存占用过高

**原因**：大图片 dataURL 占用大量内存

**缓解方案**：
- 及时清理不用的 dataURL
- 使用 JPEG 格式降低大小
- 限制最大截图尺寸

## 调试技巧

### 1. 查看 Background Script 日志

```bash
# Chrome
1. chrome://extensions/
2. 找到 Recosite
3. 点击 "Service Worker"
4. 查看 Console
```

### 2. 查看 Content Script 日志

```bash
# 在目标网页
1. 按 F12 打开 DevTools
2. 切换到 Console
3. 查看日志
```

### 3. 查看 Popup 日志

```bash
1. 右键点击扩展图标
2. 选择"检查弹出内容"
3. 查看 Console
```

### 4. 网络请求调试

```bash
# DevTools Network 标签
1. 查看 chrome.downloads.download 请求
2. 检查 dataURL 大小
```

### 5. 性能分析

```bash
# Chrome DevTools Performance
1. 开始录制
2. 执行长截图
3. 停止录制
4. 分析时间消耗
```

## 测试清单

### 功能测试

- [ ] **视窗截图 PNG**
  - [ ] 文件正常下载
  - [ ] 图片可以打开
  - [ ] 尺寸正确

- [ ] **视窗截图 JPEG**
  - [ ] 文件正常下载
  - [ ] 图片可以打开
  - [ ] 质量可接受

- [ ] **长截图 PNG**
  - [ ] 短页面（< 1 屏）
  - [ ] 长页面（2-5 屏）
  - [ ] 超长页面（> 5 屏）
  - [ ] 拼接无错位
  - [ ] 滚动位置恢复

- [ ] **长截图 JPEG**
  - [ ] 同 PNG 测试

- [ ] **选区截图 PNG**
  - [ ] 选区工具显示
  - [ ] 拖拽流畅
  - [ ] 尺寸提示正确
  - [ ] ESC 取消功能
  - [ ] 裁剪准确

- [ ] **选区截图 JPEG**
  - [ ] 同 PNG 测试

### 兼容性测试

- [ ] **不同网站**
  - [ ] 静态网站
  - [ ] 动态网站（SPA）
  - [ ] 固定定位元素
  - [ ] 懒加载内容

- [ ] **不同浏览器**
  - [ ] Chrome
  - [ ] Edge
  - [ ] Brave
  - [ ] Opera

### 边界测试

- [ ] **极端情况**
  - [ ] 极小选区（< 10px）
  - [ ] 极大页面（> 10 屏）
  - [ ] 超宽页面
  - [ ] 页面有 iframe

- [ ] **错误处理**
  - [ ] 网络断开
  - [ ] 页面刷新
  - [ ] 标签页关闭
  - [ ] 权限被拒绝

## 性能基准

### 目标性能指标

| 操作 | 目标时间 | 当前表现 |
|------|---------|---------|
| 视窗截图 | < 500ms | ✅ ~200ms |
| 选区截图 | < 1s | ✅ ~500ms |
| 长截图（2屏） | < 2s | ✅ ~1.5s |
| 长截图（5屏） | < 5s | ⚠️ ~4s |
| 长截图（10屏） | < 10s | ⚠️ ~8-10s |

### 文件大小参考

| 类型 | 尺寸 | PNG | JPEG (quality: 0.92) |
|------|------|-----|---------------------|
| 视窗截图 | 1920x1080 | ~500KB | ~200KB |
| 长截图 | 1920x5400 (5屏) | ~2.5MB | ~800KB |
| 长截图 | 1920x10800 (10屏) | ~5MB | ~1.5MB |

## 新增功能说明

### Toast 通知系统

**功能**：
- 替代了原来的 alert 弹窗
- 更友好的错误提示
- 4 种消息类型
- 自动消失和手动关闭

**使用**：
```typescript
import { useToast } from '@/composables/useToast';
const { success, error, info, warning } = useToast();

// 显示不同类型的消息
success('截图成功');
error('截图失败: ' + errorMessage);
info('正在处理...');
warning('注意：页面较长，可能需要等待');
```

**样式**：
- 支持深色模式
- 平滑动画效果
- 固定在右上角
- 可堆叠多个通知

## 报告问题

如果遇到未列出的问题，请提供以下信息：

1. **环境信息**
   - 浏览器版本
   - 操作系统
   - 扩展版本

2. **问题描述**
   - 具体操作步骤
   - 预期结果
   - 实际结果
   - Toast 错误提示内容（如有）

3. **错误日志**
   - Background script 日志
   - Content script 日志
   - Console 错误信息
   - 截图或录屏

4. **重现步骤**
   - 测试 URL
   - 详细操作步骤
   - 发生频率

提交 Issue：https://github.com/your-repo/recosite/issues
