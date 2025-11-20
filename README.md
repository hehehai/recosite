<div align="center">
  <img src="public/icon.svg" alt="Recosite Logo" width="128" height="128">
  <h1>Recosite</h1>
  <p>A powerful browser extension for capturing web pages as images and recording screen interactions as videos</p>

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Chrome Web Store](https://img.shields.io/badge/Chrome-Coming%20Soon-orange.svg)](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk?hl=zh-CN&authuser=0)
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
- **🎨 DOM Element Capture** - Click to select and capture any DOM element precisely
- **🖼️ Multiple Formats** - Export as PNG or JPEG with quality control
- **📐 Size Adjustment** - Resize images with preset scales (0.25x to 3x) or custom dimensions
- **👁️ Live Preview** - Compare original and adjusted sizes before export

### Video Recording
- **🎥 Page Recording** - Record any browser tab with audio support
- **🪟 Window Recording** - Capture specific application windows
- **🖥️ Desktop Recording** - Record entire screen with system audio
- **📹 Resolution Control** - Choose from AUTO, 720p (HD), 1080p (FHD), or 4K (UHD) recording quality
- **🎙️ Audio Options** - Control system audio, microphone, and camera settings
- **🔴 Auto-Stop Detection** - Automatically stop recording when user clicks "Stop Sharing"
- **🔄 Format Conversion** - Convert to MP4, MOV, WebM, or GIF
- **📊 Metadata Extraction** - View detailed video information (codec, resolution, bitrate, etc.)
- **📐 Video Resizing** - Adjust video dimensions with the same flexible sizing options as images
- **⚡ High Performance** - Powered by MediaBunny for efficient processing
- **💾 Persistent Settings** - Recording preferences saved across sessions

### User Experience
- **🎯 Intuitive UI** - Clean, modern interface with dark mode support
- **📦 Automatic Download** - Smart file naming and instant downloads
- **🔔 Status Notifications** - Collapsible status cards with friendly feedback
- **📱 Responsive Design** - Works seamlessly across different screen sizes
- **🎬 Custom Video Player** - Built-in player with advanced playback controls
- **⚡ Type-Safe Development** - Built with TypeScript for reliability

## 📸 Screenshots

> Coming soon

## 🌐 Supported Browsers

- **Chrome** - Version 88 and above (Manifest V3)
  - ✅ Available on [Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk?hl=zh-CN&authuser=0)
  - Manual installation available for testing
- **Firefox** - Support coming soon
- **Edge** - Version 88 and above (Manifest V3) - Coming soon

> **Note**: This extension is currently available for Chrome via the Chrome Web Store. Firefox and Edge support will be added in future releases.

## 📥 Installation

### From Chrome Web Store

> ✅ **Status**: Available now on Chrome Web Store.

[Install Recosite from Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk?hl=zh-CN&authuser=0)

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

### Core Framework
- **[WXT](https://wxt.dev/)** - Modern browser extension framework with Manifest V3 support
- **[Vue 3](https://vuejs.org/)** - Progressive JavaScript framework with Composition API
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript for better developer experience

### Styling & UI
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first CSS framework
- **[UnoCSS Icons](https://unocss.dev/presets/icons)** - Pure CSS icons from Iconify

### Media Processing
- **[MediaBunny](https://github.com/TrebledJ/mediabunny)** - Web-based video conversion and processing
- **[Snapdom](https://github.com/zumersalad/snapdom)** - DOM element to image conversion

### Development Tools
- **[Biome](https://biomejs.dev/)** - Fast code formatter and linter
- **[Vite](https://vitejs.dev/)** - Next-generation frontend tooling
- **[webext-bridge](https://github.com/serversideup/webext-bridge)** - Type-safe messaging between extension contexts

### Browser APIs
- **Chrome Extension APIs** - Tab capture, Desktop capture, Offscreen documents
- **MediaStream Recording API** - High-quality video recording
- **Canvas API** - Image manipulation and export

## 📁 Project Structure

```
recosite/
├── src/
│   ├── app/                         # Application entry points
│   │   ├── background.ts           # Background service worker (recording orchestration)
│   │   ├── dom-selector.content.ts # DOM element selection tool
│   │   ├── offscreen/              # Offscreen document for media recording
│   │   │   └── main.ts            # MediaRecorder and stream handling
│   │   ├── popup/                  # Extension popup UI
│   │   │   ├── App.vue            # Main popup component with tabs
│   │   │   └── index.ts           # Popup entry point
│   │   └── result/                 # Result page for viewing captures
│   │       ├── index.ts           # Result page entry
│   │       ├── App.vue            # Result page main component
│   │       └── components/        # Result page components
│   │           ├── ExportSizeSettings.vue  # Size adjustment controls
│   │           ├── ImageResult.vue         # Image preview and export
│   │           ├── VideoPlayer.vue         # Custom video player
│   │           └── VideoResult.vue         # Video preview and export
│   ├── components/                  # Reusable Vue components
│   │   ├── ActionButton.vue        # Action button with loading state
│   │   ├── StatusCard.vue          # Collapsible status notification
│   │   ├── Toast.vue               # Toast notification system
│   │   └── ToggleSwitch.vue        # Toggle switch component
│   ├── composables/                 # Vue composition functions
│   │   ├── useImageExport.ts       # Image format conversion and export
│   │   ├── useVideoExport.ts       # Video format conversion with MediaBunny
│   │   ├── useVideoMetadata.ts     # Video metadata extraction
│   │   ├── useExportSize.ts        # Size adjustment calculations
│   │   ├── useRecordingState.ts    # Recording state management
│   │   ├── useTabPersistence.ts    # Tab state persistence
│   │   └── useToast.ts             # Toast notification management
│   ├── constants/                   # Shared constants
│   │   ├── export-size.ts          # Export size presets and limits
│   │   └── recording.ts            # Recording bitrates and timing
│   ├── types/                       # TypeScript type definitions
│   │   ├── screenshot.ts           # Screenshot and recording types
│   │   └── bridge.d.ts             # Webext-bridge message types
│   └── utils/                       # Utility functions
│       ├── screenshot.ts           # Screenshot capture utilities
│       ├── recording.ts            # Video recording utilities
│       ├── recordingConfig.ts      # Recording configuration helpers
│       ├── recordingState.ts       # Recording state management
│       ├── canvas.ts               # Canvas manipulation
│       ├── file.ts                 # File handling and downloads
│       └── icon.ts                 # Extension icon management
├── public/                          # Static assets
│   ├── icon/                       # Extension icons (16-512px)
│   ├── icon.svg                    # Main icon source
│   └── offscreen.html              # Offscreen document HTML
├── wxt.config.ts                   # WXT framework configuration
├── tailwind.config.ts              # Tailwind CSS configuration
├── uno.config.ts                   # UnoCSS configuration
├── biome.json                      # Biome linter/formatter config
└── package.json                    # Project dependencies
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
- 🤝 Contributing to the project with pull requests

## 📮 Contact

- GitHub: [@hehehai](https://github.com/hehehai)
- Issues: [GitHub Issues](https://github.com/hehehai/recosite/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://github.com/hehehai">hehehai</a>
  <br>
  <a href="#-recosite">⬆️ Back to top</a>
</div>
