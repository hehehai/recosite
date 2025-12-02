# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recosite is a Chrome browser extension (Manifest V3) for capturing web pages as images and recording screen interactions as videos. Built with WXT framework, Vue 3, and TypeScript.

## Development Commands

```bash
# Development
npm run dev              # Start development server for Chrome
npm run dev:firefox      # Start development server for Firefox

# Building
npm run build            # Production build for Chrome
npm run build:firefox    # Production build for Firefox
npm run zip              # Package as ZIP for Chrome Web Store
npm run zip:firefox      # Package as ZIP for Firefox

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
