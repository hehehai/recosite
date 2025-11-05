# Recosite

> 这是一个浏览器插件，可以截取网页为长图或局部图，还支持录制网页交互为视频

## 功能实现状态

### ✅ 已完成的功能

- [x] 任意网页视窗截图（PNG/JPEG）
- [x] 任意网页长截图（PNG/JPEG）- 自动滚动拼接
- [x] 任意网页局部选择截图（PNG/JPEG）- 可视化拖拽选区
- [x] 自动文件下载和命名
- [x] 美观的 Popup UI 界面

### 🚧 待实现的功能

- [ ] 任意网页视窗录制（mp4, wav, gif）
- [ ] 截图二次编辑（尺寸截取）
- [ ] 视频二次编辑（时长截取，视频帧选取封面）

## 技术栈

- **wxt** - 现代化的浏览器插件开发框架
- **vue 3** - 渐进式 JavaScript 框架
- **tailwindcss** - 实用优先的 CSS 框架
- **vite** - 新一代前端构建工具（wxt 封装）
- **biome** - 快速的代码格式化和检查工具

## 项目结构

```
src/
├── app/                      # 插件入口点
│   ├── popup/               # 弹窗页面
│   │   ├── App.vue         # 主界面
│   │   ├── index.html      # HTML 入口
│   │   └── main.ts         # Vue 应用入口
│   ├── background.ts        # 后台脚本（处理截图逻辑）
│   ├── content.ts           # 内容脚本（原有）
│   └── content-selection.ts # 选区工具内容脚本
├── components/              # Vue 组件
│   ├── SelectionTool.vue   # 可视化选区工具
│   └── HelloWorld.vue      # 示例组件
├── types/                   # TypeScript 类型定义
│   └── screenshot.ts       # 截图相关类型
├── utils/                   # 工具函数
│   ├── screenshot.ts       # 截图核心功能
│   ├── canvas.ts           # Canvas 操作工具
│   └── file.ts             # 文件处理工具
└── assets/                  # 静态资源
    └── tailwind.css        # Tailwind CSS 入口
```

## 功能说明

### 1. 视窗截图
- **功能**：截取浏览器当前可见区域
- **格式**：PNG（无损）或 JPEG（有损压缩）
- **实现**：使用 Chrome `tabs.captureVisibleTab` API

### 2. 长截图（整页截图）
- **功能**：自动滚动页面并拼接为完整截图
- **格式**：PNG 或 JPEG
- **实现**：
  - 计算页面总高度
  - 分段滚动并截图
  - 使用 Canvas 拼接所有截图
  - 支持超长页面

### 3. 选区截图
- **功能**：拖拽鼠标选择任意区域进行截图
- **格式**：PNG 或 JPEG
- **实现**：
  - 注入可视化选区工具
  - 实时显示选区尺寸
  - 支持 ESC 取消选择
  - 自动裁剪并下载

## 开发命令

```bash
# 安装依赖
npm install

# 开发模式（Chrome）
npm run dev

# 开发模式（Firefox）
npm run dev:firefox

# 构建生产版本（Chrome）
npm run build

# 构建生产版本（Firefox）
npm run build:firefox

# 打包为 ZIP（用于发布）
npm run zip

# 代码格式化和检查
npm run check

# TypeScript 类型检查
npm run compile
```

## 安装和使用

### 开发模式

1. 克隆项目并安装依赖：
   ```bash
   git clone <repository-url>
   cd recosite
   npm install
   ```

2. 启动开发服务器：
   ```bash
   npm run dev
   ```

3. 在 Chrome 中加载扩展：
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `.output/chrome-mv3` 目录

### 生产构建

1. 构建生产版本：
   ```bash
   npm run build
   ```

2. 在 Chrome 中加载：
   - 打开 `chrome://extensions/`
   - 开启"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择 `dist/chrome-mv3` 目录

### 使用方法

1. 点击浏览器工具栏中的 Recosite 图标
2. 选择截图类型：
   - **视窗截图**：立即截取当前可见区域
   - **长截图**：自动滚动并截取整个页面
   - **选区截图**：拖拽选择特定区域
3. 选择图片格式（PNG 或 JPEG）
4. 截图会自动下载到默认下载目录

## 核心 API 使用

### 权限要求

```json
{
  "permissions": [
    "activeTab",      // 访问当前标签页
    "tabs",           // 操作标签页
    "scripting",      // 注入脚本
    "downloads"       // 下载文件
  ],
  "host_permissions": ["<all_urls>"]  // 访问所有网站
}
```

### 主要 API

- `chrome.tabs.captureVisibleTab()` - 截取可见标签页
- `chrome.tabs.query()` - 查询标签页信息
- `chrome.scripting.executeScript()` - 执行脚本
- `chrome.runtime.sendMessage()` - 消息通信
- `chrome.runtime.onMessage` - 监听消息

## 技术亮点

1. **模块化架构**：清晰的文件结构和职责分离
2. **类型安全**：完整的 TypeScript 类型定义
3. **现代化工具链**：WXT + Vue 3 + Tailwind CSS
4. **消息通信**：Background ↔ Content Script ↔ Popup 三方通信
5. **Canvas 操作**：高效的图片处理和拼接算法
6. **用户体验**：实时反馈、可视化选区、自动命名

## 待优化项

1. **长截图性能优化**
   - 当前实现需要等待滚动完成
   - 可以考虑使用 `chrome.debugger` API 获取完整渲染树

2. **选区工具增强**
   - 添加撤销/重做功能
   - 支持键盘快捷键
   - 添加网格辅助线

3. **文件管理**
   - 自定义保存路径
   - 批量截图管理
   - 历史记录查看

4. **图片编辑**
   - 添加基础编辑功能（裁剪、旋转、标注）
   - 添加水印功能

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT
