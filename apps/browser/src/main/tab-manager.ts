/**
 * Tab management functionality
 */

import { WebContentsView, Menu } from "electron";
import path from "path";
import fs from "fs";
import { Tab, AppState } from "./types";
import { isValidUrl, sanitizeUrl, getUserAgentForUrl, logSecurityEvent } from "./security";
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
        if (permission === "media") {
          callback(true); // Allow media permissions for DRM
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
      const currentTab = this.state.tabs.find((t) => t.id === this.state.activeTabId);
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
  private setupWebContentsViewHandlers(view: WebContentsView, tabId: string): void {
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
          this.state.mainWindow.webContents.send("navigation-blocked", navigationUrl);
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
  }

  /**
   * Setup navigation event handlers
   */
  private setupNavigationHandlers(contents: Electron.WebContents, tabId: string): void {
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

      this.state.mainWindow?.webContents.send("webcontents-did-navigate-in-page", url);

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
      this.state.mainWindow?.webContents.send("webcontents-render-process-gone", details);
    });
  }
}
