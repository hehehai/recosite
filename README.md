<div align="center">
  <img src="public/icon.svg" alt="Recosite Logo" width="128" height="128">
  <h1>Recosite</h1>
  <p>Browser extension for capturing web pages and recording screen interactions</p>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Available-brightgreen.svg)](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk)
</div>

## Overview

Capture web pages as images (viewport, full-page, selection, DOM element) and record screen interactions as videos with format conversion support.

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/259f304c-c2e9-4a95-9a42-552a5de7e2c3" width="70%"> </video>
</div>

## Features

**Screenshots**
- Viewport, full-page, selection, and DOM element capture
- PNG/JPEG export with quality control
- Resize with presets (0.25x-3x) or custom dimensions
- Live preview before export

**Video Recording**
- Record tab, window, or desktop
- Resolution: AUTO, 720p, 1080p, 4K
- Audio: system, microphone, camera support
- Auto-stop detection
- Convert to MP4, MOV, WebM, or GIF
- Metadata extraction and video resizing

**UI/UX**
- Clean interface with dark mode
- Instant downloads with smart file naming
- Status notifications and custom video player

## Installation

**Chrome Web Store** (Recommended)

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk)

**Manual Installation**

1. Download from [Releases](https://github.com/hehehai/recosite/releases)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extracted folder

> **Browsers**: Chrome 88+. Firefox and Edge support coming soon.

## Development

**Setup**

```bash
git clone https://github.com/hehehai/recosite.git
cd recosite
npm install
```

**Commands**

```bash
npm run dev              # Start dev server
npm run dev:firefox      # Start dev server (Firefox)
npm run build            # Production build
npm run zip              # Package for store
npm run check            # Format and lint
npm run compile          # Type check
```

**Load Extension**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3` directory

**Requirements**: Node.js 18+

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Manifest V3), [Vue 3](https://vuejs.org/), TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [UnoCSS Icons](https://unocss.dev/presets/icons)
- **Media**: [MediaBunny](https://github.com/TrebledJ/mediabunny) (video conversion), [Snapdom](https://github.com/zumersalad/snapdom) (DOM capture)
- **Tools**: [Biome](https://biomejs.dev/) (linter/formatter), [Vite](https://vitejs.dev/), [webext-bridge](https://github.com/serversideup/webext-bridge) (messaging)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/name`)
3. Run `npm run check` before committing
4. Submit a Pull Request

For major changes, open an issue first to discuss.

## License

MIT License - see [LICENSE](LICENSE) file.

## Acknowledgments

Built with [WXT](https://wxt.dev/), [MediaBunny](https://github.com/TrebledJ/mediabunny), and [Vue.js](https://vuejs.org/).

---

<div align="center">
  <a href="https://github.com/hehehai/recosite">⭐ Star on GitHub</a> •
  <a href="https://github.com/hehehai/recosite/issues">Report Issues</a> •
  <a href="https://github.com/hehehai">@hehehai</a>
</div>
