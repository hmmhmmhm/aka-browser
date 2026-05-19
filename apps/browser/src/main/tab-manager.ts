/**
 * Tab management — orchestrator.
 *
 * Delegates:
 *  - Error-code lookups  → tabs/tab-error-codes.ts
 *  - Blank/error page loading → tabs/tab-page-loader.ts
 *  - Fullscreen handlers → tabs/tab-fullscreen.ts
 *  - Navigation handlers → tabs/tab-navigation.ts
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
import { classifyNavigationTarget } from "./security-policy";
import {
  PermissionManager,
  SitePermission,
  normalizeOrigin,
} from "./permission-manager";
import { ThemeColorCache } from "./theme-cache";
import { loadBlankPage } from "./tabs/tab-page-loader";
import {
  setupFullscreenHandlers,
  exitFullscreen as doExitFullscreen,
} from "./tabs/tab-fullscreen";
import { setupNavigationHandlers } from "./tabs/tab-navigation";

export class TabManager {
  private state: AppState;
  private themeColorCache: ThemeColorCache;
  private permissionManager: PermissionManager;

  constructor(
    state: AppState,
    themeColorCache: ThemeColorCache,
    permissionManager: PermissionManager
  ) {
    this.state = state;
    this.themeColorCache = themeColorCache;
    this.permissionManager = permissionManager;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Create a new tab, optionally loading the given URL. */
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
        webSecurity: !isDev, // Allow Vite dev server in dev mode
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
      (webContents: any, permission: string, callback: (result: boolean) => void, details?: any) => {
        callback(this.shouldGrantPermission(webContents, permission, details));
      }
    );

    // Set initial user agent based on URL
    view.webContents.setUserAgent(getUserAgentForUrl(url));

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
      // Pre-apply blank-page theme color
      const blankPageThemeColor = "#1c1c1e";
      this.state.latestThemeColor = blankPageThemeColor;
      if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
        this.state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          blankPageThemeColor
        );
      }
      loadBlankPage(view.webContents, tabId);
    } else {
      const sanitized = sanitizeUrl(url);
      if (isValidUrl(sanitized)) {
        view.webContents.loadURL(sanitized);
      }
    }

    return tab;
  }

  private shouldGrantPermission(
    webContents: Electron.WebContents,
    permission: string,
    details?: { requestingUrl?: string; embeddingOrigin?: string }
  ): boolean {
    const sitePermission = toSitePermission(permission);
    if (!sitePermission) {
      logSecurityEvent(`Permission denied: ${permission}`);
      return false;
    }

    const origin = normalizeOrigin(
      details?.requestingUrl || details?.embeddingOrigin || webContents.getURL()
    );
    if (!origin) {
      return sitePermission === "media" || sitePermission === "fullscreen";
    }

    const decision = this.permissionManager.getDecision(origin, sitePermission);
    if (decision === "allow") return true;
    if (decision === "block") return false;

    return sitePermission === "media" || sitePermission === "fullscreen";
  }

  /** Switch the active tab, updating the window's child-view stack. */
  switchToTab(tabId: string): void {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || !this.state.mainWindow) return;

    // Capture preview of the currently-active tab before hiding it
    if (this.state.activeTabId && this.state.activeTabId !== tabId) {
      const currentTab = this.state.tabs.find(
        (t) => t.id === this.state.activeTabId
      );
      if (currentTab) {
        this.captureTabPreview(this.state.activeTabId).catch((err) => {
          console.error("Failed to capture preview on tab switch:", err);
        });
        this.state.mainWindow.contentView.removeChildView(currentTab.view);
      }
    }

    this.state.webContentsView = tab.view;
    this.state.activeTabId = tabId;

    // Apply theme color for the incoming tab immediately
    this.applyThemeColorOnSwitch(tab);

    if (!this.state.mainWindow.contentView.children.includes(tab.view)) {
      this.state.mainWindow.contentView.addChildView(tab.view);
    }

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

  /** Close a tab and switch to an adjacent one (or create a new tab if last). */
  closeTab(tabId: string): void {
    const tabIndex = this.state.tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    const tab = this.state.tabs[tabIndex];

    if (this.state.mainWindow) {
      this.state.mainWindow.contentView.removeChildView(tab.view);
    }
    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.close();
    }

    this.state.tabs.splice(tabIndex, 1);

    if (this.state.activeTabId === tabId) {
      if (this.state.tabs.length > 0) {
        const newActive = this.state.tabs[Math.max(0, tabIndex - 1)];
        this.switchToTab(newActive.id);
      } else {
        const newTab = this.createTab();
        this.switchToTab(newTab.id);
      }
    } else if (this.state.mainWindow) {
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

  /** Close every open tab and open a single new blank tab. */
  closeAllTabs(): void {
    const tabsToClose = [...this.state.tabs];
    tabsToClose.forEach((tab) => {
      this.state.mainWindow?.contentView.removeChildView(tab.view);
      if (!tab.view.webContents.isDestroyed()) {
        tab.view.webContents.close();
      }
    });

    this.state.tabs.length = 0;
    const newTab = this.createTab();
    this.switchToTab(newTab.id);
  }

  /** Exit fullscreen for a tab (ESC-key handler entry point). */
  exitFullscreen(tabId: string): void {
    doExitFullscreen(tabId, this.state);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Capture a low-res preview screenshot of `tabId` and store on the tab. */
  async captureTabPreview(tabId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId);
    if (!tab || tab.view.webContents.isDestroyed()) return;

    try {
      const image = await tab.view.webContents.capturePage({
        x: 0,
        y: 0,
        width: 800,
        height: 1200,
      });
      tab.preview = image.toDataURL();

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
   * Apply the correct theme color when switching to `tab`.
   * Reads from the theme-color cache for known domains, falls back to null.
   */
  private applyThemeColorOnSwitch(tab: Tab): void {
    if (!this.state.mainWindow) return;

    const url = tab.view.webContents.getURL();
    if (!url) {
      this.state.latestThemeColor = null;
      return;
    }

    if (url.includes("blank-page.html")) {
      const color = "#1c1c1e";
      this.state.latestThemeColor = color;
      this.state.mainWindow.webContents.send(
        "webcontents-theme-color-updated",
        color
      );
      tab.title = "Blank Page";
      return;
    }

    if (url.startsWith("data:text/html")) {
      const color = "#2d2d2d";
      this.state.latestThemeColor = color;
      this.state.mainWindow.webContents.send(
        "webcontents-theme-color-updated",
        color
      );
      return;
    }

    try {
      const domain = new URL(url).hostname;
      const cached = this.themeColorCache.get(domain);
      if (cached) {
        this.state.latestThemeColor = cached;
        this.state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          cached
        );
      } else {
        this.state.latestThemeColor = null;
      }
    } catch {
      this.state.latestThemeColor = null;
    }
  }

  /**
   * Wire up all WebContentsView event listeners: context-menu, security
   * checks, window-open interception, fullscreen, and navigation.
   */
  private setupWebContentsViewHandlers(
    view: WebContentsView,
    tabId: string
  ): void {
    const contents = view.webContents;

    // Send initial orientation when DOM is ready
    contents.on("dom-ready", () => {
      const orientation = this.state.isLandscape ? "landscape" : "portrait";
      contents.send("orientation-changed", orientation);
    });

    // Right-click context menu
    contents.on("context-menu", (_event: any, params: any) => {
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

    // Block invalid navigation URLs
    contents.on("will-navigate", (_event: any, navigationUrl: string) => {
      const decision = classifyNavigationTarget(navigationUrl);
      if (decision.kind !== "web" || !isValidUrl(decision.url)) {
        _event.preventDefault();
        logSecurityEvent(
          decision.kind === "blocked"
            ? decision.reason
            : "External protocol requires confirmation",
          { url: navigationUrl }
        );
        if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
          this.state.mainWindow.webContents.send(
            "navigation-blocked",
            navigationUrl
          );
        }
      } else {
        contents.setUserAgent(getUserAgentForUrl(decision.url));
      }
    });

    // Intercept new-window requests and open them as tabs instead
    contents.setWindowOpenHandler(({ url }: { url: string }) => {
      const decision = classifyNavigationTarget(url);
      if (decision.kind !== "web" || !isValidUrl(decision.url)) {
        logSecurityEvent(
          decision.kind === "blocked"
            ? decision.reason
            : "External protocol requires confirmation",
          { url }
        );
        return { action: "deny" };
      }
      const newTab = this.createTab(decision.url);
      this.switchToTab(newTab.id);
      return { action: "deny" };
    });

    contents.on("render-process-gone", (_event: any, details: any) => {
      console.error("Render process crashed:", details);
    });

    // Delegate fullscreen and navigation to sub-modules
    setupFullscreenHandlers(contents, tabId, this.state);
    setupNavigationHandlers(
      contents,
      tabId,
      this.state,
      this.themeColorCache,
      (id) => this.captureTabPreview(id)
    );
  }
}

function toSitePermission(permission: string): SitePermission | null {
  if (permission === "clipboard-sanitized-write") return "clipboard-write";
  if (
    permission === "media" ||
    permission === "clipboard-read" ||
    permission === "clipboard-write" ||
    permission === "fullscreen"
  ) {
    return permission;
  }
  return null;
}
