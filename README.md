<div align="center">
  <img src="public/icon.svg" alt="Recosite Logo" width="128" height="128">
  <h1>Recosite</h1>
  <p>A powerful browser extension for capturing web pages as images and recording screen interactions as videos</p>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Coming%20Soon-orange.svg)](https://github.com/hehehai/recosite)
  [![Firefox Add-ons](https://img.shields.io/badge/Firefox-Coming%20Soon-orange.svg)](https://github.com/hehehai/recosite)
</div>

## 📖 Introduction

Recosite is a modern, feature-rich browser extension that enables you to capture web pages in multiple ways - from simple viewport screenshots to full-page scrolling captures and precise selection-based captures. It also supports recording web interactions as videos with advanced format conversion capabilities.

## 🎥 Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/259f304c-c2e9-4a95-9a42-552a5de7e2c3" width="70%"> </video>
</div>


> Watch a quick demonstration of Recosite's screenshot and video recording features in action.

## ✨ Features

### Screenshot Capabilities
- **📸 Viewport Screenshot** - Capture the currently visible area instantly
- **📄 Full-Page Screenshot** - Automatically scroll and stitch the entire page
- **✂️ Selection Screenshot** - Drag to select and capture any specific region
- **🎨 Multiple Formats** - Export as PNG or JPEG with quality control
- **📐 Size Adjustment** - Resize images with preset scales (0.25x to 3x) or custom dimensions
- **👁️ Live Preview** - Compare original and adjusted sizes before export

### Video Recording
- **🎥 Tab Recording** - Record any browser tab with audio support
- **📹 Resolution Control** - Choose from AUTO, 720p (HD), 1080p (FHD), or 4K (UHD) recording quality
- **🔄 Format Conversion** - Convert to MP4, MOV, WebM, or GIF
- **📊 Metadata Extraction** - View detailed video information (codec, resolution, bitrate, etc.)
- **📐 Video Resizing** - Adjust video dimensions with the same flexible sizing options as images
- **⚡ High Performance** - Powered by MediaBunny for efficient processing
- **💾 Persistent Settings** - Recording preferences saved across sessions

### User Experience
- **🎯 Intuitive UI** - Clean, modern interface with dark mode support
- **📦 Automatic Download** - Smart file naming and instant downloads
- **🔔 Toast Notifications** - Friendly feedback for all operations
- **📱 Responsive Design** - Works seamlessly across different screen sizes
- **🎬 Custom Video Player** - Built-in player with advanced playback controls

## 📸 Screenshots

> Coming soon

## 🌐 Supported Browsers

- **Chrome** - Version 88 and above (Manifest V3)
- **Edge** - Version 88 and above (Manifest V3)
- **Firefox** - Support coming soon

## 📥 Installation

### From Web Store

> Chrome Web Store and Firefox Add-ons store listings are coming soon!

### Manual Installation (Development)

1. Download the latest release from [Releases](https://github.com/hehehai/recosite/releases)
2. Extract the ZIP file
3. Open your browser's extensions page:
   - **Chrome**: Navigate to `chrome://extensions/`
   - **Edge**: Navigate to `edge://extensions/`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the extracted folder

## 🛠️ Development

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- A Chromium-based browser (Chrome, Edge, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/hehehai/recosite.git
cd recosite

# Install dependencies
npm install
```

### Development Server

```bash
# Start development server for Chrome
npm run dev

# Start development server for Firefox
npm run dev:firefox
```

Then load the extension:
1. Open `chrome://extensions/` (or `about:debugging#/runtime/this-firefox` for Firefox)
2. Enable "Developer mode"
3. Click "Load unpacked extension"
4. Select the `.output/chrome-mv3` directory (or `.output/firefox-mv2` for Firefox)

### Build

```bash
# Build for production (Chrome)
npm run build

# Build for production (Firefox)
npm run build:firefox

# Package as ZIP for store submission
npm run zip
npm run zip:firefox
```

### Code Quality

```bash
# Format and lint code
npm run check

# Type checking
npm run compile
```

## 🏗️ Tech Stack

- **[WXT](https://wxt.dev/)** - Modern browser extension framework
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Biome](https://biomejs.dev/)** - Fast code formatter and linter
- **[MediaBunny](https://github.com/TrebledJ/mediabunny)** - Web-based media processing
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling

## 📁 Project Structure

```
recosite/
├── src/
│   ├── app/                      # Application entry points
│   │   ├── background.ts        # Background service worker
│   │   ├── offscreen/           # Offscreen document for recording
│   │   ├── popup/               # Extension popup UI
│   │   └── result/              # Result page for viewing captures
│   │       └── components/      # Result page components
│   │           ├── ExportSizeSettings.vue  # Size adjustment UI
│   │           └── VideoPlayer.vue         # Custom video player
│   ├── components/              # Reusable Vue components
│   │   ├── SelectionTool.vue   # Visual selection tool
│   │   └── Toast.vue           # Notification component
│   ├── composables/             # Vue composition functions
│   │   ├── useImageExport.ts   # Image export logic
│   │   ├── useVideoExport.ts   # Video conversion logic
│   │   ├── useVideoMetadata.ts # Video metadata extraction
│   │   ├── useExportSize.ts    # Size adjustment logic
│   │   ├── useRecordingState.ts # Recording state management
│   │   └── useToast.ts         # Toast notification system
│   ├── content-scripts/         # Content scripts
│   │   └── selection.ts        # Selection tool injection
│   ├── constants/               # Shared constants
│   │   └── export-size.ts      # Export size presets and limits
│   ├── types/                   # TypeScript type definitions
│   │   ├── screenshot.ts       # Screenshot and recording types
│   │   └── bridge.d.ts         # Message bridge types
│   └── utils/                   # Utility functions
│       ├── screenshot.ts       # Screenshot capture utilities
│       ├── recording.ts        # Video recording utilities
│       ├── canvas.ts           # Canvas manipulation
│       └── file.ts             # File handling
├── public/                      # Static assets
├── wxt.config.ts               # WXT configuration
└── package.json                # Project dependencies
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please make sure to:
- Follow the existing code style
- Run `npm run check` before committing
- Update documentation as needed
- Write meaningful commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WXT](https://wxt.dev/) - For the amazing browser extension framework
- [MediaBunny](https://github.com/TrebledJ/mediabunny) - For powerful media processing capabilities
- [Vue.js](https://vuejs.org/) - For the reactive UI framework
- All contributors who help improve this project

## 💖 Support

If you find this project helpful, please consider:
- ⭐ Starring the repository on GitHub
- 🐛 Reporting bugs or suggesting features through [Issues](https://github.com/hehehai/recosite/issues)
- 📢 Sharing it with others who might find it useful
- ☕ [Buying me a coffee](https://github.com/hehehai) (Coming soon)

## 📮 Contact

- GitHub: [@hehehai](https://github.com/hehehai)
- Issues: [GitHub Issues](https://github.com/hehehai/recosite/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/hehehai">hehehai</a>
  <br>
  <a href="#-recosite">⬆️ Back to top</a>
</div>
