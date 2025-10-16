import {
  app,
  BrowserWindow,
  ipcMain,
  screen,
  Menu,
  Tray,
  nativeImage,
  globalShortcut,
  nativeTheme,
  WebContentsView,
} from "electron";
import path from "path";
import fs from "fs";

// URL validation and security
const ALLOWED_PROTOCOLS = process.env.NODE_ENV === "development" 
  ? ["http:", "https:", "file:"]
  : ["http:", "https:"];

// Dangerous protocols that should always be blocked
const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "about:",
  "blob:",
];

// Blocked domains (exact match or subdomain)
const BLOCKED_DOMAINS: string[] = [
  // Add known malicious domains here
  // Example: 'malicious.com', 'phishing-site.net'
];

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block dangerous protocols
    if (DANGEROUS_PROTOCOLS.includes(url.protocol)) {
      logSecurityEvent(`Blocked dangerous protocol: ${url.protocol}`, {
        url: urlString,
      });
      return false;
    }

    // Only allow http and https protocols
    if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
      logSecurityEvent(`Blocked invalid protocol: ${url.protocol}`, {
        url: urlString,
      });
      return false;
    }

    // Check against blocked domains (exact match or subdomain)
    const isBlocked = BLOCKED_DOMAINS.some(
      (domain) => url.hostname === domain || url.hostname.endsWith("." + domain)
    );

    if (isBlocked) {
      logSecurityEvent(`Blocked suspicious domain: ${url.hostname}`, {
        url: urlString,
      });
      return false;
    }

    // Allow localhost and private IPs for developer use
    // This browser is designed for developers who need to access local development servers

    return true;
  } catch (error) {
    logSecurityEvent(`Invalid URL format: ${urlString}`, { error });
    return false;
  }
}

// Security event logging
function logSecurityEvent(message: string, details?: any) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[Security] ${message}`, details);
  } else {
    // In production, log to file or monitoring service
    // For now, just log without details to avoid information disclosure
    console.warn(`[Security] ${message}`);
  }
}

function sanitizeUrl(urlString: string): string {
  let url = urlString.trim();

  // If already has a valid protocol, return as-is
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }

  // If no protocol, add appropriate protocol
  // Check if it's a local URL (localhost or private IP)
  const isLocalUrl =
    /^(localhost|127\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?/i.test(
      url
    );

  if (isLocalUrl) {
    // Use http:// for local development servers
    url = "http://" + url;
  } else {
    // Use https:// for external sites
    url = "https://" + url;
  }

  return url;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isAlwaysOnTop = false;
let webContentsView: WebContentsView | null = null; // WebContentsView for embedded content
let isLandscape = false; // Orientation state: false = portrait, true = landscape

// iPhone 15 Pro dimensions
const IPHONE_WIDTH = 393;
const IPHONE_HEIGHT = 852;
const FRAME_PADDING = 28; // 14px border on each side
const TOP_BAR_HEIGHT = 52;
const STATUS_BAR_HEIGHT = 58; // Height of status bar in portrait mode
const STATUS_BAR_WIDTH = 58; // Width of status bar in landscape mode

// iPhone 15 Pro User Agent
const IPHONE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

// Store latest theme color from webview
let latestThemeColor: string | null = null;

// Helper function to calculate luminance
function getLuminance(color: string): number {
  let r: number, g: number, b: number;

  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (color.startsWith('rgb')) {
    const matches = color.match(/\d+/g);
    if (matches) {
      r = parseInt(matches[0]);
      g = parseInt(matches[1]);
      b = parseInt(matches[2]);
    } else {
      return 0;
    }
  } else {
    return 0;
  }

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Status bar is now a React component, no need for IPC updates

// Helper function to get window dimensions based on orientation
function getWindowDimensions() {
  if (isLandscape) {
    return {
      width: IPHONE_HEIGHT + FRAME_PADDING,
      height: IPHONE_WIDTH + FRAME_PADDING + TOP_BAR_HEIGHT,
    };
  } else {
    return {
      width: IPHONE_WIDTH + FRAME_PADDING,
      height: IPHONE_HEIGHT + FRAME_PADDING + TOP_BAR_HEIGHT,
    };
  }
}

// Setup WebContentsView event handlers
function setupWebContentsViewHandlers(view: WebContentsView) {
  const contents = view.webContents;

  // Enable context menu (right-click)
  contents.on("context-menu", (event: any, params: any) => {
    const menu = Menu.buildFromTemplate([
      {
        label: "Back",
        enabled: contents.navigationHistory.canGoBack(),
        click: () => contents.navigationHistory.goBack(),
      },
      {
        label: "Forward",
        enabled: contents.navigationHistory.canGoForward(),
        click: () => contents.navigationHistory.goForward(),
      },
      { label: "Reload", click: () => contents.reload() },
      { type: "separator" },
      { label: "Copy", role: "copy" },
      { label: "Paste", role: "paste" },
      { label: "Select All", role: "selectAll" },
      { type: "separator" },
      {
        label: "Inspect Element",
        click: () => {
          // If DevTools is already open but not in detached mode, close and reopen
          if (contents.isDevToolsOpened()) {
            contents.closeDevTools();
          }
          
          // Open DevTools in detached mode first
          contents.openDevTools({ mode: "detach" });
          
          // Then inspect the specific element after a short delay
          setTimeout(() => {
            contents.inspectElement(params.x, params.y);
          }, 100);
        },
      },
    ]);
    menu.popup();
  });

  contents.on("will-navigate", (event: any, navigationUrl: string) => {
    // Validate navigation URL
    if (!isValidUrl(navigationUrl)) {
      event.preventDefault();
      logSecurityEvent(`Navigation blocked to invalid URL`, {
        url: navigationUrl,
      });
      // Notify the user
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("navigation-blocked", navigationUrl);
      }
    }
  });

  contents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Deny opening new windows
    return { action: "deny" };
  });

  // Handle render process crashes
  contents.on("render-process-gone", (event: any, details: any) => {
    console.error("Render process crashed:", details);
  });

  // Forward WebContents events to renderer process
  contents.on("did-start-loading", () => {
    latestThemeColor = null; // Reset theme color on navigation
    mainWindow?.webContents.send("webcontents-did-start-loading");
  });

  contents.on("did-stop-loading", () => {
    mainWindow?.webContents.send("webcontents-did-stop-loading");
  });

  contents.on("did-navigate", (event: any, url: string) => {
    mainWindow?.webContents.send("webcontents-did-navigate", url);
  });

  contents.on("did-navigate-in-page", (event: any, url: string) => {
    mainWindow?.webContents.send("webcontents-did-navigate-in-page", url);
  });

  contents.on("dom-ready", () => {
    mainWindow?.webContents.send("webcontents-dom-ready");
  });

  contents.on(
    "did-fail-load",
    (event: any, errorCode: number, errorDescription: string) => {
      mainWindow?.webContents.send(
        "webcontents-did-fail-load",
        errorCode,
        errorDescription
      );
    }
  );

  contents.on("render-process-gone", (event: any, details: any) => {
    mainWindow?.webContents.send("webcontents-render-process-gone", details);
  });
}

function createWindow(): void {
  const dimensions = getWindowDimensions();
  // Create the browser window with iPhone frame
  mainWindow = new BrowserWindow({
    width: dimensions.width,
    height: dimensions.height,
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

  // Create WebContentsView for embedded content first
  const webviewPreloadPath = path.join(__dirname, "webview-preload.js");
  const hasWebviewPreload = fs.existsSync(webviewPreloadPath);

  webContentsView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true, // Explicitly enable web security
      allowRunningInsecureContent: false, // Block mixed content
      sandbox: true, // Enable sandbox for additional security
      partition: "persist:main",
      // Only load preload if it exists (it may not exist on first run in dev mode)
      ...(hasWebviewPreload ? { preload: webviewPreloadPath } : {}),
    },
  });

  if (!hasWebviewPreload) {
    console.warn(
      "[Security] webview-preload.js not found. Theme color extraction will not work until built."
    );
  }

  // No border radius - testing layout
  // webContentsView.setBorderRadius(32);

  // Web content should have white background (default)
  // Don't set transparent background for web content

  // Set iPhone User Agent
  webContentsView.webContents.setUserAgent(IPHONE_USER_AGENT);

  // Add the WebContentsView to the window first (will be at bottom of z-order)
  mainWindow.contentView.addChildView(webContentsView);

  // Load initial URL in WebContentsView
  webContentsView.webContents.loadURL("https://www.google.com");

  // Position and size will be set via IPC from renderer
  // Initial positioning (will be updated by renderer)
  webContentsView.setBounds({ x: 0, y: 0, width: 100, height: 100 });
  
  // Setup event handlers for WebContentsView
  setupWebContentsViewHandlers(webContentsView);

  // Status bar is now a React component in phone-frame.tsx

  // Device frame is rendered as HTML/CSS in phone-frame.tsx
  // Assuming HTML can render on top of WebContentsView

  // Set permission request handler for WebContentsView
  webContentsView.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => {
      // Only allow specific permissions
      const allowedPermissions = ["clipboard-read", "clipboard-write"];

      if (allowedPermissions.includes(permission)) {
        logSecurityEvent(`Permission granted: ${permission}`);
        callback(true);
      } else {
        logSecurityEvent(`Permission denied: ${permission}`);
        callback(false);
      }
    }
  );

  // Set security headers for the main window (UI only)
  // Note: This only applies to the main window UI, not the WebContentsView
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      // Only apply strict CSP to the main window's own resources (localhost:5173 or file://)
      const isMainWindowResource =
        details.url.includes("localhost:5173") ||
        details.url.startsWith("file://") ||
        details.url.includes("dist-renderer");

      if (!isMainWindowResource) {
        // Don't modify CSP for external websites (Google, etc.)
        // They need their own CSP to function properly
        callback({ responseHeaders: details.responseHeaders });
        return;
      }

      // For main window UI: strict CSP in production, relaxed in development
      const isDevelopment = process.env.NODE_ENV === "development";

      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            isDevelopment
              ? // Development: Allow Vite HMR and inline scripts
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: https:; " +
                "connect-src 'self' http://localhost:* ws://localhost:* https:; " +
                "font-src 'self' data:; " +
                "object-src 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self';"
              : // Production: Strict CSP for our UI only
                "default-src 'self'; " +
                "script-src 'self'; " +
                "style-src 'self'; " +
                "img-src 'self' data: https:; " +
                "connect-src 'self' http://localhost:* ws://localhost:* https:; " +
                "font-src 'self' data:; " +
                "object-src 'none'; " +
                "base-uri 'self'; " +
                "form-action 'self';",
          ],
          "X-Content-Type-Options": ["nosniff"],
          "X-Frame-Options": ["DENY"],
          "X-XSS-Protection": ["1; mode=block"],
          "Referrer-Policy": ["strict-origin-when-cross-origin"],
          "Permissions-Policy": [
            "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
          ],
        },
      });
    }
  );

  // Load the main UI
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
  }

  // Maintain aspect ratio on resize
  mainWindow.on("will-resize", (event, newBounds) => {
    const dimensions = getWindowDimensions();
    const aspectRatio = dimensions.width / dimensions.height;

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
ipcMain.on("open-webview-devtools", (event) => {
  // Verify sender
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized DevTools access attempt");
    return;
  }

  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.openDevTools({ mode: "detach" });
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
  return nativeTheme.shouldUseDarkColors ? "dark" : "light";
});

// IPC handler for getting orientation
ipcMain.handle("get-orientation", () => {
  return isLandscape ? "landscape" : "portrait";
});

// IPC handler for toggling orientation
ipcMain.handle("toggle-orientation", () => {
  isLandscape = !isLandscape;

  if (mainWindow && !mainWindow.isDestroyed()) {
    const dimensions = getWindowDimensions();

    // Get current window bounds
    const currentBounds = mainWindow.getBounds();

    // Calculate new bounds maintaining the center position
    const newBounds = {
      x: currentBounds.x + (currentBounds.width - dimensions.width) / 2,
      y: currentBounds.y + (currentBounds.height - dimensions.height) / 2,
      width: dimensions.width,
      height: dimensions.height,
    };

    mainWindow.setBounds(newBounds);

    // Notify renderer about orientation change
    mainWindow.webContents.send(
      "orientation-changed",
      isLandscape ? "landscape" : "portrait"
    );
    
    // Update status bar orientation in WebContentsView
    // updateStatusBar - now handled by React();
  }

  return isLandscape ? "landscape" : "portrait";
});

// Listen for system theme changes and notify renderer
nativeTheme.on("updated", () => {
  const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("theme-changed", theme);
  }
});

// IPC handlers for WebContentsView control
ipcMain.handle("webcontents-load-url", (event, url: string) => {
  // Verify sender is the main window
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-load-url");
    throw new Error("Unauthorized");
  }

  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    const sanitized = sanitizeUrl(url);
    if (isValidUrl(sanitized)) {
      webContentsView.webContents.loadURL(sanitized);
    } else {
      logSecurityEvent(`Rejected invalid URL`, { url });
      throw new Error(`Invalid URL`);
    }
  }
});

ipcMain.handle("webcontents-go-back", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-go-back");
    throw new Error("Unauthorized");
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.navigationHistory.goBack();
  }
});

ipcMain.handle("webcontents-go-forward", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-go-forward");
    throw new Error("Unauthorized");
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.navigationHistory.goForward();
  }
});

ipcMain.handle("webcontents-reload", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-reload");
    throw new Error("Unauthorized");
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    webContentsView.webContents.reload();
  }
});

ipcMain.handle("webcontents-can-go-back", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-can-go-back");
    return false;
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.navigationHistory.canGoBack();
  }
  return false;
});

ipcMain.handle("webcontents-can-go-forward", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-can-go-forward");
    return false;
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.navigationHistory.canGoForward();
  }
  return false;
});

ipcMain.handle("webcontents-get-url", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-get-url");
    return "";
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.getURL();
  }
  return "";
});

ipcMain.handle("webcontents-get-title", (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-get-title");
    return "";
  }
  if (webContentsView && !webContentsView.webContents.isDestroyed()) {
    return webContentsView.webContents.getTitle();
  }
  return "";
});

// Theme color is now extracted via preload script injection
// This is safer than executeJavaScript from main process
ipcMain.handle("webcontents-get-theme-color", async (event) => {
  if (event.sender !== mainWindow?.webContents) {
    logSecurityEvent("Unauthorized IPC call to webcontents-get-theme-color");
    return null;
  }
  return latestThemeColor;
});

// Receive theme color from webview preload script
ipcMain.on("webview-theme-color-extracted", (event, themeColor: string) => {
  // Verify the sender is the webContentsView
  if (webContentsView && event.sender === webContentsView.webContents) {
    latestThemeColor = themeColor;
    
    // Update status bar in WebContentsView
    // updateStatusBar - now handled by React(themeColor);
    
    // Forward to renderer (for backward compatibility)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(
        "webcontents-theme-color-updated",
        themeColor
      );
    }
  }
});

// Handle navigation gestures from WebContentsView
ipcMain.on("webview-navigate-back", (event) => {
  // Verify the sender is the webContentsView
  if (webContentsView && event.sender === webContentsView.webContents) {
    if (webContentsView.webContents.navigationHistory.canGoBack()) {
      webContentsView.webContents.navigationHistory.goBack();
    }
  }
});

ipcMain.on("webview-navigate-forward", (event) => {
  // Verify the sender is the webContentsView
  if (webContentsView && event.sender === webContentsView.webContents) {
    if (webContentsView.webContents.navigationHistory.canGoForward()) {
      webContentsView.webContents.navigationHistory.goForward();
    }
  }
});

ipcMain.handle(
  "webcontents-set-bounds",
  (event, bounds: { x: number; y: number; width: number; height: number }) => {
    if (event.sender !== mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to webcontents-set-bounds");
      throw new Error("Unauthorized");
    }
    if (webContentsView) {
      webContentsView.setBounds(bounds);
    }
  }
);

// Status bar is now a React component, no IPC handler needed

// Device frame is now HTML/CSS, no IPC handler needed

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
        label: "Toggle Orientation",
        click: () => {
          isLandscape = !isLandscape;

          if (mainWindow && !mainWindow.isDestroyed()) {
            const dimensions = getWindowDimensions();

            // Get current window bounds
            const currentBounds = mainWindow.getBounds();

            // Calculate new bounds maintaining the center position
            const newBounds = {
              x: currentBounds.x + (currentBounds.width - dimensions.width) / 2,
              y:
                currentBounds.y +
                (currentBounds.height - dimensions.height) / 2,
              width: dimensions.width,
              height: dimensions.height,
            };

            mainWindow.setBounds(newBounds);

            // Notify renderer about orientation change
            mainWindow.webContents.send(
              "orientation-changed",
              isLandscape ? "landscape" : "portrait"
            );
            
            // Update status bar orientation in WebContentsView
            // updateStatusBar - now handled by React();
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
            webContentsView.webContents.openDevTools({ mode: "detach" });
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

  // Update status bar time every minute
  setInterval(() => {
    // updateStatusBar - now handled by React();
  }, 60000); // 60 seconds

  // Initial status bar update
  setTimeout(() => {
    // updateStatusBar - now handled by React();
  }, 1000);

  // Register Cmd+W / Ctrl+W to hide window instead of closing
  globalShortcut.register("CommandOrControl+W", () => {
    if (mainWindow && tray) {
      mainWindow.hide();
    }
    return true; // Prevent default behavior
  });

  // Register global shortcuts to prevent default refresh behavior
  // Cmd+R (macOS) / Ctrl+R (Windows/Linux)
  globalShortcut.register("CommandOrControl+R", () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("webview-reload");
    }
    return true; // Prevent default behavior
  });

  // Also handle F5 key
  globalShortcut.register("F5", () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("webview-reload");
    }
    return true; // Prevent default behavior
  });

  // Handle Cmd+Shift+R / Ctrl+Shift+R (hard reload)
  globalShortcut.register("CommandOrControl+Shift+R", () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("webview-reload");
    }
    return true; // Prevent default behavior
  });

  // Register Cmd+Shift+I / Ctrl+Shift+I (DevTools for WebContentsView)
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    if (webContentsView && !webContentsView.webContents.isDestroyed()) {
      if (webContentsView.webContents.isDevToolsOpened()) {
        webContentsView.webContents.closeDevTools();
      } else {
        webContentsView.webContents.openDevTools({ mode: "detach" });
      }
    }
    return true; // Prevent default behavior
  });

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
