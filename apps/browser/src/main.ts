import { app, BrowserWindow } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

// iPhone 15 Pro dimensions
const IPHONE_WIDTH = 393;
const IPHONE_HEIGHT = 852;
const FRAME_PADDING = 20;
const TOP_BAR_HEIGHT = 60;

function createWindow(): void {
  // Create the browser window with iPhone frame
  mainWindow = new BrowserWindow({
    width: IPHONE_WIDTH + FRAME_PADDING * 2,
    height: IPHONE_HEIGHT + FRAME_PADDING * 2 + TOP_BAR_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable webview tag
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1a1a1a',
  });

  // Load the main UI
  mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle navigation
app.on('web-contents-created', (event: any, contents: any) => {
  contents.on('will-navigate', (event: any, navigationUrl: string) => {
    console.log('Navigating to:', navigationUrl);
  });

  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Open links in new window or same webview
    return { action: 'deny' };
  });
});
