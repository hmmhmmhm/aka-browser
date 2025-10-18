<div align="center">

# 📱 aka-browser

### _A Beautiful, Lightweight Mobile Browser for Developers_

**Stop fighting with heavy simulators. Start browsing elegantly.**

<img src="https://i.imgur.com/YhQkOP5.png" alt="aka-browser screenshot" width="600"/>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-Castlabs-47848F.svg)](https://github.com/castlabs/electron-releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)

[Features](#-key-features) • [Installation](#-installation--development) • [Building](#building-for-production) • [DRM Support](#-drm-content-playback)

</div>

---

## 🎯 Why aka-browser?

Tired of Xcode Simulator eating your RAM and spinning up your fans just to preview a mobile website? **aka-browser** is your answer.

Built for developers who need a **lightweight, beautiful, and functional** mobile browser without the bloat. Preview your responsive designs, test mobile interactions, and even watch Netflix—all in an elegant iPhone 15 Pro frame that won't slow down your MacBook.

### The Problem with Simulators

- 🔥 **High CPU usage** → Laptop heating, fan noise, battery drain
- 💾 **Memory hungry** → 2-4GB RAM just for a browser preview
- 🐌 **Slow startup** → Wait 30+ seconds to launch
- 🚫 **No DRM support** → Can't test streaming services
- 🎪 **Feature overload** → 90% of features you'll never use

### The aka-browser Solution

- ⚡ **Lightweight** → ~200MB RAM, instant startup
- 🎨 **Beautiful UI** → Realistic iPhone 15 Pro frame with Dynamic Island
- 🎬 **Netflix ready** → Full Widevine DRM support
- 🛠️ **DevTools built-in** → Chrome DevTools at your fingertips
- 🎯 **Developer-focused** → Only the features you actually need

## ✨ Key Features

<table>
<tr>
<td width="50%">

### 🖥️ **Browser Essentials**

- 📑 **Multi-tab browsing** with visual switcher
- 🖼️ **Tab previews** via auto-screenshots
- 👆 **Trackpad gestures** for navigation
- 🎨 **Dynamic theme colors** with LRU cache
- 🤖 **Smart user agent** switching (mobile/desktop)

</td>
<td width="50%">

### 🎬 **DRM Content Ready**

- 🍿 **Netflix, Disney+, Prime Video** support
- 🔐 **Widevine CDM** integration
- ✍️ **Castlabs EVS** signed for production
- 📦 **Packaged builds** for DRM validation

</td>
</tr>
<tr>
<td width="50%">

### 🎨 **Beautiful Interface**

- 📱 **iPhone 15 Pro frame** with Dynamic Island
- ⚛️ **React 18** + Vite + TailwindCSS
- 🌓 **System theme** detection (light/dark)
- ✨ **Smooth animations** with optimized rendering

</td>
<td width="50%">

### 🛠️ **Developer Tools**

- 🔍 **Chrome DevTools** (Cmd+Option+I)
- 🎯 **Element inspector** via right-click
- 🔗 **URL bar** with title/domain display
- 🖥️ **System tray** with always-on-top

</td>
</tr>
</table>

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
Production Build  →  ✅ Full DRM support
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

Perfect for developers who:

- ✅ Need a **lightweight mobile preview** tool
- ✅ Want to **test responsive designs** without simulator overhead
- ✅ Work in **cafes or public spaces** and want an elegant setup
- ✅ Need to **test DRM content** (Netflix, streaming services)
- ✅ Value **performance over feature bloat**
- ✅ Prefer **instant startup** over waiting for Xcode

## 🛠️ Development Philosophy

This project prioritizes **pragmatism over perfection**:

- 🎯 **Usability first** → Functional tool, not a full-featured browser
- ⚡ **Performance matters** → Lightweight, fast, efficient
- 🔐 **Security-first** → Comprehensive IPC validation
- 🧩 **Core features only** → What developers actually need

## 📄 License

MIT License - feel free to use, modify, and distribute.

## 👨‍💻 Author

**hmmhmmhm**

---

<div align="center">

**⭐ Star this repo if you find it useful!**

Made with ❤️ for developers who deserve better tools

</div>
