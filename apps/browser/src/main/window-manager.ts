/**
 * Window management functionality
 */

import { BrowserWindow, screen, app } from "electron";
import path from "path";
import { AppState } from "./types";
import {
  IPHONE_WIDTH,
  IPHONE_HEIGHT,
  FRAME_PADDING,
  TOP_BAR_HEIGHT,
  STATUS_BAR_HEIGHT,
  STATUS_BAR_WIDTH,
} from "./constants";
import { logSecurityEvent } from "./security";
import { TabManager } from "./tab-manager";

export class WindowManager {
  private state: AppState;
  private tabManager: TabManager;

  constructor(state: AppState, tabManager: TabManager) {
    this.state = state;
    this.tabManager = tabManager;
  }

  /**
   * Get window dimensions based on orientation
   */
  getWindowDimensions() {
    if (this.state.isLandscape) {
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

  /**
   * Update WebContentsView bounds based on current window size
   */
  updateWebContentsViewBounds(): void {
    if (!this.state.webContentsView || !this.state.mainWindow) return;

    // Check if active tab is in fullscreen mode (Plan 1.5)
    const activeTab = this.state.tabs.find((t) => t.id === this.state.activeTabId);
    if (activeTab?.isFullscreen) {
      // In fullscreen mode, hide status bar and add gaps to keep within device frame
      const windowBounds = this.state.mainWindow.getBounds();
      const topBarHeight = TOP_BAR_HEIGHT;
      const deviceFramePadding = FRAME_PADDING / 2;
      const fullscreenGapHorizontal = 57; // Match tab-manager
      const fullscreenGapVertical = 67; // Match tab-manager

      if (this.state.isLandscape) {
        // Landscape: gap on left and right to avoid rounded corners
        const bounds = {
          x: fullscreenGapHorizontal - 30,
          y: topBarHeight + deviceFramePadding,
          width: windowBounds.width - fullscreenGapHorizontal * 2,
          height: windowBounds.height - topBarHeight - deviceFramePadding * 2,
        };
        activeTab.view.setBounds(bounds);
      } else {
        // Portrait: gap on top and bottom to avoid rounded corners
        const bounds = {
          x: deviceFramePadding,
          y: topBarHeight + fullscreenGapVertical - 30,
          width: windowBounds.width - deviceFramePadding * 2,
          height: windowBounds.height - topBarHeight - fullscreenGapVertical - fullscreenGapVertical,
        };
        activeTab.view.setBounds(bounds);
      }
      
      // Notify renderer to hide status bar in fullscreen mode
      this.state.mainWindow.webContents.send("fullscreen-mode-changed", true);
      return;
    }

    // Not in fullscreen - show status bar
    this.state.mainWindow.webContents.send("fullscreen-mode-changed", false);

    const bounds = this.state.mainWindow.getBounds();
    const dimensions = this.getWindowDimensions();

    // Calculate scale factor
    const scaleX = bounds.width / dimensions.width;
    const scaleY = bounds.height / dimensions.height;

    if (this.state.isLandscape) {
      const statusBarWidth = STATUS_BAR_WIDTH * scaleX;
      const frameTop = (FRAME_PADDING / 2) * scaleY;
      const frameBottom = (FRAME_PADDING / 2) * scaleY;
      const frameRight = (FRAME_PADDING / 2) * scaleX;
      const topBarHeight = TOP_BAR_HEIGHT * scaleY;

      this.state.webContentsView.setBounds({
        x: Math.round(statusBarWidth),
        y: Math.round(topBarHeight + frameTop),
        width: Math.round(bounds.width - statusBarWidth - frameRight),
        height: Math.round(bounds.height - topBarHeight - frameTop - frameBottom),
      });
    } else {
      const statusBarHeight = STATUS_BAR_HEIGHT * scaleY;
      const frameTop = (FRAME_PADDING / 2) * scaleY;
      const frameBottom = (FRAME_PADDING / 2) * scaleY;
      const frameLeft = (FRAME_PADDING / 2) * scaleX;
      const frameRight = (FRAME_PADDING / 2) * scaleX;
      const topBarHeight = TOP_BAR_HEIGHT * scaleY;

      this.state.webContentsView.setBounds({
        x: Math.round(frameLeft),
        y: Math.round(topBarHeight + statusBarHeight + frameTop),
        width: Math.round(bounds.width - frameLeft - frameRight),
        height: Math.round(
          bounds.height - topBarHeight - statusBarHeight - frameTop - frameBottom
        ),
      });
    }
  }

  /**
   * Toggle orientation between portrait and landscape
   */
  toggleOrientation(): string {
    this.state.isLandscape = !this.state.isLandscape;

    if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
      const dimensions = this.getWindowDimensions();

      // Get current window bounds
      const currentBounds = this.state.mainWindow.getBounds();

      // Calculate new bounds maintaining the center position
      const newBounds = {
        x: currentBounds.x + (currentBounds.width - dimensions.width) / 2,
        y: currentBounds.y + (currentBounds.height - dimensions.height) / 2,
        width: dimensions.width,
        height: dimensions.height,
      };

      this.state.mainWindow.setBounds(newBounds);

      const orientation = this.state.isLandscape ? "landscape" : "portrait";

      // Notify renderer about orientation change
      this.state.mainWindow.webContents.send("orientation-changed", orientation);

      // Notify all WebContentsViews (tabs) about orientation change
      this.state.tabs.forEach((tab) => {
        if (!tab.view.webContents.isDestroyed()) {
          tab.view.webContents.send("orientation-changed", orientation);
        }
      });
    }

    return this.state.isLandscape ? "landscape" : "portrait";
  }

  /**
   * Create the main browser window
   */
  createWindow(): void {
    const dimensions = this.getWindowDimensions();
    
    this.state.mainWindow = new BrowserWindow({
      width: dimensions.width,
      height: dimensions.height,
      minWidth: 300,
      minHeight: 400,
      webPreferences: {
        preload: path.join(__dirname, "..", "preload.js"),
        nodeIntegration: false,
        contextIsolation: true,
      },
      transparent: true,
      frame: false,
      hasShadow: false,
      backgroundColor: "#00000000",
      roundedCorners: true,
      resizable: true,
      fullscreenable: false, // Prevent window from going fullscreen (Plan 1.5)
    });

    // Prevent window from entering fullscreen when HTML fullscreen is requested
    this.state.mainWindow.on("enter-full-screen", () => {
      console.log("[Window] Preventing window fullscreen");
      this.state.mainWindow?.setFullScreen(false);
    });

    // Enable swipe navigation gestures on macOS
    if (process.platform === "darwin") {
      this.state.mainWindow.on("swipe", (event, direction) => {
        if (direction === "left") {
          this.state.mainWindow?.webContents.send("navigate-forward");
        } else if (direction === "right") {
          this.state.mainWindow?.webContents.send("navigate-back");
        }
      });
    }

    // Alternative: Listen for app-command events
    this.state.mainWindow.on("app-command", (event, command) => {
      if (command === "browser-backward") {
        this.state.mainWindow?.webContents.send("navigate-back");
      } else if (command === "browser-forward") {
        this.state.mainWindow?.webContents.send("navigate-forward");
      }
    });

    // Register local keyboard shortcuts (only work when window is focused)
    this.registerLocalShortcuts();

    // Create initial tab
    const initialTab = this.tabManager.createTab("https://www.google.com");
    this.tabManager.switchToTab(initialTab.id);

    // Set permission request handler
    if (this.state.webContentsView) {
      this.state.webContentsView.webContents.session.setPermissionRequestHandler(
        (webContents, permission, callback) => {
          const allowedPermissions = [
            "clipboard-read",
            "clipboard-write",
            "media",
            "fullscreen", // Allow fullscreen - handled by Electron native events
          ];

          if (allowedPermissions.includes(permission)) {
            logSecurityEvent(`Permission granted: ${permission}`);
            callback(true);
          } else {
            logSecurityEvent(`Permission denied: ${permission}`);
            callback(false);
          }
        }
      );
    }

    // Set security headers
    this.setupSecurityHeaders();

    // Load the main UI
    if (process.env.NODE_ENV === "development") {
      this.state.mainWindow.loadURL("http://localhost:5173");
    } else {
      // In production, use app.getAppPath() to get the correct base path
      // Files are at: app.asar/dist-renderer/index.html
      const rendererPath = path.join(app.getAppPath(), "dist-renderer", "index.html");
      console.log(`[WindowManager] Loading renderer from: ${rendererPath}`);
      this.state.mainWindow.loadFile(rendererPath);
    }

    // Maintain aspect ratio on resize
    this.state.mainWindow.on("will-resize", (event, newBounds) => {
      const dimensions = this.getWindowDimensions();
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
      this.state.mainWindow?.setBounds({
        ...newBounds,
        width: newWidth,
        height: newHeight,
      });
    });
  }

  /**
   * Register local keyboard shortcuts (only active when window is focused)
   */
  private registerLocalShortcuts(): void {
    if (!this.state.mainWindow) return;

    this.state.mainWindow.webContents.on("before-input-event", (event, input) => {
      // Only handle keyboard events
      if (input.type !== "keyDown") return;

      const isMac = process.platform === "darwin";
      const modifierKey = isMac ? input.meta : input.control;

      // Cmd+W / Ctrl+W to hide window
      if (modifierKey && input.key.toLowerCase() === "w" && !input.shift && !input.alt) {
        event.preventDefault();
        if (this.state.mainWindow && this.state.tray) {
          this.state.mainWindow.hide();
        }
        return;
      }

      // Cmd+R / Ctrl+R to reload
      if (modifierKey && input.key.toLowerCase() === "r" && !input.shift && !input.alt) {
        event.preventDefault();
        if (this.state.mainWindow && this.state.mainWindow.webContents) {
          this.state.mainWindow.webContents.send("webview-reload");
        }
        return;
      }

      // F5 to reload
      if (input.key === "F5" && !modifierKey && !input.shift && !input.alt) {
        event.preventDefault();
        if (this.state.mainWindow && this.state.mainWindow.webContents) {
          this.state.mainWindow.webContents.send("webview-reload");
        }
        return;
      }

      // Cmd+Shift+R / Ctrl+Shift+R (hard reload)
      if (modifierKey && input.shift && input.key.toLowerCase() === "r" && !input.alt) {
        event.preventDefault();
        if (this.state.mainWindow && this.state.mainWindow.webContents) {
          this.state.mainWindow.webContents.send("webview-reload");
        }
        return;
      }

      // Cmd+Shift+I / Ctrl+Shift+I (DevTools)
      if (modifierKey && input.shift && input.key.toLowerCase() === "i" && !input.alt) {
        event.preventDefault();
        if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
          if (this.state.webContentsView.webContents.isDevToolsOpened()) {
            this.state.webContentsView.webContents.closeDevTools();
          } else {
            this.state.webContentsView.webContents.openDevTools({ mode: "detach" });
          }
        }
        return;
      }

      // ESC key to exit fullscreen (Plan 1.5)
      if (input.key === "Escape" && !modifierKey && !input.shift && !input.alt) {
        if (this.state.activeTabId) {
          const activeTab = this.state.tabs.find((t) => t.id === this.state.activeTabId);
          if (activeTab?.isFullscreen) {
            event.preventDefault();
            this.tabManager.exitFullscreen(this.state.activeTabId);
            return;
          }
        }
      }
    });
  }

  /**
   * Setup security headers for the main window
   */
  private setupSecurityHeaders(): void {
    if (!this.state.mainWindow) return;

    this.state.mainWindow.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        const isMainWindowResource =
          details.url.includes("localhost:5173") ||
          details.url.startsWith("file://") ||
          details.url.includes("dist-renderer");

        if (!isMainWindowResource) {
          callback({ responseHeaders: details.responseHeaders });
          return;
        }

        const isDevelopment = process.env.NODE_ENV === "development";

        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [
              isDevelopment
                ? "default-src 'self'; " +
                  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                  "style-src 'self' 'unsafe-inline'; " +
                  "img-src 'self' data: https:; " +
                  "connect-src 'self' http://localhost:* ws://localhost:* https:; " +
                  "font-src 'self' data:; " +
                  "object-src 'none'; " +
                  "base-uri 'self'; " +
                  "form-action 'self';"
                : "default-src 'self'; " +
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
  }
}
