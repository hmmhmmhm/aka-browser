/**
 * IPC handlers for communication between main and renderer processes
 */

import { ipcMain, app, nativeTheme } from "electron";
import { AppState } from "./types";
import { BrowsingDataManager } from "./browsing-data-manager";
import { TabManager } from "./tab-manager";
import { WindowManager } from "./window-manager";
import { BookmarkManager } from "./bookmark-manager";
import { FaviconCache } from "./favicon-cache";
import { isValidUrl, sanitizeUrl, getUserAgentForUrl, logSecurityEvent } from "./security";
import { ThemeColorCache } from "./theme-cache";
import { PermissionManager } from "./permission-manager";
import {
  registerBookmarkHandlers,
  registerFaviconHandlers,
} from "./ipc/bookmark-favicon-handlers";
import { registerPermissionHandlers } from "./ipc/permission-handlers";
import { registerBrowsingDataHandlers } from "./ipc/browsing-data-handlers";
import { LanguageManager } from "./language-manager";

export class IPCHandlers {
  private state: AppState;
  private tabManager: TabManager;
  private windowManager: WindowManager;
  private bookmarkManager: BookmarkManager;
  private faviconCache: FaviconCache;
  private themeColorCache: ThemeColorCache;
  private languageManager: LanguageManager;
  private permissionManager: PermissionManager;
  private browsingDataManager: BrowsingDataManager;

  constructor(
    state: AppState,
    tabManager: TabManager,
    windowManager: WindowManager,
    bookmarkManager: BookmarkManager,
    faviconCache: FaviconCache,
    themeColorCache: ThemeColorCache,
    languageManager: LanguageManager,
    permissionManager: PermissionManager,
    browsingDataManager: BrowsingDataManager
  ) {
    this.state = state;
    this.tabManager = tabManager;
    this.windowManager = windowManager;
    this.bookmarkManager = bookmarkManager;
    this.faviconCache = faviconCache;
    this.themeColorCache = themeColorCache;
    this.languageManager = languageManager;
    this.permissionManager = permissionManager;
    this.browsingDataManager = browsingDataManager;
  }

  /**
   * Register all IPC handlers
   */
  registerHandlers(): void {
    this.registerWindowHandlers();
    this.registerTabHandlers();
    this.registerWebContentsHandlers();
    this.registerThemeHandlers();
    this.registerOrientationHandlers();
    this.registerAppHandlers();
    registerPermissionHandlers(this.state, this.permissionManager);
    registerBrowsingDataHandlers(this.state, this.browsingDataManager);
    registerBookmarkHandlers(this.state, this.bookmarkManager);
    registerFaviconHandlers(this.faviconCache);
  }

  /**
   * Register window control handlers
   */
  private registerWindowHandlers(): void {
    ipcMain.on("window-close", () => {
      if (this.state.mainWindow && this.state.tray) {
        this.state.mainWindow.hide();
      } else {
        app.quit();
      }
    });

    ipcMain.on("window-minimize", () => {
      if (this.state.mainWindow) {
        this.state.mainWindow.minimize();
      }
    });

    ipcMain.on("window-maximize", () => {
      if (this.state.mainWindow) {
        if (this.state.mainWindow.isMaximized()) {
          this.state.mainWindow.unmaximize();
        } else {
          this.state.mainWindow.maximize();
        }
      }
    });

    ipcMain.on("open-webview-devtools", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized DevTools access attempt");
        return;
      }

      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        this.state.webContentsView.webContents.openDevTools({ mode: "detach" });
      }
    });
  }

  /**
   * Register tab management handlers
   */
  private registerTabHandlers(): void {
    ipcMain.handle("tabs-get-all", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to tabs-get-all");
        return { tabs: [], activeTabId: null };
      }

      return {
        tabs: this.state.tabs.map((t) => ({
          id: t.id,
          title: t.title,
          url: t.url,
          preview: t.preview,
        })),
        activeTabId: this.state.activeTabId,
      };
    });

    ipcMain.handle("tabs-create", (event, url?: string) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to tabs-create");
        throw new Error("Unauthorized");
      }

      const newTab = this.tabManager.createTab(url);
      this.tabManager.switchToTab(newTab.id);

      return {
        id: newTab.id,
        title: newTab.title,
        url: newTab.url,
      };
    });

    ipcMain.handle("tabs-switch", (event, tabId: string) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to tabs-switch");
        throw new Error("Unauthorized");
      }

      this.tabManager.switchToTab(tabId);
    });

    ipcMain.handle("tabs-close", (event, tabId: string) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to tabs-close");
        throw new Error("Unauthorized");
      }

      this.tabManager.closeTab(tabId);
    });

    ipcMain.handle("tabs-close-all", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to tabs-close-all");
        throw new Error("Unauthorized");
      }

      this.tabManager.closeAllTabs();
    });
  }

  /**
   * Register WebContents control handlers
   */
  private registerWebContentsHandlers(): void {
    ipcMain.handle("webcontents-set-visible", (event, visible: boolean) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-set-visible");
        throw new Error("Unauthorized");
      }

      if (this.state.webContentsView && this.state.mainWindow) {
        if (visible) {
          if (!this.state.mainWindow.contentView.children.includes(this.state.webContentsView)) {
            this.state.mainWindow.contentView.addChildView(this.state.webContentsView);
          }
        } else {
          if (this.state.mainWindow.contentView.children.includes(this.state.webContentsView)) {
            this.state.mainWindow.contentView.removeChildView(this.state.webContentsView);
          }
        }
      }
    });

    ipcMain.handle("webcontents-load-url", (event, url: string) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-load-url");
        throw new Error("Unauthorized");
      }

      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        const sanitized = sanitizeUrl(url);
        if (isValidUrl(sanitized)) {
          const userAgent = getUserAgentForUrl(sanitized);
          this.state.webContentsView.webContents.setUserAgent(userAgent);
          this.state.webContentsView.webContents.loadURL(sanitized);
        } else {
          logSecurityEvent(`Rejected invalid URL`, { url });
          throw new Error(`Invalid URL`);
        }
      }
    });

    ipcMain.handle("webcontents-go-back", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-go-back");
        throw new Error("Unauthorized");
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        this.state.webContentsView.webContents.navigationHistory.goBack();
      }
    });

    ipcMain.handle("webcontents-go-forward", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-go-forward");
        throw new Error("Unauthorized");
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        this.state.webContentsView.webContents.navigationHistory.goForward();
      }
    });

    ipcMain.handle("webcontents-reload", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-reload");
        throw new Error("Unauthorized");
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        this.state.webContentsView.webContents.reload();
      }
    });

    ipcMain.handle("webcontents-can-go-back", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-can-go-back");
        return false;
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        return this.state.webContentsView.webContents.navigationHistory.canGoBack();
      }
      return false;
    });

    ipcMain.handle("webcontents-can-go-forward", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-can-go-forward");
        return false;
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        return this.state.webContentsView.webContents.navigationHistory.canGoForward();
      }
      return false;
    });

    ipcMain.handle("webcontents-get-url", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-get-url");
        return "";
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        const url = this.state.webContentsView.webContents.getURL();
        console.log("[IPC] webcontents-get-url raw URL:", url);
        // Return "/" for blank-page and error-page
        if (url.includes("blank-page-tab-") || url.includes("error-page-tab-")) {
          console.log("[IPC] Returning / for temporary file");
          return "/";
        }
        console.log("[IPC] Returning original URL:", url);
        return url;
      }
      return "";
    });

    ipcMain.handle("webcontents-get-title", (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-get-title");
        return "";
      }
      if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
        const url = this.state.webContentsView.webContents.getURL();
        // Return "Blank Page" for blank-page
        if (url.includes("blank-page-tab-")) {
          return "Blank Page";
        }
        // Return actual title for error-page (it's set in the HTML)
        if (url.includes("error-page-tab-")) {
          return this.state.webContentsView.webContents.getTitle();
        }
        return this.state.webContentsView.webContents.getTitle();
      }
      return "";
    });

    ipcMain.handle(
      "webcontents-set-bounds",
      (event, bounds: { x: number; y: number; width: number; height: number }) => {
        if (event.sender !== this.state.mainWindow?.webContents) {
          logSecurityEvent("Unauthorized IPC call to webcontents-set-bounds");
          throw new Error("Unauthorized");
        }
        if (this.state.webContentsView) {
          this.state.webContentsView.setBounds(bounds);
        }
      }
    );

    // Handle navigation gestures from WebContentsView
    ipcMain.on("webview-navigate-back", (event) => {
      if (this.state.webContentsView && event.sender === this.state.webContentsView.webContents) {
        if (this.state.webContentsView.webContents.navigationHistory.canGoBack()) {
          this.state.webContentsView.webContents.navigationHistory.goBack();
        }
      }
    });

    ipcMain.on("webview-navigate-forward", (event) => {
      if (this.state.webContentsView && event.sender === this.state.webContentsView.webContents) {
        if (this.state.webContentsView.webContents.navigationHistory.canGoForward()) {
          this.state.webContentsView.webContents.navigationHistory.goForward();
        }
      }
    });
  }

  /**
   * Register theme-related handlers
   */
  private registerThemeHandlers(): void {
    ipcMain.handle("get-system-theme", () => {
      return nativeTheme.shouldUseDarkColors ? "dark" : "light";
    });

    ipcMain.handle("webcontents-get-theme-color", async (event) => {
      if (event.sender !== this.state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to webcontents-get-theme-color");
        return null;
      }
      return this.state.latestThemeColor;
    });

    // Receive theme color from webview preload script
    ipcMain.on(
      "webview-theme-color-extracted",
      (event, data: { themeColor: string; domain: string }) => {
        if (this.state.webContentsView && event.sender === this.state.webContentsView.webContents) {
          const { themeColor, domain } = data;
          this.state.latestThemeColor = themeColor;

          if (domain && themeColor) {
            this.themeColorCache.set(domain, themeColor);
          }

          if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
            this.state.mainWindow.webContents.send(
              "webcontents-theme-color-updated",
              themeColor
            );
          }
        }
      }
    );

    // Listen for system theme changes
    nativeTheme.on("updated", () => {
      const theme = nativeTheme.shouldUseDarkColors ? "dark" : "light";
      if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
        this.state.mainWindow.webContents.send("theme-changed", theme);
      }
    });
  }

  /**
   * Register orientation handlers
   */
  private registerOrientationHandlers(): void {
    ipcMain.handle("get-orientation", () => {
      return this.state.isLandscape ? "landscape" : "portrait";
    });

    ipcMain.handle("toggle-orientation", () => {
      return this.windowManager.toggleOrientation();
    });
  }

  /**
   * Register app-related handlers
   */
  private registerAppHandlers(): void {
    ipcMain.handle("get-app-version", () => {
      return app.getVersion();
    });

    ipcMain.handle("get-language-state", () => {
      return this.languageManager.getState();
    });

    ipcMain.handle("set-preferred-language", (_event, language: any) => {
      const nextState = this.languageManager.setPreferredLanguage(language);
      this.state.language = nextState.effectiveLanguage;

      if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
        this.state.mainWindow.webContents.send("language-changed", nextState);
      }

      return nextState;
    });
  }

}
