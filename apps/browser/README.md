# aka-browser - Browser App

A lightweight, elegant web browser built with Electron featuring an iPhone frame interface and DRM support for streaming services.

## Overview

aka-browser is a developer-focused Electron browser that provides a mobile-like browsing experience on desktop. It uses **@castlabs/electron-releases** for Widevine CDM support, enabling playback of DRM-protected content from services like Netflix.

## Key Features

### 🎨 UI/UX
- **iPhone Frame Interface**: Simulates an iPhone device with realistic bezels and rounded corners
- **Dynamic Status Bar**: Adapts background color based on webpage theme-color meta tag
- **Theme Color Caching**: LRU cache system prevents white flashes during navigation
- **Safe Area Support**: Polyfills CSS `env(safe-area-inset-*)` for web content
- **Modern Design**: Backdrop blur effects and smooth animations

### 🔒 DRM & Media
- **Widevine CDM Support**: Plays DRM-protected content (Netflix, Disney+, etc.)
- **Automatic CDM Download**: Component Updater handles Widevine installation
- **EVS Signing**: VMP (Verified Media Path) signing for production builds
- **Media Permissions**: Configured for camera, microphone, and DRM playback

### 🌐 Browser Features
- **Multi-Tab Support**: Manage multiple web views with tab switching
- **Smart User Agent**: Automatically switches between mobile/desktop UA based on domain
  - Default: iPhone 15 Pro (mobile)
  - Netflix: macOS Chrome (desktop)
- **URL Security**: Protocol validation and dangerous URL blocking
- **Navigation Controls**: Back, forward, reload, and URL bar

### 🛠️ Developer Tools
- **TypeScript**: Full type safety across main, renderer, and preload scripts
- **React + Vite**: Modern frontend tooling with hot reload
- **TailwindCSS**: Utility-first styling with v4
- **IPC Communication**: Type-safe inter-process communication

## Project Structure

```
apps/browser/
├── src/
│   ├── main.ts                    # Electron main process (window, tabs, IPC)
│   ├── preload.ts                 # Main window preload script
│   ├── status-bar-preload.ts      # Status bar preload script
│   ├── webview-preload.ts         # Web content preload (theme color, safe area)
│   ├── renderer/                  # React UI
│   │   ├── src/
│   │   │   ├── App.tsx           # Main React component
│   │   │   └── main.tsx          # React entry point
│   │   └── index.html            # HTML template
│   └── types/                     # TypeScript type definitions
├── scripts/
│   ├── evs-sign.js               # EVS VMP signing script
│   └── setup-evs.sh              # EVS environment setup
├── assets/                        # App icons
├── dist/                          # Compiled main/preload scripts
├── dist-renderer/                 # Built React app
└── package.json
```

## Development

### Prerequisites

- **Node.js**: v18 or higher
- **pnpm**: v8 or higher
- **Python 3**: Required for EVS signing (production builds only)

### Setup

```bash
# Install dependencies (from project root)
pnpm install

# First run: Download Widevine CDM
cd apps/browser
pnpm dev
```

On first launch, Electron will automatically download Widevine CDM to:
```
~/Library/Application Support/@aka-browser/browser/WidevineCdm/
```

### Development Commands

```bash
# Run in development mode (hot reload enabled)
pnpm dev

# Build all components
pnpm build

# Build individual components
pnpm build:main          # Main process TypeScript
pnpm build:webview       # Webview preload TypeScript
pnpm build:renderer      # React UI

# Watch mode for development
pnpm build:main:watch
pnpm build:webview:watch

# Type checking
pnpm check-types

# Start Electron without rebuilding
pnpm start:electron
```

### Production Build

```bash
# Setup EVS for Widevine signing (one-time)
pnpm evs:setup

# Verify EVS configuration
pnpm evs:verify

# Build and package the app
pnpm package
```

The packaged app will be in `release/` directory.

## Architecture

### Process Model

aka-browser uses Electron's multi-process architecture:

1. **Main Process** (`main.ts`)
   - Creates and manages BrowserWindow
   - Handles tab creation and switching
   - Manages WebContentsView instances
   - Implements theme color caching (LRU, max 100 domains)
   - Waits for Widevine CDM via `components.whenReady()`

2. **Renderer Process** (`renderer/`)
   - React-based UI for controls and frame
   - Communicates with main process via IPC
   - Handles user input (URL, navigation buttons)

3. **Preload Scripts**
   - `preload.ts`: Exposes IPC APIs to renderer
   - `status-bar-preload.ts`: Handles status bar theme updates
   - `webview-preload.ts`: Injects safe area polyfill and extracts theme colors

### Key Components

#### Theme Color System
- Extracts `theme-color` meta tag from web pages
- Caches colors by domain (LRU cache, max 100 entries)
- Applies cached color immediately on navigation start
- Updates when new theme color is detected

#### Safe Area Polyfill
- Injects CSS variables: `--safe-area-inset-top/left/bottom/right`
- Overrides `CSS.supports()` for `env()` function
- Patches stylesheets to replace `env()` with pixel values
- Portrait: top=58px, Landscape: left=58px

#### User Agent Switching
- Default: iPhone 15 Pro user agent
- Netflix domains: macOS Chrome user agent
- Applied on tab creation, navigation, and programmatic loads

## DRM Support (Widevine)

### How It Works

1. **Electron Distribution**: Uses `@castlabs/electron-releases` instead of standard Electron
2. **Component Updater**: Automatically downloads Widevine CDM on first run
3. **EVS Signing**: Production builds are signed with VMP for L3 DRM
4. **Runtime Verification**: Checks `navigator.requestMediaKeySystemAccess('com.widevine.alpha')`

### EVS Setup (Production Only)

```bash
# Install castlabs-evs
pip3 install --break-system-packages castlabs-evs

# Configure EVS account
# Edit ~/.config/evs/config.json:
{
  "Auth": {
    "AccountName": "your-account-name"
  }
}

# Verify setup
pnpm evs:verify
```

### Build Process

1. **Copy Widevine CDM**: From Application Support to app bundle
2. **Verify EVS**: Check Python 3, castlabs-evs, and account config
3. **Sign with VMP**: Apply EVS signature to enable DRM

### Troubleshooting

- **CDM not found**: Run `pnpm dev` first to download CDM
- **EVS signing fails**: Check Python 3 and `~/.config/evs/config.json`
- **DRM playback fails**: Check console for Widevine verification logs

## Configuration

### Electron Builder

Key settings in `package.json`:

```json
{
  "build": {
    "electronDist": "node_modules/electron/dist",
    "electronVersion": "38.0.0",
    "asarUnpack": ["**/WidevineCdm/**/*"],
    "afterPack": "scripts/evs-sign.js"
  }
}
```

### Security

- **Protocol Validation**: Only `http:`, `https:` allowed (+ `file:` in dev)
- **Dangerous Protocols Blocked**: `javascript:`, `data:`, `vbscript:`, `about:`, `blob:`
- **Sandbox**: Disabled for Widevine compatibility
- **Context Isolation**: Enabled with secure IPC bridge

## Known Limitations

1. **WebContentsView Border Radius**: Cannot set individual corner radius (all corners or none)
2. **Native View Z-Order**: WebContentsView always renders above HTML layers
3. **Safe Area Polyfill**: Requires viewport-fit=cover in web pages
4. **EVS Account**: Required for production DRM builds

## Testing

### Manual Testing Checklist

- [ ] Launch app and verify Widevine CDM loads
- [ ] Navigate to Netflix and test video playback
- [ ] Check theme color updates on different websites
- [ ] Test tab creation and switching
- [ ] Verify safe area insets in web content
- [ ] Test back/forward navigation
- [ ] Check URL bar input and validation

### Debug Logs

Enable verbose logging:
```bash
# Check Widevine status
# Logs appear in console on app startup:
# [Widevine] Electron version: ...
# [Component] Waiting for Widevine CDM...
# [Component] ✓ Ready after XXXms
```

## Contributing

1. Follow existing code style (TypeScript strict mode)
2. Test DRM functionality before submitting PRs
3. Update README for new features
4. Ensure EVS signing works for production builds

## License

MIT

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [castlabs Electron Releases](https://github.com/castlabs/electron-releases)
- [Widevine CDM Documentation](https://www.widevine.com/)
- [EVS Documentation](https://castlabs.com/evs/)
