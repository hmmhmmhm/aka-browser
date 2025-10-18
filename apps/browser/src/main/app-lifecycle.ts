/**
 * Application lifecycle management
 */

import { app, BrowserWindow, globalShortcut, nativeImage, components } from "electron";
import path from "path";
import { AppState } from "./types";
import { WindowManager } from "./window-manager";
import { TrayManager } from "./tray-manager";

export class AppLifecycle {
  private state: AppState;
  private windowManager: WindowManager;
  private trayManager: TrayManager;

  constructor(state: AppState, windowManager: WindowManager, trayManager: TrayManager) {
    this.state = state;
    this.windowManager = windowManager;
    this.trayManager = trayManager;
  }

  /**
   * Initialize Widevine CDM logging
   */
  initializeWidevine(): void {
    console.log("[Widevine] Electron app path:", app.getAppPath());
    console.log("[Widevine] Electron version:", process.versions.electron);
    console.log(
      "[Widevine] Process versions:",
      JSON.stringify(process.versions, null, 2)
    );

    console.log(
      "[Widevine] Using Component Updater for automatic CDM installation"
    );

    // Enable Widevine features and DRM
    app.commandLine.appendSwitch("enable-features", "PlatformEncryptedDolbyVision");
    app.commandLine.appendSwitch("ignore-certificate-errors");
    app.commandLine.appendSwitch("allow-running-insecure-content");
  }

  /**
   * Wait for Widevine components to be ready
   */
  async waitForWidevineComponents(): Promise<void> {
    if (typeof components !== "undefined") {
      console.log("[Component] Initial status:", components.status());
      console.log("[Component] Updates enabled:", components.updatesEnabled);

      console.log("[Component] Waiting for Widevine CDM...");
      const startTime = Date.now();

      try {
        const results = await components.whenReady();
        const elapsed = Date.now() - startTime;
        console.log(`[Component] ✓ Ready after ${elapsed}ms`);
        console.log("[Component] Results:", results);
        console.log("[Component] Final status:", components.status());
      } catch (error: any) {
        console.error("[Component] ✗ Failed:", error);
        if (error.errors) {
          error.errors.forEach((err: any, i: number) => {
            console.error(`[Component] Error ${i + 1}:`, err);
          });
        }
      }
    } else {
      console.warn(
        "[Component] components API not available - not using castlabs electron?"
      );
    }

    if (typeof (app as any).isEVSEnabled === "function") {
      console.log("[Widevine] EVS enabled:", (app as any).isEVSEnabled());
    }

    console.log("[Widevine] App path:", app.getAppPath());
    console.log("[Widevine] __dirname:", __dirname);
  }

  /**
   * Setup application when ready
   */
  async setupApp(): Promise<void> {
    app.setName("Aka Browser");

    console.log(
      "[Widevine] Using castlabs electron-releases with built-in Widevine CDM"
    );

    // Set dock icon for macOS
    if (process.platform === "darwin") {
      const iconPath = path.join(__dirname, "../assets/icon.png");
      const dockIcon = nativeImage.createFromPath(iconPath);
      if (!dockIcon.isEmpty()) {
        app.dock?.setIcon(dockIcon);
      }
    }

    this.windowManager.createWindow();
    this.trayManager.createTray();

    this.registerGlobalShortcuts();
    this.registerAppEvents();
  }

  /**
   * Register global keyboard shortcuts
   */
  private registerGlobalShortcuts(): void {
    // Cmd+W / Ctrl+W to hide window
    globalShortcut.register("CommandOrControl+W", () => {
      if (this.state.mainWindow && this.state.tray) {
        this.state.mainWindow.hide();
      }
      return true;
    });

    // Cmd+R / Ctrl+R to reload
    globalShortcut.register("CommandOrControl+R", () => {
      if (this.state.mainWindow && this.state.mainWindow.webContents) {
        this.state.mainWindow.webContents.send("webview-reload");
      }
      return true;
    });

    // F5 to reload
    globalShortcut.register("F5", () => {
      if (this.state.mainWindow && this.state.mainWindow.webContents) {
        this.state.mainWindow.webContents.send("webview-reload");
      }
      return true;
    });

    // Cmd+Shift+R / Ctrl+Shift+R (hard reload)
    globalShortcut.register("CommandOrControl+Shift+R", () => {
      if (this.state.mainWindow && this.state.mainWindow.webContents) {
        this.state.mainWindow.webContents.send("webview-reload");
      }
      return true;
    });

    // Cmd+Shift+I / Ctrl+Shift+I (DevTools)
    globalShortcut.register("CommandOrControl+Shift+I", () => {
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        if (this.state.webContentsView.webContents.isDevToolsOpened()) {
          this.state.webContentsView.webContents.closeDevTools();
        } else {
          this.state.webContentsView.webContents.openDevTools({ mode: "detach" });
        }
      }
      return true;
    });
  }

  /**
   * Register application lifecycle events
   */
  private registerAppEvents(): void {
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowManager.createWindow();
      } else if (this.state.mainWindow) {
        this.state.mainWindow.show();
        this.state.mainWindow.focus();
      }
    });

    app.on("window-all-closed", () => {
      // Keep app running in tray
    });

    app.on("before-quit", () => {
      this.trayManager.destroy();
    });

    app.on("will-quit", () => {
      globalShortcut.unregisterAll();
    });
  }
}
