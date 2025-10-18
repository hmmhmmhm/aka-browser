/**
 * Window management functionality
 */

import { BrowserWindow, screen } from "electron";
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

      // Notify renderer about orientation change
      this.state.mainWindow.webContents.send(
        "orientation-changed",
        this.state.isLandscape ? "landscape" : "portrait"
      );
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
      this.state.mainWindow.loadFile(path.join(__dirname, "../dist-renderer/index.html"));
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
