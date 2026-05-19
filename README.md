<div align="center">

# 📱 aka-browser

### _A side browser for PC — always on top, always within reach._

**Your companion browser for Netflix, Twitter(X), and everything in between.**

🌐 **[Visit our website](https://browser.aka.page)** | 📚 **[Technical Wiki](https://deepwiki.com/hmmhmmhm/aka-browser)** | 🚀 **Stage-0 Beta** — Stable release schedule will be announced after beta validation.

<img src="https://i.imgur.com/YhQkOP5.png" alt="aka-browser screenshot" width="600"/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-Castlabs-47848F.svg)](https://github.com/castlabs/electron-releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

[Features](#-key-features) • [Installation](#-installation--development) • [Building](#building-for-production) • [DRM Support](#-drm-content-playback) • [Release Readiness](docs/RELEASE_READINESS.md)

</div>

---

## 🎯 Why aka-browser?

**aka-browser** isn't here to replace your main browser—it's designed to work **alongside it**.

Think of it as your **always-on-top companion** for those moments when you need a second screen but don't have one. Watch Netflix with subtitles (PiP doesn't show them!), keep Twitter open while working, monitor a live stream, or follow a tutorial—all in a beautiful, compact window that stays right where you need it.

### Perfect For

- **Watching Netflix with subtitles** → PiP mode loses subtitles, aka-browser keeps them
- **Following Twitter/X** → Keep your timeline visible while working
- **Monitoring streams** → Twitch, YouTube Live always in view
- **Following tutorials** → Step-by-step guides alongside your code
- **Chat windows** → Discord, Slack, or any web chat always accessible
- **Music controls** → Spotify, YouTube Music at your fingertips

### Why Not Just Use Your Main Browser?

- **Always on top** → Never gets buried under other windows
- **Compact & elegant** → Beautiful iPhone frame that doesn't clutter your screen
- **Purpose-built** → Lightweight, fast, and distraction-free
- **DRM-ready** → Full Widevine support for streaming services
- **Instant access** → Lives in your menu bar, launches immediately

## ✨ Key Features

### 🖥️ **Browser Essentials**

- **Multi-tab browsing** with visual switcher
- **Tab previews** via auto-screenshots
- **Trackpad gestures** for navigation
- **Dynamic theme colors** with LRU cache
- **Smart user agent** switching (mobile/desktop)

### 🎬 **DRM Content Ready**

- **Netflix, Disney+, Prime Video** support
- **Widevine CDM** integration
- **Castlabs EVS** signed for production
- **Packaged builds** for DRM validation

### 🎨 **Beautiful Interface**

- **iPhone 15 Pro frame** with Dynamic Island
- **React 18** + Vite + TailwindCSS
- **System theme** detection (light/dark)
- **Smooth animations** with optimized rendering

### 🛠️ **Developer Tools**

- **Chrome DevTools** (Cmd+Option+I)
- **Element inspector** via right-click
- **URL bar** with title/domain display
- **System tray** with always-on-top

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/hmmhmmhm/aka-browser.git
cd aka-browser

# Install dependencies
pnpm install

# Run in development mode
pnpm run dev
```

That's it! The browser will launch with a beautiful iPhone 15 Pro frame ready for testing.

## 🏗️ Technical Stack

```
┌─────────────────────────────────────────┐
│  Electron (Castlabs + Widevine CDM)    │  ← DRM-ready browser engine
├─────────────────────────────────────────┤
│  React 18 + TypeScript                  │  ← Modern UI framework
├─────────────────────────────────────────┤
│  Vite + TailwindCSS                     │  ← Fast builds, beautiful styles
├─────────────────────────────────────────┤
│  electron-builder + EVS signing         │  ← Production packaging
└─────────────────────────────────────────┘
```

## 📦 Installation & Development

### Prerequisites

| Requirement      | Version | Purpose                           |
| ---------------- | ------- | --------------------------------- |
| **Node.js**      | 18+     | Runtime environment               |
| **pnpm**         | Latest  | Package management (recommended)  |
| **Python 3**     | 3.8+    | EVS signing for DRM builds        |
| **Castlabs EVS** | -       | Production DRM signing (optional) |

### Building for Production

Want to watch Netflix? You'll need a production build:

```bash
# 1️⃣ Setup EVS signing (first time only)
pnpm run evs:setup

# 2️⃣ Verify your configuration
pnpm run evs:verify

# 3️⃣ Build the packaged app
pnpm run package
```

> **⚠️ Important**: Netflix and other streaming services **reject development mode** signatures. You **must** use a packaged build for DRM content.

## 🎬 DRM Content Playback

aka-browser supports **Widevine DRM** out of the box:

```
Development Mode  →  ❌ Netflix won't work
Production Build  →  ✅ Full DRM support (L3 level, software-based without TEE)
```

### How It Works

1. **Widevine CDM** auto-downloads on first run (via Electron Component Updater)
2. **Castlabs EVS** signs the app for production-grade DRM validation
3. **Streaming services** verify the signature and allow playback

### Supported Services

| Service               | Status | Notes                         |
| --------------------- | ------ | ----------------------------- |
| 🍿 **Netflix**        | ✅     | Requires production build     |
| 🏰 **Disney+**        | ✅     | Requires production build     |
| 📦 **Prime Video**    | ✅     | Requires production build     |
| 🎵 **Spotify**        | ✅     | Works in dev mode             |
| 🎬 **Other Widevine** | ✅     | Most require production build |

## 🎯 Who Is This For?

Perfect for **anyone** who:

- ✅ Wants to **watch Netflix with subtitles** while working (PiP doesn't show them!)
- ✅ Needs a **second screen** but only has one monitor
- ✅ Likes to **keep Twitter/social media visible** without tab-switching
- ✅ Follows **live streams or tutorials** while multitasking
- ✅ Values a **clean, elegant interface** over browser clutter
- ✅ Wants **always-on-top** functionality with a beautiful design

**Bonus for developers:**

- 🛠️ Built-in **Chrome DevTools** for testing mobile sites
- 📱 **Lightweight alternative** to heavy iOS simulators
- 🎨 Perfect for **responsive design** previews

## 🛠️ Design Philosophy

This project prioritizes **simplicity and elegance**:

- 🎯 **Companion, not replacement** → Works alongside your main browser
- ⚡ **Lightweight & fast** → Instant startup, minimal resource usage
- 🎨 **Beautiful by default** → iPhone 15 Pro frame with attention to detail
- 🪟 **Always accessible** → Menu bar integration, always-on-top support
- 🧩 **Just enough features** → What you need, nothing you don't

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 👨‍💻 Author

**hmmhmmhm**

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for everyone who needs a better way to multitask

</div>
