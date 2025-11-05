## 核心思路

1. 用户交互：用户点击扩展工具栏中的图标，打开 popup 点击 视频录制。
2. 启动捕获：扩展程序使用 chrome.tabCapture API 获取当前活动标签页的音视频流 (MediaStream)。
3. 开始录制：使用标准的 Web MediaRecorder API 接收这个流，并开始录制数据。
4. 管理状态：在录制过程中，扩展图标会发生变化，用户可以再次点击来停止录制。
5. 停止录制与保存：当用户停止录制时，MediaRecorder 会生成一个视频 Blob（二进制大对象）。我们将这个 Blob 转换为一个可下载的 URL，并自动触发下载，将视频文件保存到用户的电脑上。

由于 Manifest V3 的限制（后台 Service Worker 无法直接操作 DOM 或长时间保持状态），我们将使用 Offscreen Document（一个在后台运行的隐藏 HTML 页面）来处理 MediaStream 和 MediaRecorder 的所有工作。

- 只录制网页（不要录制浏览器）
- 使用 mediabunny 来实现可以实现的功能（例如视频格式转换）
- 录制开始时，插件图标变化，显示录制中，再次点击可以停止录制，恢复正常
- 录制支持 mp4，webm，gif，请先实现 webm

### 可能的改进方向:

提供录制选项: 在 popup.html 中添加一个弹出窗口，让用户选择是否录制音频、视频，或者设置视频分辨率/帧率。这些选项可以通过 chrome.storage API 保存，并在 background.js 中调用 getMediaStreamId 时使用。
更精细的状态管理: 使用 chrome.action.setBadgeText({text: "REC"}) 在图标上显示一个红色的 "REC" 徽章，这是录制应用常见的做法。
错误处理: 在 UI 上向用户显示更友好的错误信息，而不是仅仅在控制台打印。
支持更多格式: 尝试不同的 mimeType，如 'video/mp4' 或 'video/webm;codecs=h264'，但请注意浏览器对这些格式的支持情况可能不同。vp9 和 opus (音频) 通常是 WebM 的最安全组合。

## mediabunny

- https://mediabunny.dev/llms

While Mediabunny is proudly human-generated, we want to encourage any and all usage of Mediabunny, even when the vibes are high.

Mediabunny is still new and is unlikely to be in the training data of modern LLMs, but we can still make the AI perform extremely well by just giving it a little more context.

Give one or more of these files to your LLM:

[mediabunny.d.ts](https://mediabunny.dev/mediabunny.d.ts)
This file contains the entire public TypeScript API of Mediabunny and is commented extremely thoroughly.

[llms.txt](https://mediabunny.dev/llms.txt)
This file provides an index of Mediabunny's guide, which the AI can then further dive into if it wants to.

[llms-full.txt](https://mediabunny.dev/llms-full.txt)
This is just the entire Mediabunny guide in a single file.
