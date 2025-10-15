import { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, globalShortcut, nativeTheme, WebContentsView } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isAlwaysOnTop = false;
let webContentsView: WebContentsView | null = null; // WebContentsView for embedded content

// iPhone 15 Pro dimensions
const IPHONE_WIDTH = 393;
const IPHONE_HEIGHT = 852;
const FRAME_PADDING = 28; // 14px border on each side
const TOP_BAR_HEIGHT = 52;

// iPhone 15 Pro User Agent
const IPHONE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Setup WebContentsView event handlers
function setupWebContentsViewHandlers(view: WebContentsView) {
  const contents = view.webContents;

  // Enable context menu (right-click)
  contents.on('context-menu', (event: any, params: any) => {
    const menu = Menu.buildFromTemplate([
      { label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() },
      { label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() },
      { label: 'Reload', click: () => contents.reload() },
      { type: 'separator' },
      { label: 'Copy', role: 'copy' },
      { label: 'Paste', role: 'paste' },
      { label: 'Select All', role: 'selectAll' },
      { type: 'separator' },
      { label: 'Inspect Element', click: () => {
        contents.inspectElement(params.x, params.y);
        // Ensure DevTools opens in detached mode
        if (contents.isDevToolsOpened() && !contents.isDevToolsFocused()) {
          contents.closeDevTools();
          setTimeout(() => contents.openDevTools({ mode: 'detach' }), 100);
        }
      }},
    ]);
    menu.popup();
  });

  contents.on("will-navigate", (event: any, navigationUrl: string) => {
    // Navigation event - can add custom logic here
  });

  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Deny opening new windows
    return { action: "deny" };
  });

  // Handle render process crashes
  contents.on('render-process-gone', (event: any, details: any) => {
    console.error('Render process crashed:', details);
  });

  // Forward WebContents events to renderer process
  contents.on('did-start-loading', () => {
    mainWindow?.webContents.send('webcontents-did-start-loading');
  });

  contents.on('did-stop-loading', () => {
    mainWindow?.webContents.send('webcontents-did-stop-loading');
  });

  contents.on('did-navigate', (event: any, url: string) => {
    mainWindow?.webContents.send('webcontents-did-navigate', url);
  });

  contents.on('did-navigate-in-page', (event: any, url: string) => {
    mainWindow?.webContents.send('webcontents-did-navigate-in-page', url);
  });

  contents.on('dom-ready', () => {
    mainWindow?.webContents.send('webcontents-dom-ready');
  });

  contents.on('did-fail-load', (event: any, errorCode: number, errorDescription: string) => {
    mainWindow?.webContents.send('webcontents-did-fail-load', errorCode, errorDescription);
  });

  contents.on('render-process-gone', (event: any, details: any) => {
    mainWindow?.webContents.send('webcontents-render-process-gone', details);
  });
}

function createWindow(): void {
  // Create the browser window with iPhone frame
  mainWindow = new BrowserWindow({
    width: IPHONE_WIDTH + FRAME_PADDING,
    height: IPHONE_HEIGHT + FRAME_PADDING + TOP_BAR_HEIGHT,
    minWidth: 300,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    transparent: true,
    frame: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    roundedCorners: true,
    resizable: true,
  });

  // Enable swipe navigation gestures on macOS
  if (process.platform === "darwin") {
    mainWindow.on("swipe", (event, direction) => {
      if (direction === "left") {
        // Swipe left = go forward
        mainWindow?.webContents.send("navigate-forward");
      } else if (direction === "right") {
        // Swipe right = go back
        mainWindow?.webContents.send("navigate-back");
      }
    });
  }

  // Alternative: Listen for app-command events (works on macOS with trackpad gestures)
  mainWindow.on("app-command", (event, command) => {
    if (command === "browser-backward") {
      mainWindow?.webContents.send("navigate-back");
    } else if (command === "browser-forward") {
      mainWindow?.webContents.send("navigate-forward");
    }
  });

  // Create WebContentsView for embedded content
  webContentsView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: "persist:main",
    },
  });

  // Set iPhone User Agent
  webContentsView.webContents.setUserAgent(IPHONE_USER_AGENT);

  // Add the WebContentsView to the window
  mainWindow.contentView.addChildView(webContentsView);

  // Load initial URL in WebContentsView
  webContentsView.webContents.loadURL("https://www.google.com");

  // Position and size will be set via IPC from renderer
  // Initial positioning (will be updated by renderer)
  webContentsView.setBounds({ x: 0, y: 0, width: 100, height: 100 });

  // Setup event handlers for WebContentsView
  setupWebContentsViewHandlers(webContentsView);

  // Load the main UI
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }

  // Maintain aspect ratio on resize
  mainWindow.on("will-resize", (event, newBounds) => {
    const aspectRatio =
      (IPHONE_WIDTH + FRAME_PADDING) /
      (IPHONE_HEIGHT + FRAME_PADDING + TOP_BAR_HEIGHT);

    // Get screen dimensions
    const display = screen.getDisplayNearestPoint({
      x: newBounds.x,
      y: newBounds.y,
    });
    const workArea = display.workArea;

    // Calculate new dimensions while maintaining aspect ratio
    let newWidth = newBounds.width;
    let newHeight = Math.round(newWidth / aspectRatio);

    // Limit to screen size with some padding
    const maxWidth = workArea.width - 20;
    const maxHeight = workArea.height - 20;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = Math.round(newWidth / aspectRatio);
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = Math.round(newHeight * aspectRatio);
    }

    event.preventDefault();
    mainWindow?.setBounds({
      ...newBounds,
      width: newWidth,
      height: newHeight,
    });
  });
}

// IPC handlers for window controls
ipcMain.on("window-close", () => {
  // Hide window instead of quitting when tray is active
  if (mainWindow && tray) {
    mainWindow.hide();
  } else {
    app.quit();
  }
});

// IPC handler for opening webview DevTools
ipcMain.on("open-webview-devtools", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.openDevTools({ mode: 'detach' });
  }
});

ipcMain.on("window-minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.on("window-maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// IPC handler for getting system theme
ipcMain.handle("get-system-theme", () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

// Listen for system theme changes and notify renderer
nativeTheme.on('updated', () => {
  const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('theme-changed', theme);
  }
});

// IPC handlers for WebContentsView control
ipcMain.handle("webcontents-load-url", (event, url: string) => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.loadURL(url);
  }
});

ipcMain.handle("webcontents-go-back", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.goBack();
  }
});

ipcMain.handle("webcontents-go-forward", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.goForward();
  }
});

ipcMain.handle("webcontents-reload", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.reload();
  }
});

ipcMain.handle("webcontents-can-go-back", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.canGoBack();
  }
  return false;
});

ipcMain.handle("webcontents-can-go-forward", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.canGoForward();
  }
  return false;
});

ipcMain.handle("webcontents-get-url", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.getURL();
  }
  return "";
});

ipcMain.handle("webcontents-get-title", () => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.getTitle();
  }
  return "";
});

ipcMain.handle("webcontents-execute-javascript", (event, code: string) => {
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.executeJavaScript(code);
  }
  return Promise.reject("WebContentsView not available");
});

ipcMain.handle("webcontents-set-bounds", (event, bounds: { x: number, y: number, width: number, height: number }) => {
  if (webContentsView) {
    webContentsView.setBounds(bounds);
  }
});

// Create tray icon
function createTray(): void {
  // Create tray icon - use original image to preserve transparency
  const iconPath = path.join(__dirname, "../assets/tray-icon.png");
  
  // Create from path and ensure it's loaded properly
  let trayIcon = nativeImage.createFromPath(iconPath);
  
  // If icon is empty, try creating from dataURL to preserve transparency
  if (trayIcon.isEmpty()) {
    console.error("Tray icon not found at:", iconPath);
    // Create a simple fallback icon
    trayIcon = nativeImage.createEmpty();
  }
  
  // For macOS, use template image mode for proper transparency handling
  // Template images automatically handle transparency and adapt to menu bar appearance
  if (process.platform === "darwin") {
    trayIcon.setTemplateImage(true);
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip("Aka Browser");

  // Left click: toggle window visibility (don't show menu)
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  // Right click: show context menu
  tray.on("right-click", () => {
    if (!tray) return;
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Always on Top",
        type: "checkbox",
        checked: isAlwaysOnTop,
        click: () => {
          isAlwaysOnTop = !isAlwaysOnTop;
          if (mainWindow) {
            mainWindow.setAlwaysOnTop(isAlwaysOnTop);
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Open DevTools",
        click: () => {
          if (webContentsView && !webContentsView.webContents.isDestroyed()) {
            webContentsView.webContents.openDevTools({ mode: 'detach' });
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      },
    ]);
    tray.popUpContextMenu(contextMenu);
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  app.setName("Aka Browser");
  
  // Set dock icon for macOS
  if (process.platform === "darwin") {
    const iconPath = path.join(__dirname, "../assets/icon.png");
    const dockIcon = nativeImage.createFromPath(iconPath);
    if (!dockIcon.isEmpty()) {
      app.dock?.setIcon(dockIcon);
    }
  }
  
  createWindow();
  createTray();

  // Register global shortcuts to prevent default refresh behavior
  // Cmd+R (macOS) / Ctrl+R (Windows/Linux)
  globalShortcut.register('CommandOrControl+R', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('webview-reload');
    }
    return true; // Prevent default behavior
  });

  // Also handle F5 key
  globalShortcut.register('F5', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('webview-reload');
    }
    return true; // Prevent default behavior
  });

  // Handle Cmd+Shift+R / Ctrl+Shift+R (hard reload)
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('webview-reload');
    }
    return true; // Prevent default behavior
  });

  // Register Cmd+Shift+I / Ctrl+Shift+I (DevTools) - only in development mode
  if (process.env.NODE_ENV === 'development') {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.toggleDevTools();
      }
      return true; // Prevent default behavior
    });
  }

  app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

// Don't quit when all windows are closed (tray keeps app running)
app.on("window-all-closed", () => {
  // Keep app running in tray
});

// Clean up tray on quit
app.on("before-quit", () => {
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

// Unregister all shortcuts when app quits
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
