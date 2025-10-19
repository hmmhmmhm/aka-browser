/**
 * Tab management functionality
 */

import { WebContentsView, Menu } from "electron";
import path from "path";
import fs from "fs";
import { Tab, AppState } from "./types";
import {
  isValidUrl,
  sanitizeUrl,
  getUserAgentForUrl,
  logSecurityEvent,
} from "./security";
import { ThemeColorCache } from "./theme-cache";

export class TabManager {
  private state: AppState;
  private themeColorCache: ThemeColorCache;

  constructor(state: AppState, themeColorCache: ThemeColorCache) {
    this.state = state;
    this.themeColorCache = themeColorCache;
  }

  /**
   * Create a new tab
   */
  createTab(url: string = "https://www.google.com"): Tab {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const webviewPreloadPath = path.join(__dirname, "..", "webview-preload.js");
    const hasWebviewPreload = fs.existsSync(webviewPreloadPath);

    console.log("[TabManager] Creating tab with preload:", webviewPreloadPath);
    console.log("[TabManager] Preload exists:", hasWebviewPreload);

    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
        sandbox: false, // Widevine requires sandbox: false
        partition: "persist:main",
        plugins: true, // Enable plugins for Widevine CDM
        enablePreferredSizeMode: false,
        ...(hasWebviewPreload ? { preload: webviewPreloadPath } : {}),
      },
    });

    // Enable Widevine CDM for this webContents
    view.webContents.session.setPermissionRequestHandler(
      (
        _webContents: any,
        permission: string,
        callback: (result: boolean) => void
      ) => {
        if (permission === "media" || permission === "fullscreen") {
          callback(true); // Allow media and fullscreen permissions
        } else {
          callback(false);
        }
      }
    );

    // Set initial user agent based on URL
    const userAgent = getUserAgentForUrl(url);
    view.webContents.setUserAgent(userAgent);

    const tab: Tab = {
      id: tabId,
      view,
      title: "New Tab",
      url,
    };

    this.state.tabs.push(tab);
    this.setupWebContentsViewHandlers(view, tabId);

    // Load URL
    const sanitized = sanitizeUrl(url);
    if (isValidUrl(sanitized)) {
      view.webContents.loadURL(sanitized);
    }

    return tab;
  }

  /**
   * Switch to a specific tab
   */
  switchToTab(tabId: string): void {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || !this.state.mainWindow) return;

    // Hide current active tab and capture its preview
    if (this.state.activeTabId && this.state.activeTabId !== tabId) {
      const currentTab = this.state.tabs.find(
        (t) => t.id === this.state.activeTabId
      );
      if (currentTab) {
        // Capture preview before hiding
        this.captureTabPreview(this.state.activeTabId).catch((err) => {
          console.error("Failed to capture preview on tab switch:", err);
        });
        this.state.mainWindow.contentView.removeChildView(currentTab.view);
      }
    }

    // Update webContentsView reference BEFORE adding view
    this.state.webContentsView = tab.view;
    this.state.activeTabId = tabId;

    // Show new tab
    if (!this.state.mainWindow.contentView.children.includes(tab.view)) {
      this.state.mainWindow.contentView.addChildView(tab.view);
    }

    // Notify renderer about tab change
    this.state.mainWindow.webContents.send("tab-changed", {
      tabId,
      tabs: this.state.tabs.map((t) => ({
        id: t.id,
        title: t.title,
        url: t.url,
        preview: t.preview,
      })),
    });
  }

  /**
   * Close a tab
   */
  closeTab(tabId: string): void {
    const tabIndex = this.state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = this.state.tabs[tabIndex];

    // Remove from window
    if (this.state.mainWindow) {
      this.state.mainWindow.contentView.removeChildView(tab.view);
    }

    // Destroy the view
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.close();
    }

    // Remove from tabs array
    this.state.tabs.splice(tabIndex, 1);

    // If this was the active tab, switch to another
    if (this.state.activeTabId === tabId) {
      if (this.state.tabs.length > 0) {
        // Switch to the previous tab or the first tab
        const newActiveTab = this.state.tabs[Math.max(0, tabIndex - 1)];
        this.switchToTab(newActiveTab.id);
      } else {
        // No tabs left, create a new one
        const newTab = this.createTab();
        this.switchToTab(newTab.id);
      }
    } else {
      // Just notify renderer about tab list change
      if (this.state.mainWindow) {
        this.state.mainWindow.webContents.send("tabs-updated", {
          tabs: this.state.tabs.map((t) => ({
            id: t.id,
            title: t.title,
            url: t.url,
            preview: t.preview,
          })),
          activeTabId: this.state.activeTabId,
        });
      }
    }
  }

  /**
   * Close all tabs and create a new one
   */
  closeAllTabs(): void {
    // Close all tabs
    const tabsToClose = [...this.state.tabs];
    tabsToClose.forEach((tab) => {
      // Remove from window
      if (this.state.mainWindow) {
        this.state.mainWindow.contentView.removeChildView(tab.view);
      }

      // Destroy the view
      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
      }
    });

    // Clear tabs array
    this.state.tabs.length = 0;

    // Create a new tab
    const newTab = this.createTab();
    this.switchToTab(newTab.id);
  }

  /**
   * Capture tab preview
   */
  private async captureTabPreview(tabId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    try {
      // Capture screenshot at a reasonable size for preview
      const image = await tab.view.webContents.capturePage({
        x: 0,
        y: 0,
        width: 800,
        height: 1200,
      });

      // Convert to base64 data URL
      const dataUrl = image.toDataURL();
      tab.preview = dataUrl;

      // Notify renderer about updated tabs
      if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
        this.state.mainWindow.webContents.send("tabs-updated", {
          tabs: this.state.tabs.map((t) => ({
            id: t.id,
            title: t.title,
            url: t.url,
            preview: t.preview,
          })),
          activeTabId: this.state.activeTabId,
        });
      }
    } catch (error) {
      console.error("Failed to capture tab preview:", error);
    }
  }

  /**
   * Setup WebContentsView event handlers
   */
  private setupWebContentsViewHandlers(
    view: WebContentsView,
    tabId: string
  ): void {
    const contents = view.webContents;

    // Send initial orientation to the new webview when DOM is ready
    contents.on("dom-ready", () => {
      const orientation = this.state.isLandscape ? "landscape" : "portrait";
      contents.send("orientation-changed", orientation);
    });

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
            if (contents.isDevToolsOpened()) {
              contents.closeDevTools();
            }
            contents.openDevTools({ mode: "detach" });
            setTimeout(() => {
              contents.inspectElement(params.x, params.y);
            }, 100);
          },
        },
      ]);
      menu.popup();
    });

    contents.on("will-navigate", (event: any, navigationUrl: string) => {
      if (!isValidUrl(navigationUrl)) {
        event.preventDefault();
        logSecurityEvent(`Navigation blocked to invalid URL`, {
          url: navigationUrl,
        });
        if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
          this.state.mainWindow.webContents.send(
            "navigation-blocked",
            navigationUrl
          );
        }
      } else {
        const userAgent = getUserAgentForUrl(navigationUrl);
        contents.setUserAgent(userAgent);
      }
    });

    contents.setWindowOpenHandler(({ url }: { url: string }) => {
      if (!isValidUrl(url)) {
        logSecurityEvent(`Blocked new window with invalid URL`, { url });
        return { action: "deny" };
      }

      const newTab = this.createTab(url);
      this.switchToTab(newTab.id);

      return { action: "deny" };
    });

    contents.on("render-process-gone", (event: any, details: any) => {
      console.error("Render process crashed:", details);
    });

    this.setupNavigationHandlers(contents, tabId);
    this.setupFullscreenHandlers(contents, tabId);
  }

  /**
   * Setup fullscreen event handlers using Electron's native events (Plan 1.5 - Correct approach)
   * Note: We update bounds with gaps and hide status bar in fullscreen mode
   */
  private setupFullscreenHandlers(
    contents: Electron.WebContents,
    tabId: string
  ): void {
    // Listen for HTML fullscreen API events from Electron
    contents.on("enter-html-full-screen", () => {
      const tab = this.state.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      console.log(`[Fullscreen][${timestamp}] enter-html-full-screen event received`);

      // Mark tab as fullscreen (for state tracking)
      tab.isFullscreen = true;

      // Update bounds with gaps and hide status bar
      if (this.state.mainWindow) {
        const windowBounds = this.state.mainWindow.getBounds();
        const topBarHeight = 40; // TOP_BAR_HEIGHT
        const deviceFramePadding = 15; // Device frame outer padding
        const deviceBorderRadius = 32; // Device frame border radius

        // Calculate safe gap to avoid rounded corners
        // Adjust these values to fine-tune fullscreen positioning:
        // - Increase to move content away from frame edges
        // - Decrease to make content larger (closer to frame edges)
        const fullscreenGapVertical =
          deviceFramePadding + deviceBorderRadius + 20; // ~67px (Portrait: top/bottom gap)
        const fullscreenGapHorizontal =
          deviceFramePadding + deviceBorderRadius + 10; // ~57px (Landscape: left/right gap)

        // Determine orientation based on actual window dimensions (not cached state)
        const isCurrentlyLandscape = windowBounds.width > windowBounds.height;

        const ts = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`[Fullscreen][${ts}] Window bounds: ${windowBounds.width}x${windowBounds.height}`);
        console.log(`[Fullscreen][${ts}] Orientation: ${isCurrentlyLandscape ? 'LANDSCAPE' : 'PORTRAIT'}`);
        console.log(`[Fullscreen][${ts}] Gaps - Vertical: ${fullscreenGapVertical}px, Horizontal: ${fullscreenGapHorizontal}px`);

        if (isCurrentlyLandscape) {
          // Landscape: gap on left and right to avoid rounded corners
          // Note: We ignore status bar space in fullscreen mode
          const bounds = {
            x: fullscreenGapHorizontal,
            y: topBarHeight + deviceFramePadding,
            width: windowBounds.width - fullscreenGapHorizontal * 2,
            height: windowBounds.height - topBarHeight - deviceFramePadding * 2,
          };
          console.log(`[Fullscreen][${ts}] LANDSCAPE bounds:`, bounds);
          tab.view.setBounds(bounds);
        } else {
          // Portrait: gap on top and bottom to avoid rounded corners
          const bounds = {
            x: deviceFramePadding,
            y: topBarHeight + fullscreenGapVertical,
            width: windowBounds.width - deviceFramePadding * 2,
            height:
              windowBounds.height -
              topBarHeight -
              fullscreenGapVertical -
              fullscreenGapVertical,
          };
          console.log(`[Fullscreen][${ts}] PORTRAIT bounds:`, bounds);
          tab.view.setBounds(bounds);
        }

        // Notify renderer to hide status bar
        this.state.mainWindow.webContents.send("fullscreen-mode-changed", true);

        // Force a layout recalculation by resizing the main window
        // This ensures WebContentsView properly recalculates its size
        const windowBoundsNow = this.state.mainWindow.getBounds();
        const ts3 = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`[Fullscreen][${ts3}] Applying window resize trick: ${windowBoundsNow.height} -> ${windowBoundsNow.height + 1}`);
        this.state.mainWindow.setBounds({
          ...windowBoundsNow,
          height: windowBoundsNow.height + 1,
        });
        
        // Immediately restore to correct size
        const ts4 = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`[Fullscreen][${ts4}] Restoring window to correct size: ${windowBoundsNow.height}`);
        this.state.mainWindow.setBounds(windowBoundsNow);
        
        // Send fullscreen state immediately
        if (!tab.view.webContents.isDestroyed()) {
          const ts5 = new Date().toISOString().split('T')[1].slice(0, -1);
          console.log(`[Fullscreen][${ts5}] Sending set-fullscreen-state: true`);
          tab.view.webContents.send("set-fullscreen-state", true);
        }
      }

      const ts2 = new Date().toISOString().split('T')[1].slice(0, -1);
      console.log(
        `[Fullscreen][${ts2}] ✅ Fullscreen mode enabled (with gaps, status bar hidden)`
      );
    });

    contents.on("leave-html-full-screen", () => {
      const tab = this.state.tabs.find((t) => t.id === tabId);
      if (!tab) return;

      const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
      console.log(`[Fullscreen][${timestamp}] leave-html-full-screen event received`);

      // Clear fullscreen state
      tab.isFullscreen = false;

      // Restore normal bounds
      if (this.state.mainWindow) {
        this.state.mainWindow.webContents.send(
          "fullscreen-mode-changed",
          false
        );

        // Restore normal WebContentsView bounds FIRST
        const windowBounds = this.state.mainWindow.getBounds();
        const topBarHeight = 40; // TOP_BAR_HEIGHT
        const statusBarHeight = 58;
        const statusBarWidth = 58;
        const frameHalf = 15 / 2; // Device frame padding (half on each side)

        // Determine orientation based on actual window dimensions (not cached state)
        const isCurrentlyLandscape = windowBounds.width > windowBounds.height;

        if (isCurrentlyLandscape) {
          // Landscape mode: status bar is on the LEFT side
          const bounds = {
            x: statusBarWidth,
            y: Math.round(topBarHeight + frameHalf),
            width: Math.round(windowBounds.width - statusBarWidth - frameHalf),
            height: Math.round(windowBounds.height - topBarHeight - frameHalf * 2),
          };
          const ts = new Date().toISOString().split('T')[1].slice(0, -1);
          console.log(`[Fullscreen][${ts}] Restoring LANDSCAPE bounds:`, bounds);
          tab.view.setBounds(bounds);
        } else {
          // Portrait mode: status bar is on the TOP
          const bounds = {
            x: Math.round(frameHalf),
            y: Math.round(topBarHeight + statusBarHeight + frameHalf),
            width: Math.round(windowBounds.width - frameHalf * 2),
            height: Math.round(windowBounds.height - topBarHeight - statusBarHeight - frameHalf * 2),
          };
          const ts = new Date().toISOString().split('T')[1].slice(0, -1);
          console.log(`[Fullscreen][${ts}] Restoring PORTRAIT bounds:`, bounds);
          tab.view.setBounds(bounds);
        }

        // Force a layout recalculation by resizing the main window
        // This ensures WebContentsView properly recalculates its size
        const windowBoundsNow = this.state.mainWindow.getBounds();
        const ts3 = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`[Fullscreen][${ts3}] Applying window resize trick: ${windowBoundsNow.height} -> ${windowBoundsNow.height + 1}`);
        this.state.mainWindow.setBounds({
          ...windowBoundsNow,
          height: windowBoundsNow.height + 1,
        });
        
        // Immediately restore to correct size
        const ts4 = new Date().toISOString().split('T')[1].slice(0, -1);
        console.log(`[Fullscreen][${ts4}] Restoring window to correct size: ${windowBoundsNow.height}`);
        this.state.mainWindow.setBounds(windowBoundsNow);
        
        // Send fullscreen state immediately
        if (!tab.view.webContents.isDestroyed()) {
          const ts5 = new Date().toISOString().split('T')[1].slice(0, -1);
          console.log(`[Fullscreen][${ts5}] Sending set-fullscreen-state: false`);
          tab.view.webContents.send("set-fullscreen-state", false);
        }
      }

      const ts2 = new Date().toISOString().split('T')[1].slice(0, -1);
      console.log(
        `[Fullscreen][${ts2}] ✅ Fullscreen state cleared (status bar shown, bounds restored)`
      );
    });
  }

  /**
   * Exit fullscreen for a specific tab (called by ESC key handler)
   */
  exitFullscreen(tabId: string): void {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.isFullscreen) return;

    console.log("[Fullscreen] Exiting fullscreen via ESC key");

    // Execute JavaScript to exit fullscreen in the web page
    tab.view.webContents
      .executeJavaScript(
        `
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    `
      )
      .catch((err) => {
        console.error("[Fullscreen] Failed to exit fullscreen:", err);
      });

    // Notify webview-preload to update state
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send("webview-fullscreen-exited");
    }
  }

  /**
   * Setup navigation event handlers
   */
  private setupNavigationHandlers(
    contents: Electron.WebContents,
    tabId: string
  ): void {
    contents.on("did-start-loading", () => {
      try {
        const url = contents.getURL();
        if (url) {
          const domain = new URL(url).hostname;
          const cachedColor = this.themeColorCache.get(domain);
          if (cachedColor) {
            this.state.latestThemeColor = cachedColor;
            if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
              this.state.mainWindow.webContents.send(
                "webcontents-theme-color-updated",
                cachedColor
              );
            }
          } else {
            this.state.latestThemeColor = null;
          }
        } else {
          this.state.latestThemeColor = null;
        }
      } catch (error) {
        this.state.latestThemeColor = null;
      }
      this.state.mainWindow?.webContents.send("webcontents-did-start-loading");
    });

    contents.on("did-stop-loading", () => {
      this.state.mainWindow?.webContents.send("webcontents-did-stop-loading");
      setTimeout(() => {
        this.captureTabPreview(tabId).catch((err) => {
          console.error("Failed to capture preview after loading:", err);
        });
      }, 500);
    });

    contents.on("did-navigate", (event: any, url: string) => {
      const tab = this.state.tabs.find((t) => t.id === tabId);
      if (tab) {
        tab.url = url;
        tab.title = contents.getTitle() || url;
      }

      this.state.mainWindow?.webContents.send("webcontents-did-navigate", url);

      if (this.state.activeTabId === tabId && this.state.mainWindow) {
        this.state.mainWindow.webContents.send("tabs-updated", {
          tabs: this.state.tabs.map((t) => ({
            id: t.id,
            title: t.title,
            url: t.url,
            preview: t.preview,
          })),
          activeTabId: this.state.activeTabId,
        });
      }
    });

    contents.on("did-navigate-in-page", (event: any, url: string) => {
      const tab = this.state.tabs.find((t) => t.id === tabId);
      if (tab) {
        tab.url = url;
        tab.title = contents.getTitle() || url;
      }

      this.state.mainWindow?.webContents.send(
        "webcontents-did-navigate-in-page",
        url
      );

      if (this.state.activeTabId === tabId && this.state.mainWindow) {
        this.state.mainWindow.webContents.send("tabs-updated", {
          tabs: this.state.tabs.map((t) => ({
            id: t.id,
            title: t.title,
            url: t.url,
            preview: t.preview,
          })),
          activeTabId: this.state.activeTabId,
        });
      }
    });

    contents.on("dom-ready", () => {
      this.state.mainWindow?.webContents.send("webcontents-dom-ready");
    });

    contents.on(
      "did-fail-load",
      (event: any, errorCode: number, errorDescription: string) => {
        this.state.mainWindow?.webContents.send(
          "webcontents-did-fail-load",
          errorCode,
          errorDescription
        );
      }
    );

    contents.on("render-process-gone", (event: any, details: any) => {
      this.state.mainWindow?.webContents.send(
        "webcontents-render-process-gone",
        details
      );
    });
  }
}
