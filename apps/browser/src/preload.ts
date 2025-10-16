import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // Add any APIs you want to expose to the renderer process here
  platform: process.platform,
  closeWindow: () => ipcRenderer.send("window-close"),
  minimizeWindow: () => ipcRenderer.send("window-minimize"),
  maximizeWindow: () => ipcRenderer.send("window-maximize"),
  // Navigation gesture listeners
  onNavigateBack: (callback: () => void) => {
    ipcRenderer.on("navigate-back", callback);
    return () => ipcRenderer.removeListener("navigate-back", callback);
  },
  onNavigateForward: (callback: () => void) => {
    ipcRenderer.on("navigate-forward", callback);
    return () => ipcRenderer.removeListener("navigate-forward", callback);
  },
  // Webview reload listener
  onWebviewReload: (callback: () => void) => {
    ipcRenderer.on("webview-reload", callback);
    return () => ipcRenderer.removeListener("webview-reload", callback);
  },
  // Theme detection
  getSystemTheme: () => ipcRenderer.invoke("get-system-theme"),
  onThemeChanged: (callback: (theme: "light" | "dark") => void) => {
    ipcRenderer.on("theme-changed", (_event, theme) => callback(theme));
    return () => ipcRenderer.removeAllListeners("theme-changed");
  },
  // Orientation APIs
  getOrientation: () => ipcRenderer.invoke("get-orientation"),
  toggleOrientation: () => ipcRenderer.invoke("toggle-orientation"),
  onOrientationChanged: (
    callback: (orientation: "portrait" | "landscape") => void
  ) => {
    ipcRenderer.on("orientation-changed", (_event, orientation) =>
      callback(orientation)
    );
    return () => ipcRenderer.removeAllListeners("orientation-changed");
  },

  // Tab management APIs
  tabs: {
    getAll: () => ipcRenderer.invoke("tabs-get-all"),
    create: (url?: string) => ipcRenderer.invoke("tabs-create", url),
    switch: (tabId: string) => ipcRenderer.invoke("tabs-switch", tabId),
    close: (tabId: string) => ipcRenderer.invoke("tabs-close", tabId),
    onTabChanged: (callback: (data: { tabId: string; tabs: any[] }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("tab-changed", listener);
      return () => ipcRenderer.removeListener("tab-changed", listener);
    },
    onTabsUpdated: (callback: (data: { tabs: any[]; activeTabId: string | null }) => void) => {
      const listener = (_event: any, data: any) => callback(data);
      ipcRenderer.on("tabs-updated", listener);
      return () => ipcRenderer.removeListener("tabs-updated", listener);
    },
  },

  // WebContentsView control APIs
  webContents: {
    loadURL: (url: string) => ipcRenderer.invoke("webcontents-load-url", url),
    goBack: () => ipcRenderer.invoke("webcontents-go-back"),
    goForward: () => ipcRenderer.invoke("webcontents-go-forward"),
    reload: () => ipcRenderer.invoke("webcontents-reload"),
    canGoBack: () => ipcRenderer.invoke("webcontents-can-go-back"),
    canGoForward: () => ipcRenderer.invoke("webcontents-can-go-forward"),
    getURL: () => ipcRenderer.invoke("webcontents-get-url"),
    getTitle: () => ipcRenderer.invoke("webcontents-get-title"),
    setVisible: (visible: boolean) => ipcRenderer.invoke("webcontents-set-visible", visible),
    // Removed executeJavaScript for security - use specific APIs instead
    getThemeColor: () => ipcRenderer.invoke("webcontents-get-theme-color"),
    setBounds: (bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => ipcRenderer.invoke("webcontents-set-bounds", bounds),
    setStatusBarBounds: (bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => ipcRenderer.invoke("statusbar-set-bounds", bounds),
    setDeviceFrameBounds: (bounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => ipcRenderer.invoke("deviceframe-set-bounds", bounds),

    // Event listeners
    onDidStartLoading: (callback: () => void) => {
      ipcRenderer.on("webcontents-did-start-loading", callback);
      return () =>
        ipcRenderer.removeListener("webcontents-did-start-loading", callback);
    },
    onDidStopLoading: (callback: () => void) => {
      ipcRenderer.on("webcontents-did-stop-loading", callback);
      return () =>
        ipcRenderer.removeListener("webcontents-did-stop-loading", callback);
    },
    onDidNavigate: (callback: (url: string) => void) => {
      const listener = (_event: any, url: string) => callback(url);
      ipcRenderer.on("webcontents-did-navigate", listener);
      return () =>
        ipcRenderer.removeListener("webcontents-did-navigate", listener);
    },
    onDidNavigateInPage: (callback: (url: string) => void) => {
      const listener = (_event: any, url: string) => callback(url);
      ipcRenderer.on("webcontents-did-navigate-in-page", listener);
      return () =>
        ipcRenderer.removeListener(
          "webcontents-did-navigate-in-page",
          listener
        );
    },
    onDomReady: (callback: () => void) => {
      ipcRenderer.on("webcontents-dom-ready", callback);
      return () =>
        ipcRenderer.removeListener("webcontents-dom-ready", callback);
    },
    onDidFailLoad: (
      callback: (errorCode: number, errorDescription: string) => void
    ) => {
      const listener = (
        _event: any,
        errorCode: number,
        errorDescription: string
      ) => callback(errorCode, errorDescription);
      ipcRenderer.on("webcontents-did-fail-load", listener);
      return () =>
        ipcRenderer.removeListener("webcontents-did-fail-load", listener);
    },
    onRenderProcessGone: (callback: (details: any) => void) => {
      const listener = (_event: any, details: any) => callback(details);
      ipcRenderer.on("webcontents-render-process-gone", listener);
      return () =>
        ipcRenderer.removeListener("webcontents-render-process-gone", listener);
    },
  },
});
