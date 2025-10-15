import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;

// iPhone 15 Pro dimensions
const IPHONE_WIDTH = 393;
const IPHONE_HEIGHT = 852;
const FRAME_PADDING = 28; // 14px border on each side
const TOP_BAR_HEIGHT = 52;

// iPhone 15 Pro User Agent
const IPHONE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

function createWindow(): void {
  // Create the browser window with iPhone frame
  mainWindow = new BrowserWindow({
    width: IPHONE_WIDTH + FRAME_PADDING,
    height: IPHONE_HEIGHT + FRAME_PADDING + TOP_BAR_HEIGHT,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable webview tag
    },
    transparent: true,
    frame: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    roundedCorners: true,
    resizable: true,
  });

  // Load the main UI
  mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));

  // Maintain aspect ratio on resize
  mainWindow.on('will-resize', (event, newBounds) => {
    const aspectRatio = (IPHONE_WIDTH + FRAME_PADDING) / (IPHONE_HEIGHT + FRAME_PADDING + TOP_BAR_HEIGHT);
    const newWidth = newBounds.width;
    const newHeight = Math.round(newWidth / aspectRatio);
    
    event.preventDefault();
    mainWindow?.setBounds({
      ...newBounds,
      height: newHeight,
    });
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// IPC handlers for window controls
ipcMain.on('window-close', () => {
  app.quit();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

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
  // Set iPhone User Agent for all web contents (including webviews)
  contents.setUserAgent(IPHONE_USER_AGENT);
  
  contents.on('will-navigate', (event: any, navigationUrl: string) => {
    console.log('Navigating to:', navigationUrl);
  });

  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Open links in new window or same webview
    return { action: 'deny' };
  });
});
