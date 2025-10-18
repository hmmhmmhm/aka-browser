# aka-browser

A lightweight, elegant web browser for developers featuring an iPhone frame interface with DRM content support.

## Overview

**aka-browser** is designed specifically for web developers who need a beautiful, lightweight alternative to heavy mobile simulators. Built as a Mac application using Electron, it provides an iPhone-framed browsing experience without the performance overhead of full-featured simulators like Xcode's iPhone Simulator.

## Key Features

### 🎬 DRM Content Playback
- **Full Netflix support** - Stream DRM-protected content including Netflix, Disney+, and other premium streaming services
- **Widevine CDM integration** - Powered by Widevine Content Decryption Module for secure content playback
- **Castlabs EVS signing** - Signed with Castlabs EVS (Electron for Content Security VMP signing) for production-grade DRM support
- **Note**: Netflix requires a packaged build - development mode signatures are rejected by Netflix's DRM validation

### 🖥️ Browser Features
- **Multi-tab browsing** - Full tab management with visual tab switcher overlay
- **Tab previews** - Automatic screenshot capture for visual tab identification
- **Trackpad gestures** - Swipe navigation for intuitive browsing
- **Dynamic theme colors** - Automatic extraction and application of website theme colors with LRU caching
- **Smart user agent** - Automatically switches between mobile (iPhone 15 Pro) and desktop (macOS Chrome) user agents based on site requirements

### 🛠️ Developer Tools
- **DevTools integration** - Full Chrome DevTools support with keyboard shortcuts (Cmd+Option+I)
- **Element inspection** - Right-click context menu for inspecting elements
- **URL bar** - Editable address bar with current page title and domain display
- **System tray** - Quick access with window visibility toggle and always-on-top option

### 🎨 User Interface
- **iPhone 15 Pro frame** - Beautiful, realistic device frame with dynamic island design
- **React-based UI** - Modern, responsive interface built with React and Vite
- **System theme detection** - Automatic adaptation to macOS light/dark mode
- **Smooth animations** - Optimized rendering with minimal performance overhead

## Why aka-browser?

While Xcode's iPhone Simulator offers a polished interface, it comes with significant drawbacks:
- **High memory consumption** that impacts system performance
- **CPU-intensive operations** causing laptop heating and fan noise
- **Overkill functionality** when you only need to preview web content
- **No DRM support** - Cannot play Netflix or other protected content

aka-browser addresses these pain points by offering:
- **Lightweight performance** - minimal resource usage for extended development sessions
- **Elegant design** - a beautiful iPhone frame interface perfect for working in cafes or public spaces
- **Developer-focused** - streamlined for web development workflows without unnecessary simulator features
- **DRM content playback** - Full support for streaming services like Netflix

## Technical Stack

- **Framework**: Electron (Castlabs fork with Widevine support)
- **UI**: React 18 + Vite + TailwindCSS
- **DRM**: Widevine CDM with Castlabs EVS signing
- **Build**: electron-builder with custom EVS integration
- **Language**: TypeScript

## Installation & Development

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Python 3 (for EVS signing)
- Castlabs EVS account (for production builds with DRM)

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm run dev
```

### Building for Production

For DRM content support (Netflix, etc.), you need to build a packaged application:

```bash
# Setup EVS signing (first time only)
pnpm run evs:setup

# Verify EVS configuration
pnpm run evs:verify

# Build packaged application
pnpm run package
```

**Important**: Netflix and some other streaming services reject development mode signatures. You must use a packaged build to play DRM-protected content.

## DRM Content Support

aka-browser uses Widevine CDM (Content Decryption Module) for DRM content playback:

1. **Widevine CDM**: Automatically downloaded on first run via Electron's Component Updater
2. **Castlabs EVS**: Application is signed with Castlabs EVS (Electron for Content Security VMP signing)
3. **Production builds only**: Netflix requires a properly signed production build - development mode will not work

### Supported Streaming Services
- Netflix ✅
- Disney+ ✅
- Amazon Prime Video ✅
- Other Widevine-protected content ✅

## Development Approach

This project takes a pragmatic approach to browser development:
- Built on **Castlabs Electron** framework with Widevine support
- Focus on **usability over completeness** - aiming for a functional, practical tool rather than a full-featured browser
- Iterative development prioritizing core features that matter to web developers
- Security-first design with comprehensive IPC validation

## Target Audience

Web developers who want:
- A visually appealing mobile preview tool for their projects
- Low system resource usage during development
- A portable, cafe-friendly development environment
- Quick mobile viewport testing without simulator overhead
- **DRM content testing** - Test streaming services in a mobile viewport

## License

MIT

## Author

hmmhmmhm
