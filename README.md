<div align="center">
  <img src="public/icon.svg" alt="Recosite Logo" width="128" height="128">
  <h1>Recosite</h1>
  <p>Browser extension for capturing web pages and recording screen interactions</p>

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Available-brightgreen.svg)](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk)
[![CI](https://github.com/hehehai/recosite/workflows/CI/badge.svg)](https://github.com/hehehai/recosite/actions/workflows/ci.yml)
[![Release](https://github.com/hehehai/recosite/workflows/Release/badge.svg)](https://github.com/hehehai/recosite/actions/workflows/release.yml)

</div>

## Overview

Capture web pages as images (viewport, full-page) and record screen interactions as videos with format conversion support.

## Demo

<div align="center">
  <video src="https://github.com/user-attachments/assets/11268c23-bda1-4c17-894e-f3c0bfd456ca" width="70%"> </video>
</div>

## Features

**Screenshots**

- Viewport and full-page capture
- PNG/JPEG export with quality control
- Resize with presets (0.25x-3x) or custom dimensions
- Live preview before export

**Video Recording**

- Record tab or window
- Resolution: AUTO, 720p, 1080p, 4K
- System audio support
- Auto-stop detection
- Convert to MP4, MOV, WebM, or GIF
- Metadata extraction and video resizing
- Portrait video display optimization

**Page Information**

- Favicon copy and download functionality
- Page metadata extraction (title, description, og:image)
- Meta tags export

**UI/UX**

- Clean unified interface with dark mode
- Instant downloads with smart file naming
- Status notifications and custom video player
- Optimized storage management

## Installation

**Chrome Web Store** (Recommended)

[Install from Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk)

**Manual Installation**

1. Download from [Releases](https://github.com/hehehai/recosite/releases)
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extracted folder

> **Browsers**: Chrome 88+. Firefox and Edge support coming soon.

## Releases

This project uses **automated version management** powered by [Semantic Release](https://github.com/semantic-release/semantic-release) and GitHub Actions.

### Automated Version Management

Every push to the `main` branch triggers an automated workflow:

1. **Commit Analysis** - Analyzes commit messages using [Conventional Commits](https://www.conventionalcommits.org/)
2. **Version Bump** - Automatically determines the next version number:
   - `fix:` commits → Patch release (1.0.**x**)
   - `feat:` commits → Minor release (1.**x**.0)
   - `BREAKING CHANGE:` → Major release (**x**.0.0)
3. **Changelog Generation** - Updates [CHANGELOG.md](CHANGELOG.md) with release notes
4. **GitHub Release** - Creates a draft release with version tag

### Manual Build and Publish

After Semantic Release creates a new version, manually trigger the **Build and Publish** workflow:

1. Go to [GitHub Actions](https://github.com/hehehai/recosite/actions)
2. Select **Build and Publish** workflow
3. Click **Run workflow** → Select the version tag (e.g., `v1.0.1`) → **Run workflow**
4. The workflow will:
   - Build all browser packages (Chrome, Firefox, Edge)
   - Upload packages to the GitHub Release
   - Publish Chrome extension to [Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk)

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature (triggers minor release)
- `fix`: Bug fix (triggers patch release)
- `docs`: Documentation changes (no release)
- `style`: Code style changes (no release)
- `refactor`: Code refactoring (triggers patch release)
- `perf`: Performance improvements (triggers patch release)
- `test`: Test changes (no release)
- `chore`: Maintenance tasks (no release)
- `ci`: CI/CD changes (no release)

**Examples:**

```bash
# Patch release (1.0.x)
git commit -m "fix: resolve screenshot capture issue in dark mode"

# Minor release (1.x.0)
git commit -m "feat: add GIF export support with quality control"

# Major release (x.0.0)
git commit -m "feat: redesign recording architecture

BREAKING CHANGE: minimum Chrome version is now 90+, old recordings format is not supported"

# No release
git commit -m "docs: update installation instructions"
git commit -m "chore: update dependencies"
```

### Download

#### Chrome

- **Recommended**: Install from [Chrome Web Store](https://chromewebstore.google.com/detail/recosite/cajchbamocblcjllnllipgpioahkhlhk) (auto-updates)
- **Manual**: Download from [GitHub Releases](https://github.com/hehehai/recosite/releases/latest)

#### Firefox

- Download latest version from [GitHub Releases](https://github.com/hehehai/recosite/releases/latest)
- Extract ZIP and load as temporary add-on in `about:debugging`

#### Edge

- Download latest version from [GitHub Releases](https://github.com/hehehai/recosite/releases/latest)
- Extract ZIP and load in developer mode

### Version History

- **Releases**: https://github.com/hehehai/recosite/releases
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **CI/CD Status**: [GitHub Actions](https://github.com/hehehai/recosite/actions)

## Development

**Setup**

```bash
git clone https://github.com/hehehai/recosite.git
cd recosite
npm install
```

**Commands**

```bash
# Development
npm run dev              # Start dev server (Chrome)
npm run dev:firefox      # Start dev server (Firefox)
npm run dev:edge         # Start dev server (Edge)

# Building
npm run build            # Production build (Chrome)
npm run build:firefox    # Production build (Firefox)
npm run build:edge       # Production build (Edge)

# Packaging
npm run zip              # Package for Chrome Web Store
npm run zip:firefox      # Package for Firefox
npm run zip:edge         # Package for Edge Add-ons

# Code Quality
npm run check            # Format and lint with Oxlint/Oxfmt
npm run compile          # TypeScript type checking
```

**Load Extension (Chrome)**

1. Run `npm run dev` to start the development server
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `.output/chrome-mv3` directory

**Load Extension (Firefox)**

1. Run `npm run dev:firefox`
2. Open `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file in the `.output/firefox-mv3` directory

**Load Extension (Edge)**

1. Run `npm run dev:edge`
2. Open `edge://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `.output/edge-mv3` directory

**Requirements**: Node.js 18+, pnpm 10.14.0+

## Tech Stack

- **Framework**: [WXT](https://wxt.dev/) (Manifest V3), [Vue 3](https://vuejs.org/), TypeScript
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [UnoCSS Icons](https://unocss.dev/presets/icons)
- **Media**: [MediaBunny](https://github.com/TrebledJ/mediabunny) (video conversion)
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
