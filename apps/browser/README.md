# aka-browser - Browser App

Electron-based browser application with TypeScript support.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build TypeScript
pnpm build

# Type check
pnpm check-types

# Package the app
pnpm package
```

## Project Structure

```
apps/browser/
├── src/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script
│   └── renderer/        # Renderer process UI
│       └── index.html   # Main UI
├── dist/                # Compiled TypeScript output
├── package.json
└── tsconfig.json
```

## Features

- TypeScript support for Electron
- iPhone frame interface
- BrowserView for web content
- Modern UI with backdrop blur effects
