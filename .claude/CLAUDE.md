# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recosite is a Chrome browser extension (Manifest V3) for capturing web pages as images and recording screen interactions as videos. Built with WXT framework, Vue 3, and TypeScript.

## Development Commands

```bash
# Development
npm run dev              # Start development server for Chrome
npm run dev:firefox      # Start development server for Firefox
npm run dev:edge         # Start development server for Edge

# Building
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run build:edge       # Production build for Edge
npm run zip              # Package as ZIP for Chrome Web Store
npm run zip:firefox      # Package as ZIP for Firefox
npm run zip:edge         # Package as ZIP for Edge Add-ons

# Code Quality
npm run check            # Format and lint with Biome
npm run compile          # TypeScript type checking
```

Load extension during development:

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3` directory

## Architecture

### Extension Entry Points

- **`src/app/background.ts`**: Service worker handling recording orchestration, screenshot capture, and message routing via webext-bridge
- **`src/app/popup/`**: Extension popup UI with tabbed interface (Screenshot/Recording tabs)
- **`src/app/offscreen/main.ts`**: Offscreen document for MediaRecorder and stream handling (required for recording in Manifest V3)
- **`src/app/result/`**: Result page for previewing and exporting captures
- **`src/app/dom-selector.content.ts`**: Content script for DOM element selection
- **`src/app/selection.content.ts`**: Content script for area selection tool

### Message Communication

Uses `webext-bridge` for type-safe cross-context messaging. All message types defined in `src/types/bridge.d.ts`:

- **Popup ↔ Background**: Recording start/stop, screenshot requests
- **Background ↔ Offscreen**: Recording control (start-internal, stop-internal)
- **Background ↔ Content Script**: Selection initiation, DOM capture
- **Content Script → Background**: Capture data transfer

### Recording Architecture

Recording requires coordination between multiple contexts due to Manifest V3 restrictions:

1. **User initiates** (Popup) → sends `recording:start-request` to Background
2. **Background** creates/ensures offscreen document exists, requests media stream
3. **Background** sends stream ID to Offscreen via `recording:start-internal`
4. **Offscreen** receives stream, starts MediaRecorder, monitors for auto-stop
5. **Stop** reverses flow: Offscreen → Background → Popup

Recording state managed in `src/utils/recordingState.ts` and persisted across contexts.

### Screenshot Architecture

Three capture modes:

- **Viewport**: Direct `chrome.tabs.captureVisibleTab()`
- **Full Page**: Scroll-and-stitch using Canvas API (`src/utils/screenshot.ts`)
- **Selection**: Inject content script with selection overlay, capture selected region
- **DOM Element**: Click to select specific element, use snapdom library

### Media Processing

- **Images**: Canvas API for format conversion (PNG/JPEG) and resizing
- **Videos**: MediaBunny library for format conversion (WebM/MP4/MOV/GIF) and resizing
- **Size Adjustment**: Unified system in `src/composables/useExportSize.ts` with presets (0.25x-3x) and custom dimensions

## Key Files and Patterns

### Type Definitions

- `src/types/screenshot.ts`: Core types for RecordingOptions, RecordingState, VideoResolution, ImageFormat
- `src/types/bridge.d.ts`: Webext-bridge message protocol definitions

### Composables (Vue Composition API)

- `useRecordingState.ts`: Recording state synchronization across UI
- `useImageExport.ts`/`useVideoExport.ts`: Format conversion and export logic
- `useExportSize.ts`: Size adjustment calculations
- `useTabPersistence.ts`: Persist tab selections in popup
- `useToast.ts`: Toast notification system

### Constants

- `src/constants/recording.ts`: Bitrates (VIDEO_BITRATE, AUDIO_BITRATE), timing constants, badge text
- `src/constants/export-size.ts`: Size presets, dimension limits

### Utilities

- `src/utils/recording.ts`: Offscreen document management, stream acquisition
- `src/utils/recordingConfig.ts`: MediaRecorder configuration helpers
- `src/utils/screenshot.ts`: Screenshot capture implementations
- `src/utils/file.ts`: File naming and download helpers
- `src/utils/canvas.ts`: Canvas manipulation utilities

## Code Style

Uses Biome with Ultracite presets (`ultracite/core`, `ultracite/vue`). Pre-commit hook runs `pnpm dlx ultracite fix` automatically.

### Key Style Rules

- Use arrow functions over function expressions
- Use `for...of` over `Array.forEach`
- Use `const` for variables only assigned once
- Use `T[]` over `Array<T>`
- No `any` type, non-null assertions, or TS enums
- Vue: Use multi-word component names, avoid React props (`className`/`htmlFor`)
- Prefer `import type` for type-only imports

### WXT Framework Globals

Available in appropriate contexts (defined in biome.jsonc):

- `defineBackground`, `defineContentScript`, `defineUnlistedScript`
- `browser`, `chrome`, `storage`
- `createIframeUi`, `createShadowRootUi`, `createIntegratedUi`

## Common Patterns

### Recording State Management

Recording state must be synchronized between background, popup, and offscreen:

```typescript
// Background maintains source of truth
const recordingStateManager: RecordingStateManager = {
  state: RecordingState.IDLE,
  recordingType: RecordingType.TAB,
  tabId: null,
  currentRecordingOptions: null,
};

// Popup queries state on mount
const status = await sendMessage('recording:get-status', {});
```

### Adding New Message Types

1. Add to `ProtocolMap` in `src/types/bridge.d.ts`
2. Register handler in background.ts with `onMessage()`
3. Send from popup/content script with `sendMessage()`

### Format Conversion

Both image and video exports use unified size adjustment:

```typescript
const { exportSettings, dimensions } = useExportSize(originalWidth, originalHeight);
// Then pass to useImageExport or useVideoExport
```

## Browser API Usage

### Permissions (wxt.config.ts)

- `tabCapture`: Tab content recording
- `desktopCapture`: Window/desktop recording
- `offscreen`: Required for MediaRecorder in Manifest V3
- `storage`: Recording configuration persistence
- `downloads`: File downloads

### MediaStream Constraints

Resolution control via constraints:

```typescript
const constraints = {
  video: {
    mandatory: {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: streamId,
      maxWidth: 1920,
      maxHeight: 1080,
    }
  },
  audio: { ... }
};
```

## Testing Notes

Extension uses `minify: false` in Vite config to avoid UTF-8 encoding issues with Chinese text in manifest.

When testing recording:

- Auto-stop detection tracks stream `onended` events
- Recording badge shows "REC" during active recording
- Icon state managed in `src/utils/icon.ts`

## CI/CD

### GitHub Actions Workflows

The project uses automated CI/CD pipelines with **Semantic Release** for version management:

**CI Workflow** (`.github/workflows/ci.yml`)

- Triggers on push/PR to `main` and `develop` branches
- Runs quality checks: TypeScript compilation and Biome linting
- Builds extension for all browsers (Chrome, Firefox, Edge) in parallel
- Uploads build artifacts for 7 days

**Semantic Release Workflow** (`.github/workflows/semantic-release.yml`)

- Triggers on push to `main` branch
- Analyzes commit messages using Conventional Commits
- Automatically determines version bump (major/minor/patch)
- Updates package.json and CHANGELOG.md
- Creates git tag and draft GitHub Release

**Build and Publish Workflow** (`.github/workflows/release.yml`)

- Triggers manually via GitHub Actions UI (workflow_dispatch)
- Can also be triggered by git tag push
- Runs pre-release quality checks
- Builds and packages all browsers (Chrome, Firefox, Edge)
- Uploads build artifacts to GitHub Release
- Auto-publishes Chrome version to Chrome Web Store
- Firefox and Edge ZIPs available for manual download

### Release Process

**Step 1: Automated Version Management**

No manual version bumping needed! Just push commits with proper format:

1. **Write conventional commit messages**:

   ```bash
   # Bug fix → patch version (0.0.x)
   git commit -m "fix: resolve recording audio sync issue"

   # New feature → minor version (0.x.0)
   git commit -m "feat: add video quality presets"

   # Breaking change → major version (x.0.0)
   git commit -m "feat: redesign settings system

   BREAKING CHANGE: settings API completely changed"
   ```

2. **Push to main branch**:

   ```bash
   git push origin main
   ```

3. **Semantic Release automatically**:
   - Analyzes commits since last release
   - Calculates new version number
   - Updates package.json automatically
   - Generates CHANGELOG.md entry
   - Creates git tag (e.g., v1.2.3)
   - Creates draft GitHub Release with release notes

**Step 2: Manual Build and Publish**

After Semantic Release creates a new version tag:

1. Go to [GitHub Actions](https://github.com/hehehai/recosite/actions)
2. Select **Build and Publish** workflow
3. Click **Run workflow** → Select the version tag (e.g., `v1.0.1`) → **Run workflow**
4. The workflow will:
   - Build all browser packages
   - Upload to GitHub Release
   - Publish Chrome to Chrome Web Store

### Conventional Commits Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format**: `<type>(<scope>): <description>`

**Types** (determines version bump):

- `feat`: New feature (minor bump)
- `fix`: Bug fix (patch bump)
- `perf`: Performance improvement (patch bump)
- `refactor`: Code refactoring (patch bump)
- `docs`: Documentation changes (no release)
- `style`: Code style changes (no release)
- `test`: Test changes (no release)
- `chore`: Maintenance tasks (no release)
- `ci`: CI/CD changes (no release)
- `build`: Build system changes (no release)

**Examples**:

```bash
feat(screenshot): add custom dimension support
fix(recording): resolve memory leak in offscreen document
perf(export): optimize video compression algorithm
refactor(ui): reorganize popup component structure
docs(readme): update installation instructions
test(utils): add unit tests for file naming
chore(deps): update dependencies
```

**Breaking Changes** (major bump):

```bash
feat(api): redesign message protocol

BREAKING CHANGE: all message types have been renamed
```

### Commit Message Best Practices

1. **Use imperative mood**: "add" not "added" or "adds"
2. **Be concise**: Keep subject line under 72 characters
3. **Provide context**: Add body for complex changes
4. **Reference issues**: Use "fixes #123" or "closes #456"

**Good examples**:

```bash
feat(recording): add 4K resolution support

Implements high-resolution recording for users with 4K displays.
Includes automatic downscaling for lower-end devices.

Closes #45
```

```bash
fix(export): prevent crash on large file conversion

The MediaBunny library was timing out for files over 500MB.
Added chunked processing and progress tracking.

Fixes #78
```

### GitHub Secrets Configuration

Required secrets for Chrome Web Store publishing:

- `CHROME_EXTENSION_ID`: Extension ID (cajchbamocblcjllnllipgpioahkhlhk)
- `CHROME_CLIENT_ID`: Google OAuth2 Client ID
- `CHROME_CLIENT_SECRET`: Google OAuth2 Client Secret
- `CHROME_REFRESH_TOKEN`: OAuth2 Refresh Token

### Build Artifacts

- **CI builds**: Retained for 7 days (testing/debugging)
- **Release builds**: Retained for 90 days (production tracking)
- **Output naming**: `recosite-{version}-{browser}.zip`

### Workflow Details

**CI Jobs**:

1. `quality-checks`: TypeScript + Biome validation
2. `build-test`: Matrix build for all browsers (fail-fast: false)
3. `ci-success`: Aggregates results for branch protection

**Semantic Release Jobs**:

1. `release`: Analyzes commits, bumps version, creates tag and GitHub Release

**Build and Publish Jobs**:

1. `quality-checks`: Pre-release validation
2. `build-all-browsers`: Matrix build + ZIP creation (fail-fast: true)
3. `upload-release-assets`: Upload ZIPs to GitHub Release
4. `publish-chrome-web-store`: Auto-publish using `mnao305/chrome-extension-upload@v5.0.0`
5. `build-success`: Verification and next steps

### Notes

- Node.js 20 LTS used in all workflows
- `npm ci` ensures deterministic dependency installs
- Semantic-release automatically creates GitHub Releases (not drafts)
- Chrome Web Store updates typically approved within 1 hour
- First upload may require manual review (can take days)
- CHANGELOG.md is auto-generated and committed by semantic-release
- Version commits include `[skip ci]` to prevent infinite loops

### Skipping Releases

If you need to push to main without triggering a release:

```bash
# Use conventional commit types that don't trigger releases
git commit -m "docs: update README"
git commit -m "chore: update dependencies"
git commit -m "ci: fix workflow syntax"

# Or use [skip release] in commit body
git commit -m "fix: minor typo

[skip release]"
```
