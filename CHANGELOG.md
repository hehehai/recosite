# Changelog

All notable changes to this project will be documented in this file.

## [1.2.7](https://github.com/hehehai/recosite/compare/v1.2.6...v1.2.7) (2025-12-03)

### ♻️ Code Refactoring

* integrate build into Semantic Release workflow ([7b95f38](https://github.com/hehehai/recosite/commit/7b95f38a2fc43feb0f36249dd99ea0ed14269a10))

## [1.2.6](https://github.com/hehehai/recosite/compare/v1.2.5...v1.2.6) (2025-12-03)

### ♻️ Code Refactoring

* rename to Build and Release and auto-trigger on tag ([d11b72d](https://github.com/hehehai/recosite/commit/d11b72d290b8abebe6da737e82586f8532bbf4a3))

## [1.2.5](https://github.com/hehehai/recosite/compare/v1.2.4...v1.2.5) (2025-12-03)

### ♻️ Code Refactoring

* remove Chrome Web Store auto-publish ([0dfd3c6](https://github.com/hehehai/recosite/commit/0dfd3c6e3c9a337ad7417ff19946307b0735d72f))

## [1.2.4](https://github.com/hehehai/recosite/compare/v1.2.3...v1.2.4) (2025-12-03)

### 🐛 Bug Fixes

* handle Chrome Web Store auto-publish failure gracefully ([5386999](https://github.com/hehehai/recosite/commit/538699975aa1658d1c248027219c289062287369))

## [1.2.3](https://github.com/hehehai/recosite/compare/v1.2.2...v1.2.3) (2025-12-03)

### 🐛 Bug Fixes

* skip file rename when source and destination are identical ([42bfa0d](https://github.com/hehehai/recosite/commit/42bfa0da52efade8e4e2800e46622b98c3845a84))

## [1.2.2](https://github.com/hehehai/recosite/compare/v1.2.1...v1.2.2) (2025-12-03)

### 🐛 Bug Fixes

* correct bash string substitution syntax in workflow ([93ea6be](https://github.com/hehehai/recosite/commit/93ea6bec0e85493530ded96ef121bcf4bcef23a0))

## [1.2.1](https://github.com/hehehai/recosite/compare/v1.2.0...v1.2.1) (2025-12-03)

### 🐛 Bug Fixes

* support workflow_dispatch with tag input in release workflow ([ae6898d](https://github.com/hehehai/recosite/commit/ae6898dfde50a12a965c3f1efc15a35235bc1a5f))

### 📝 Documentation

* update to semi-automated release process ([939ae84](https://github.com/hehehai/recosite/commit/939ae84cfd84741f88edae34a94b7cd3f8b0aa0b))

## [1.2.0](https://github.com/hehehai/recosite/compare/v1.1.0...v1.2.0) (2025-12-03)

### ✨ Features

* use PAT for semantic-release to trigger workflows ([c17bb16](https://github.com/hehehai/recosite/commit/c17bb16128d877f2c6a31def1713f9f48cc46e38))

### 🐛 Bug Fixes

* add GH_TOKEN environment variable for semantic-release ([23698d5](https://github.com/hehehai/recosite/commit/23698d5fca6144bb131c1ad14e52dff6ba687b61))
* revert to GITHUB_TOKEN temporarily ([6436671](https://github.com/hehehai/recosite/commit/643667179093ba1a24ad42850fb1e393363eaa7e))

### 📝 Documentation

* improve release documentation with detailed workflow and links ([6af2f8a](https://github.com/hehehai/recosite/commit/6af2f8a0b6743298374c67a4020eabeff68ee808))

## [1.1.0](https://github.com/hehehai/recosite/compare/v1.0.1...v1.1.0) (2025-12-03)

### ✨ Features

* add manual trigger support for release workflow ([7275f97](https://github.com/hehehai/recosite/commit/7275f9738aa6538a2d2c24ff75297fa76ae090df))

## [1.0.1](https://github.com/hehehai/recosite/compare/v1.0.0...v1.0.1) (2025-12-03)

### 🐛 Bug Fixes

* improve release workflow and asset descriptions ([d5b1692](https://github.com/hehehai/recosite/commit/d5b16928a841cddae3a6c0dafc5e6100eb84e208))

## 1.0.0 (2025-12-03)

### ✨ Features

* add comprehensive error handling for DOM screenshot encoding errors ([3f0b6ac](https://github.com/hehehai/recosite/commit/3f0b6ac8d1181257391063cc1db6a5c22df78ed0))
* add DOM screenshot functionality with SVG export support ([8bc35c4](https://github.com/hehehai/recosite/commit/8bc35c41ac0c9c5c758f4cede485d606d81e5351))
* add image export size adjustment feature ([70b8ac1](https://github.com/hehehai/recosite/commit/70b8ac1348301e8ef98beb069d37b75a1d82b874))
* add internationalization (i18n) support ([bca2bff](https://github.com/hehehai/recosite/commit/bca2bff8aed99b9930adad581fda14efa174031e))
* add MOV format support and remove format label from recording button ([a829269](https://github.com/hehehai/recosite/commit/a8292693a92e6ffd7ab5d28cab16ab8e47faac9f))
* add snapdom placeholders and timeout for robust SVG export ([c975889](https://github.com/hehehai/recosite/commit/c97588997c96b2a2a46f471bf58f94f0633d09d5))
* add video export size adjustment and page recording improvements ([f7b5c11](https://github.com/hehehai/recosite/commit/f7b5c11b2308e4382ac0d73402410f9b2ca1a7d3))
* implement automated release with semantic-release ([627b2ae](https://github.com/hehehai/recosite/commit/627b2aed2ea8d473914c7e04809fc8d7d7e47a67))
* implement camera resolution selection for video recording ([132e201](https://github.com/hehehai/recosite/commit/132e201b057a95736c557b84e011fe227f73bd9e))
* implement desktop recording and enhance StatusCard with collapsible UI ([c0436e1](https://github.com/hehehai/recosite/commit/c0436e1360d42a22cd6030c37765f2e32638cb26))
* implement SVG export with dom-to-svg library ([aa22744](https://github.com/hehehai/recosite/commit/aa22744d871a7b48d4d476b156662f4ad1b58671))
* implement video recording result page with format conversion ([4d77c69](https://github.com/hehehai/recosite/commit/4d77c696e342e19c816d5a6c09a51d7cc6aff6ed))
* improve recording UI and optimize result page ([1a28b43](https://github.com/hehehai/recosite/commit/1a28b435d816e74d215162c3b132967fce9c69d1))
* update project icon and add multi-size PNG exports ([554b809](https://github.com/hehehai/recosite/commit/554b809e803e12fe8a84e4e62e5c4ef9dbfb6ca3))
* update project icon and add multi-size PNG exports ([1dd7352](https://github.com/hehehai/recosite/commit/1dd7352fe80f15399be8c7399977d73e05186709))

### 🐛 Bug Fixes

* add missing conventional-changelog-conventionalcommits dependency ([a2d6096](https://github.com/hehehai/recosite/commit/a2d6096db3bb9ae1e31837f6631b018cb9c5dd03))
* add type annotation for outputFormat and exclude demo files from linter ([7654f4e](https://github.com/hehehai/recosite/commit/7654f4e321c7ee2cd08e42254967e30fef3de2ea))
* add type assertion for CAPTURE_DOM message data ([0624a7a](https://github.com/hehehai/recosite/commit/0624a7ae30d60246b0df1399aadd8e0fe97e0011))
* allow codecString to be nullable in VideoTrack interface ([88fccd0](https://github.com/hehehai/recosite/commit/88fccd034474033b238712088a6a7cf710a24c5d))
* change dom-selector content script from runtime to manifest registration ([e22c3f5](https://github.com/hehehai/recosite/commit/e22c3f5d3a304fb198c23e408cb500b7a70ba2b3))
* correct file paths for runtime.getURL and content script injection ([1bb1f43](https://github.com/hehehai/recosite/commit/1bb1f431a7f25ef29ad3db4347602b82c264ab52))
* correct snapdom library usage for DOM screenshots ([d796144](https://github.com/hehehai/recosite/commit/d79614429a51b0f82f67dc5e0916b5375f6683f0))
* ensure complete UI cleanup after DOM capture ([e27b36b](https://github.com/hehehai/recosite/commit/e27b36b723461ee2af8d0cc77657ec5e3b995795))
* ensure DOM selection UI cleanup happens before capture ([bcec96c](https://github.com/hehehai/recosite/commit/bcec96c7c0bd1f46d2e3f22296c0346d2191e8e5))
* ensure video tracks are included in MP4 conversion ([b8cdc4c](https://github.com/hehehai/recosite/commit/b8cdc4c01c319e5fe5cedd8a33d59ee0d958f470))
* handle undefined tab width/height in recording size calculation ([b67db23](https://github.com/hehehai/recosite/commit/b67db2304d100ba3dd31a3035fdb925daa9bca92))
* implement proper DOM selector content script injection ([11bd153](https://github.com/hehehai/recosite/commit/11bd1530fc4bf68a7c1c3483ab11cf6ca3fbafb6))
* improve SVG export data integrity for DOM screenshots ([3c39021](https://github.com/hehehai/recosite/commit/3c390212ea36fab31d91c9b255649cfe2acc7ced))
* prevent null reference and tool element selection in DOM capture ([d0a4199](https://github.com/hehehai/recosite/commit/d0a4199d1b16faf41260330259a8e1589a7a3d85))
* replace snapdom with correct @zumer/snapdom package ([683a3fd](https://github.com/hehehai/recosite/commit/683a3fd14fae5332b8edc88c854bb741b46c0543))
* resolve lint errors and WXT content script format issues ([47bf6e8](https://github.com/hehehai/recosite/commit/47bf6e8c1143a27f5722ee423f92882d26c2c39a))
* resolve TypeScript errors and improve message type safety ([26addf3](https://github.com/hehehai/recosite/commit/26addf30559e0e2f3fe5b3f0dc3176b02a06519d))
* revert to original popup-based DOM selector injection ([a1b3a32](https://github.com/hehehai/recosite/commit/a1b3a323e092446143239c309534fd869aea87d8))
* sync clipboard copy size with export settings and disable unsupported recording options ([2d0aaf7](https://github.com/hehehai/recosite/commit/2d0aaf7b2cb96394fed6736cff1038fd34715689))

### ⚡ Performance Improvements

* disable snapdom cache for single-shot captures ([dff65a3](https://github.com/hehehai/recosite/commit/dff65a35b19fb46407241e5ff14e06ac3b6987c3))

### ♻️ Code Refactoring

* add type-safe style utility and refactor DOM selector UI ([868dbb8](https://github.com/hehehai/recosite/commit/868dbb8f8ba5db37a2ab2230bc42f08d4c7429d1))
* extract reusable components and composables ([dd0d686](https://github.com/hehehai/recosite/commit/dd0d6860021a1d2554c52137d5305de8bcf34bf2))
* migrate to webext-bridge for cross-context messaging ([2181dcd](https://github.com/hehehai/recosite/commit/2181dcdfe00265d0d16523fdfc3c8a98ede74f05))
* modularize result page with composables and components ([654a852](https://github.com/hehehai/recosite/commit/654a852ba155950460b42a22b07abf113c2e52ae))
* **popup:** redesign UI with tab navigation and responsive layout ([79a75b1](https://github.com/hehehai/recosite/commit/79a75b1d6cceab3128f49e5e5372769489312fc3))
* remove SVG export functionality and simplify DOM capture ([6f3c42e](https://github.com/hehehai/recosite/commit/6f3c42e62144d4e4c5bd8884487aae64445f7f9b))
* 优化录制功能代码结构 ([68fe148](https://github.com/hehehai/recosite/commit/68fe14815661bc8bb42fb5002c24bde8e583e56b))

### 📝 Documentation

* add refactoring documentation ([5a5dc11](https://github.com/hehehai/recosite/commit/5a5dc1142ff811364dbac57d3a461b42950ff26e))
* create comprehensive CLAUDE.md and simplify README ([e6f27ef](https://github.com/hehehai/recosite/commit/e6f27ef69060a6941c859a2f8330e64ff09a869b))
* demo video ([a3b7267](https://github.com/hehehai/recosite/commit/a3b72675ba5926d744dc131ff89f7f3d9a3513f2))
* demo video ([d4e61c6](https://github.com/hehehai/recosite/commit/d4e61c671163683a186f5be28b8223be7ebaa9e5))
* demo video ([1f59f4e](https://github.com/hehehai/recosite/commit/1f59f4e577231c87351f356f2cbe000f1c990cfd))
* rewrite README with comprehensive project information ([fa62b1d](https://github.com/hehehai/recosite/commit/fa62b1db3e26628135709f488d669e0b502bb5bb))
* update ([d0a0aa5](https://github.com/hehehai/recosite/commit/d0a0aa5e9809dfb2e4afffe6f0d2272e3fcc965d))
* update ([91641da](https://github.com/hehehai/recosite/commit/91641daf5b42c26aba5cd69b57d4a843588d4734))
* update Chrome Web Store links and availability status ([aed1d21](https://github.com/hehehai/recosite/commit/aed1d214d5d73b6735ca9cd731f0ffd856be6489))
* update README with comprehensive project information ([c1722d9](https://github.com/hehehai/recosite/commit/c1722d917641393f65538b950f73168bb0c203a4))

This project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and uses [Conventional Commits](https://www.conventionalcommits.org/).
