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
import { generateBlankPageHtml, generateErrorPageHtml } from "./html-generator";

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
  createTab(url: string = ""): Tab {
    const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const webviewPreloadPath = path.join(__dirname, "..", "webview-preload.js");
    const hasWebviewPreload = fs.existsSync(webviewPreloadPath);

    console.log("[TabManager] Creating tab with preload:", webviewPreloadPath);
    console.log("[TabManager] Preload exists:", hasWebviewPreload);

    const isDev = process.env.NODE_ENV === "development";
    
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: !isDev, // Disable webSecurity in dev mode to allow loading from Vite dev server
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
      title: !url || url.trim() === "" ? "Blank Page" : "New Tab",
      url,
    };

    this.state.tabs.push(tab);
    this.setupWebContentsViewHandlers(view, tabId);

    // Load URL or blank page
    if (!url || url.trim() === "") {
      // Immediately set blank-page theme color before loading
      const blankPageThemeColor = "#1c1c1e";
      this.state.latestThemeColor = blankPageThemeColor;
      if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
        this.state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          blankPageThemeColor
        );
      }
      
      // Load blank page for blank tabs
      const { app } = require("electron");
      
      if (isDev) {
        // In dev mode, use temporary file with Vite dev server URLs
        const devHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1c1c1e" />
    <title>Blank Page</title>
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://localhost:5173/pages/blank-page-entry.tsx"></script>
  </body>
</html>`;
        
        // Write to temporary file
        const tmpDir = path.join(app.getPath("temp"), "aka-browser");
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tmpHtmlPath = path.join(tmpDir, `blank-page-${tabId}.html`);
        fs.writeFileSync(tmpHtmlPath, devHtml, "utf-8");
        
        // Load from temporary file (file:// protocol with webSecurity disabled allows loading from http://)
        view.webContents.loadFile(tmpHtmlPath).catch((err) => {
          console.error("[TabManager] Failed to load blank page:", err);
        });
      } else {
        // In production, generate HTML and load from temporary file
        const distPath = path.join(app.getAppPath(), "dist-renderer");
        const scriptPath = path.join(distPath, "pages", "blank-page.js");
        
        const html = generateBlankPageHtml(scriptPath, undefined, false);
        
        // Write to temporary file
        const tmpDir = path.join(app.getPath("temp"), "aka-browser");
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        const tmpHtmlPath = path.join(tmpDir, `blank-page-${tabId}.html`);
        fs.writeFileSync(tmpHtmlPath, html, "utf-8");
        
        // Load from temporary file
        view.webContents.loadFile(tmpHtmlPath).catch((err) => {
          console.error("[TabManager] Failed to load blank page:", err);
        });
      }
    } else {
      const sanitized = sanitizeUrl(url);
      if (isValidUrl(sanitized)) {
        view.webContents.loadURL(sanitized);
      }
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

    // Immediately apply theme color for the switched tab
    const url = tab.view.webContents.getURL();
    if (url) {
      // Check if it's blank-page
      if (url.includes("blank-page.html")) {
        const blankPageThemeColor = "#1c1c1e";
        this.state.latestThemeColor = blankPageThemeColor;
        this.state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          blankPageThemeColor
        );
        tab.title = "Blank Page";
      } else if (url.startsWith("data:text/html")) {
        // Error page - apply error-page theme color
        const errorPageThemeColor = "#2d2d2d";
        this.state.latestThemeColor = errorPageThemeColor;
        this.state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          errorPageThemeColor
        );
      } else {
        // Try to get cached theme color for regular pages
        try {
          const domain = new URL(url).hostname;
          const cachedColor = this.themeColorCache.get(domain);
          if (cachedColor) {
            this.state.latestThemeColor = cachedColor;
            this.state.mainWindow.webContents.send(
              "webcontents-theme-color-updated",
              cachedColor
            );
          } else {
            this.state.latestThemeColor = null;
          }
        } catch (error) {
          this.state.latestThemeColor = null;
        }
      }
    } else {
      this.state.latestThemeColor = null;
    }

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

      const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
      console.log(
        `[Fullscreen][${timestamp}] enter-html-full-screen event received`
      );

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

        if (isCurrentlyLandscape) {
          // Landscape: gap on left and right to avoid rounded corners
          // Note: We ignore status bar space in fullscreen mode
          const bounds = {
            x: fullscreenGapHorizontal - 30,
            y: topBarHeight + deviceFramePadding,
            width: windowBounds.width - fullscreenGapHorizontal * 2,
            height: windowBounds.height - topBarHeight - deviceFramePadding * 2,
          };
          tab.view.setBounds(bounds);
        } else {
          // Portrait: gap on top and bottom to avoid rounded corners
          const bounds = {
            x: deviceFramePadding,
            y: topBarHeight + fullscreenGapVertical - 30,
            width: windowBounds.width - deviceFramePadding * 2,
            height:
              windowBounds.height -
              topBarHeight -
              fullscreenGapVertical -
              fullscreenGapVertical,
          };
          tab.view.setBounds(bounds);
        }

        // Notify renderer to hide status bar
        this.state.mainWindow.webContents.send("fullscreen-mode-changed", true);

        // Force a layout recalculation by resizing the main window
        // This ensures WebContentsView properly recalculates its size
        const windowBoundsNow = this.state.mainWindow.getBounds();
        this.state.mainWindow.setBounds({
          ...windowBoundsNow,
          height: windowBoundsNow.height + 1,
        });

        // Immediately restore to correct size and reapply adjusted bounds
        this.state.mainWindow.setBounds(windowBoundsNow);
        
        // Reapply the adjusted bounds after window resize
        if (isCurrentlyLandscape) {
          const adjustedBounds = {
            x: fullscreenGapHorizontal - 30,
            y: topBarHeight + deviceFramePadding,
            width: windowBounds.width - fullscreenGapHorizontal * 2,
            height: windowBounds.height - topBarHeight - deviceFramePadding * 2,
          };
          tab.view.setBounds(adjustedBounds);
        } else {
          const adjustedBounds = {
            x: deviceFramePadding,
            y: topBarHeight + fullscreenGapVertical - 30,
            width: windowBounds.width - deviceFramePadding * 2,
            height:
              windowBounds.height -
              topBarHeight -
              fullscreenGapVertical -
              fullscreenGapVertical,
          };
          tab.view.setBounds(adjustedBounds);
        }

        // Send fullscreen state immediately
        if (!tab.view.webContents.isDestroyed()) {
          tab.view.webContents.send("set-fullscreen-state", true);
        }
      }

    });

    contents.on("leave-html-full-screen", () => {
      const tab = this.state.tabs.find((t) => t.id === tabId);
      if (!tab) return;

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
            height: Math.round(
              windowBounds.height - topBarHeight - frameHalf * 2
            ),
          };
          tab.view.setBounds(bounds);
        } else {
          // Portrait mode: status bar is on the TOP
          const bounds = {
            x: Math.round(frameHalf),
            y: Math.round(topBarHeight + statusBarHeight + frameHalf),
            width: Math.round(windowBounds.width - frameHalf * 2),
            height: Math.round(
              windowBounds.height -
                topBarHeight -
                statusBarHeight -
                frameHalf * 2
            ),
          };
          tab.view.setBounds(bounds);
        }

        // Force a layout recalculation by resizing the main window
        const windowBoundsNow = this.state.mainWindow.getBounds();
        this.state.mainWindow.setBounds({
          ...windowBoundsNow,
          height: windowBoundsNow.height + 1,
        });

        // Immediately restore to correct size and reapply adjusted bounds
        this.state.mainWindow.setBounds(windowBoundsNow);
        
        // Reapply the adjusted bounds after window resize
        if (isCurrentlyLandscape) {
          const adjustedBounds = {
            x: statusBarWidth,
            y: Math.round(topBarHeight + frameHalf),
            width: Math.round(windowBounds.width - statusBarWidth - frameHalf),
            height: Math.round(
              windowBounds.height - topBarHeight - frameHalf * 2
            ),
          };
          tab.view.setBounds(adjustedBounds);
        } else {
          const adjustedBounds = {
            x: Math.round(frameHalf),
            y: Math.round(topBarHeight + statusBarHeight + frameHalf),
            width: Math.round(windowBounds.width - frameHalf * 2),
            height: Math.round(
              windowBounds.height -
                topBarHeight -
                statusBarHeight -
                frameHalf * 2
            ),
          };
          tab.view.setBounds(adjustedBounds);
        }

        // Send fullscreen state immediately
        if (!tab.view.webContents.isDestroyed()) {
          tab.view.webContents.send("set-fullscreen-state", false);
        }
      }

    });
  }

  /**
   * Exit fullscreen for a specific tab (called by ESC key handler)
   */
  exitFullscreen(tabId: string): void {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || !tab.isFullscreen) return;

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
      let displayUrl = url;
      
      if (tab) {
        // Set "/" URL and "Blank Page" title for blank-page
        if (url.includes("blank-page-tab-")) {
          tab.url = "/";
          tab.title = "Blank Page";
          displayUrl = "/";
        } else if (url.includes("error-page-tab-")) {
          // Error page - set URL to "/" and use actual title
          tab.url = "/";
          tab.title = contents.getTitle() || "Aka Browser cannot open the page";
          displayUrl = "/";
        } else {
          tab.url = url;
          tab.title = contents.getTitle() || url;
        }
      }

      this.state.mainWindow?.webContents.send("webcontents-did-navigate", displayUrl);

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
      let displayUrl = url;
      
      if (tab) {
        // Set "/" URL and "Blank Page" title for blank-page
        if (url.includes("blank-page-tab-")) {
          tab.url = "/";
          tab.title = "Blank Page";
          displayUrl = "/";
        } else if (url.includes("error-page-tab-")) {
          // Error page - set URL to "/" and use actual title
          tab.url = "/";
          tab.title = contents.getTitle() || "Aka Browser cannot open the page";
          displayUrl = "/";
        } else {
          tab.url = url;
          tab.title = contents.getTitle() || url;
        }
      }

      this.state.mainWindow?.webContents.send(
        "webcontents-did-navigate-in-page",
        displayUrl
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
      (event: any, errorCode: number, errorDescription: string, validatedURL: string, isMainFrame: boolean) => {
        // Ignore errorCode -3 (ERR_ABORTED) as it's usually from user navigation
        // Also ignore if it's not the main frame
        if (errorCode === -3 || !isMainFrame) {
          return;
        }

        console.log(
          `[TabManager] Page load failed: ${errorCode} (${errorDescription}) for ${validatedURL}`
        );

        // Load error page with details
        const { app } = require("electron");
        const statusText = this.getNetworkErrorText(errorCode, errorDescription);
        const isDev = process.env.NODE_ENV === "development";
        
        console.log(`[TabManager] Loading error page for error ${errorCode}`);

        // Use setTimeout with a longer delay to ensure the failed load is completely finished
        setTimeout(() => {
          if (!contents.isDestroyed()) {
            console.log(`[TabManager] Attempting to load error page now`);
            
            // Create query params object for error details
            const queryParamsObj = {
              statusCode: Math.abs(errorCode).toString(),
              statusText: statusText,
              url: validatedURL,
            };
            
            if (isDev) {
              // In dev mode, use temporary file with Vite dev server URLs
              const devHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2d2d2d" />
    <title>Error</title>
    <script>window.__QUERY_PARAMS__ = ${JSON.stringify(queryParamsObj)};</script>
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://localhost:5173/pages/error-page-entry.tsx"></script>
  </body>
</html>`;
              
              // Write to temporary file
              const tmpDir = path.join(app.getPath("temp"), "aka-browser");
              if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
              }
              const tmpHtmlPath = path.join(tmpDir, `error-page-${tabId}.html`);
              fs.writeFileSync(tmpHtmlPath, devHtml, "utf-8");
              
              // Load from temporary file (file:// protocol with webSecurity disabled allows loading from http://)
              contents.loadFile(tmpHtmlPath).then(() => {
                console.log(`[TabManager] Error page loaded successfully`);
                
                // Update tab info
                const tab = this.state.tabs.find((t) => t.id === tabId);
                if (tab) {
                  tab.url = "/";
                  tab.title = "Aka Browser cannot open the page";
                }
                
                // Apply error-page theme color immediately
                const errorPageThemeColor = "#2d2d2d";
                this.state.latestThemeColor = errorPageThemeColor;
                if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
                  this.state.mainWindow.webContents.send(
                    "webcontents-theme-color-updated",
                    errorPageThemeColor
                  );
                }
              }).catch((err) => {
                console.error(`[TabManager] Failed to load error page:`, err);
              });
            } else {
              // In production, generate HTML and load from temporary file
              const distPath = path.join(app.getAppPath(), "dist-renderer");
              const scriptPath = path.join(distPath, "pages", "error-page.js");
              const html = generateErrorPageHtml(scriptPath, undefined, queryParamsObj, false);
              
              // Write to temporary file
              const tmpDir = path.join(app.getPath("temp"), "aka-browser");
              if (!fs.existsSync(tmpDir)) {
                fs.mkdirSync(tmpDir, { recursive: true });
              }
              const tmpHtmlPath = path.join(tmpDir, `error-page-${tabId}.html`);
              fs.writeFileSync(tmpHtmlPath, html, "utf-8");
              
              // Load error page from temporary file
              contents.loadFile(tmpHtmlPath).then(() => {
                console.log(`[TabManager] Error page loaded successfully`);
                
                // Update tab info
                const tab = this.state.tabs.find((t) => t.id === tabId);
                if (tab) {
                  tab.url = "/";
                  tab.title = "Aka Browser cannot open the page";
                }
                
                // Apply error-page theme color immediately
                const errorPageThemeColor = "#2d2d2d";
                this.state.latestThemeColor = errorPageThemeColor;
                if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
                  this.state.mainWindow.webContents.send(
                    "webcontents-theme-color-updated",
                    errorPageThemeColor
                  );
                }
              }).catch((err) => {
                console.error(`[TabManager] Failed to load error page:`, err);
              });
            }
          } else {
            console.log(`[TabManager] Contents destroyed, cannot load error page`);
          }
        }, 100);

          // Notify renderer about the error
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

    // Monitor HTTP response codes and show error page for non-200 responses
    (contents as any).on(
      "did-get-response-details",
      (
        event: any,
        status: boolean,
        newURL: string,
        originalURL: string,
        httpResponseCode: number,
        requestMethod: string,
        referrer: string,
        headers: Record<string, string[]>,
        resourceType: string
      ) => {
        // Only handle main frame navigation responses (not images, scripts, etc.)
        if (resourceType !== "mainFrame") {
          return;
        }

        // Check if response code is not in the 2xx success range
        if (httpResponseCode < 200 || httpResponseCode >= 300) {
          console.log(
            `[TabManager] Non-success HTTP response: ${httpResponseCode} for ${originalURL}`
          );

          // Load error page with details
          const { app } = require("electron");
          const statusText = this.getStatusText(httpResponseCode);
          const isDev = process.env.NODE_ENV === "development";
          
          // Create query params object for error details
          const queryParamsObj = {
            statusCode: httpResponseCode.toString(),
            statusText: statusText,
            url: originalURL,
          };
          
          if (isDev) {
            // In dev mode, use temporary file with Vite dev server URLs
            const devHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2d2d2d" />
    <title>Error</title>
    <script>window.__QUERY_PARAMS__ = ${JSON.stringify(queryParamsObj)};</script>
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://localhost:5173/pages/error-page-entry.tsx"></script>
  </body>
</html>`;
            
            // Write to temporary file
            const tmpDir = path.join(app.getPath("temp"), "aka-browser");
            if (!fs.existsSync(tmpDir)) {
              fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tmpHtmlPath = path.join(tmpDir, `error-page-http-${tabId}.html`);
            fs.writeFileSync(tmpHtmlPath, devHtml, "utf-8");
            
            // Load from temporary file (file:// protocol with webSecurity disabled allows loading from http://)
            contents.loadFile(tmpHtmlPath).then(() => {
              // Update tab info
              const tab = this.state.tabs.find((t) => t.id === tabId);
              if (tab) {
                tab.url = "/";
                tab.title = "Aka Browser cannot open the page";
              }
              
              // Apply error-page theme color immediately
              const errorPageThemeColor = "#2d2d2d";
              this.state.latestThemeColor = errorPageThemeColor;
              if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
                this.state.mainWindow.webContents.send(
                  "webcontents-theme-color-updated",
                  errorPageThemeColor
                );
              }
            }).catch((err) => {
              console.error("Failed to load error page from data URL:", err);
            });
          } else {
            // In production, generate HTML and load from temporary file
            const distPath = path.join(app.getAppPath(), "dist-renderer");
            const scriptPath = path.join(distPath, "pages", "error-page.js");
            const html = generateErrorPageHtml(scriptPath, undefined, queryParamsObj, false);
            
            // Write to temporary file
            const tmpDir = path.join(app.getPath("temp"), "aka-browser");
            if (!fs.existsSync(tmpDir)) {
              fs.mkdirSync(tmpDir, { recursive: true });
            }
            const tmpHtmlPath = path.join(tmpDir, `error-page-${tabId}.html`);
            fs.writeFileSync(tmpHtmlPath, html, "utf-8");
            
            // Load the error page from temporary file
            contents.loadFile(tmpHtmlPath).then(() => {
              // Update tab info
              const tab = this.state.tabs.find((t) => t.id === tabId);
              if (tab) {
                tab.url = "/";
                tab.title = "Aka Browser cannot open the page";
              }
              
              // Apply error-page theme color immediately
              const errorPageThemeColor = "#2d2d2d";
              this.state.latestThemeColor = errorPageThemeColor;
              if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
                this.state.mainWindow.webContents.send(
                  "webcontents-theme-color-updated",
                  errorPageThemeColor
                );
              }
            }).catch((err) => {
              console.error("Failed to load error page:", err);
            });
          }

            // Notify renderer about the error
            this.state.mainWindow?.webContents.send(
              "webcontents-http-error",
              httpResponseCode,
              statusText,
              originalURL
            );
        }
      }
    );
  }

  /**
   * Get human-readable text for network errors
   */
  private getNetworkErrorText(errorCode: number, errorDescription: string): string {
    // Common Chromium network error codes
    const networkErrors: Record<number, string> = {
      [-1]: "Unknown Error",
      [-2]: "Failed",
      [-3]: "Aborted",
      [-4]: "Invalid Argument",
      [-5]: "Invalid Handle",
      [-6]: "File Not Found",
      [-7]: "Timed Out",
      [-10]: "Access Denied",
      [-21]: "Network Changed",
      [-23]: "Data Error",
      [-100]: "Connection Closed",
      [-101]: "Connection Reset",
      [-102]: "Connection Refused",
      [-103]: "Connection Aborted",
      [-104]: "Connection Failed",
      [-105]: "Name Not Resolved",
      [-106]: "Internet Disconnected",
      [-107]: "SSL Protocol Error",
      [-108]: "Address Invalid",
      [-109]: "Address Unreachable",
      [-110]: "SSL Client Auth Cert Needed",
      [-111]: "Tunnel Connection Failed",
      [-112]: "No SSL Versions Enabled",
      [-113]: "SSL Version or Cipher Mismatch",
      [-114]: "SSL Renegotiation Requested",
      [-115]: "Proxy Auth Unsupported",
      [-116]: "Cert Error in SSL Renegotiation",
      [-117]: "Bad SSL Client Auth Cert",
      [-118]: "Connection Timed Out",
      [-119]: "Host Resolver Queue Too Large",
      [-120]: "SOCKS Connection Failed",
      [-121]: "SOCKS Connection Host Unreachable",
      [-200]: "Cert Common Name Invalid",
      [-201]: "Cert Date Invalid",
      [-202]: "Cert Authority Invalid",
      [-203]: "Cert Contains Errors",
      [-204]: "Cert No Revocation Mechanism",
      [-205]: "Cert Unable to Check Revocation",
      [-206]: "Cert Revoked",
      [-207]: "Cert Invalid",
      [-208]: "Cert Weak Signature Algorithm",
      [-210]: "Cert Non Unique Name",
      [-211]: "Cert Weak Key",
      [-212]: "Cert Name Constraint Violation",
      [-213]: "Cert Validity Too Long",
      [-300]: "Invalid URL",
      [-301]: "Disallowed URL Scheme",
      [-302]: "Unknown URL Scheme",
      [-310]: "Too Many Redirects",
      [-320]: "Unsafe Redirect",
      [-321]: "Unsafe Port",
      [-322]: "Invalid Response",
      [-323]: "Invalid Chunked Encoding",
      [-324]: "Method Not Supported",
      [-325]: "Unexpected Proxy Auth",
      [-326]: "Empty Response",
      [-327]: "Response Headers Too Big",
      [-328]: "PAC Script Failed",
      [-329]: "Request Range Not Satisfiable",
      [-330]: "Malformed Identity",
      [-331]: "Content Decoding Failed",
      [-332]: "Network IO Suspended",
      [-333]: "SYN Reply Not Received",
      [-334]: "Encoding Conversion Failed",
      [-335]: "Unrecognized FTP Directory Listing Format",
      [-336]: "Invalid SPDY Stream",
      [-337]: "No Supported Proxies",
      [-338]: "SPDY Session Already Exists",
      [-339]: "Limit Violation",
      [-340]: "SPDY Protocol Error",
      [-341]: "Invalid Auth Credentials",
      [-342]: "Unsupported Auth Scheme",
      [-343]: "Encoding Detection Failed",
      [-344]: "Missing Auth Credentials",
      [-345]: "Unexpected Security Library Status",
      [-346]: "Misconfigured Auth Environment",
      [-347]: "Undocumented Security Library Status",
      [-348]: "Response Body Too Big Drain",
      [-349]: "Response Headers Multiple Content Length",
      [-350]: "Incomplete SPDY Headers",
      [-351]: "PAC Not In DHCP",
      [-352]: "Response Headers Multiple Content Disposition",
      [-353]: "Response Headers Multiple Location",
      [-354]: "SPDY Server Refused Stream",
      [-355]: "SPDY Ping Failed",
      [-356]: "Content Length Mismatch",
      [-357]: "Incomplete Chunked Encoding",
      [-358]: "QUIC Protocol Error",
      [-359]: "Response Headers Truncated",
      [-360]: "QUIC Handshake Failed",
      [-361]: "SPDY Inadequate Transport Security",
      [-362]: "SPDY Flow Control Error",
      [-363]: "SPDY Stream Closed",
      [-364]: "SPDY Frame Size Error",
      [-365]: "SPDY Compression Error",
      [-366]: "Proxy HTTP 1.1 Required",
      [-367]: "Proxy HTTP2 or QUIC Required",
      [-368]: "PAC Script Terminated",
      [-370]: "Invalid HTTP Response",
      [-371]: "Content Decoding Init Failed",
      [-372]: "HTTP2 Compression Error",
      [-373]: "HTTP2 Flow Control Error",
      [-374]: "HTTP2 Frame Size Error",
      [-375]: "HTTP2 Compression Error",
      [-376]: "HTTP2 RST Stream No Error Received",
      [-377]: "HTTP2 Pushed Stream Not Available",
      [-378]: "HTTP2 Claimed Pushed Stream Reset By Server",
      [-379]: "Too Many Retries",
      [-380]: "HTTP2 Stream Closed",
      [-381]: "HTTP2 Client Refused Stream",
      [-382]: "HTTP2 Pushed Response Does Not Match",
      [-400]: "Cache Miss",
      [-401]: "Cache Read Failure",
      [-402]: "Cache Write Failure",
      [-403]: "Cache Operation Not Supported",
      [-404]: "Cache Open Failure",
      [-405]: "Cache Create Failure",
      [-406]: "Cache Race",
      [-407]: "Cache Checksum Read Failure",
      [-408]: "Cache Checksum Mismatch",
      [-409]: "Cache Lock Timeout",
      [-501]: "Insecure Response",
      [-502]: "No Private Key for Cert",
      [-503]: "Add User Cert Failed",
      [-800]: "DNS Malformed Response",
      [-801]: "DNS Server Requires TCP",
      [-802]: "DNS Server Failed",
      [-803]: "DNS Transaction ID Mismatch",
      [-804]: "DNS Name HTTPS Only",
      [-805]: "DNS Request Cancelled",
    };

    return networkErrors[errorCode] || errorDescription || "Network Error";
  }

  /**
   * Get human-readable status text for HTTP status codes
   */
  private getStatusText(statusCode: number): string {
    const statusTexts: Record<number, string> = {
      // 4xx Client Errors
      400: "Bad Request",
      401: "Unauthorized",
      402: "Payment Required",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      406: "Not Acceptable",
      407: "Proxy Authentication Required",
      408: "Request Timeout",
      409: "Conflict",
      410: "Gone",
      411: "Length Required",
      412: "Precondition Failed",
      413: "Payload Too Large",
      414: "URI Too Long",
      415: "Unsupported Media Type",
      416: "Range Not Satisfiable",
      417: "Expectation Failed",
      418: "I'm a teapot",
      421: "Misdirected Request",
      422: "Unprocessable Entity",
      423: "Locked",
      424: "Failed Dependency",
      425: "Too Early",
      426: "Upgrade Required",
      428: "Precondition Required",
      429: "Too Many Requests",
      431: "Request Header Fields Too Large",
      451: "Unavailable For Legal Reasons",
      // 5xx Server Errors
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
      505: "HTTP Version Not Supported",
      506: "Variant Also Negotiates",
      507: "Insufficient Storage",
      508: "Loop Detected",
      510: "Not Extended",
      511: "Network Authentication Required",
    };

    return statusTexts[statusCode] || "Unknown Error";
  }

}
