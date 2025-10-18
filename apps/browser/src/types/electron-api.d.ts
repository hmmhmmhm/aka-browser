/**
 * Type definitions for window.electronAPI exposed via preload script
 */

interface Tab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
}

interface TabsData {
  tabs: Tab[];
  activeTabId: string | null;
}

interface TabChangedData {
  tabId: string;
  tabs: Tab[];
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ElectronAPI {
  platform: NodeJS.Platform;
  closeWindow: () => void;
  minimizeWindow: () => void;
  maximizeWindow: () => void;

  // Navigation gesture listeners
  onNavigateBack: (callback: () => void) => () => void;
  onNavigateForward: (callback: () => void) => () => void;

  // Webview reload listener
  onWebviewReload: (callback: () => void) => () => void;

  // Theme detection
  getSystemTheme: () => Promise<'light' | 'dark'>;
  onThemeChanged: (callback: (theme: 'light' | 'dark') => void) => () => void;

  // Orientation APIs
  getOrientation: () => Promise<'portrait' | 'landscape'>;
  toggleOrientation: () => Promise<void>;
  onOrientationChanged: (callback: (orientation: 'portrait' | 'landscape') => void) => () => void;

  // Tab management APIs
  tabs: {
    getAll: () => Promise<TabsData>;
    create: (url?: string) => Promise<void>;
    switch: (tabId: string) => Promise<void>;
    close: (tabId: string) => Promise<void>;
    closeAll: () => Promise<void>;
    onTabChanged: (callback: (data: TabChangedData) => void) => () => void;
    onTabsUpdated: (callback: (data: TabsData) => void) => () => void;
  };

  // WebContentsView control APIs
  webContents: {
    loadURL: (url: string) => Promise<void>;
    goBack: () => Promise<void>;
    goForward: () => Promise<void>;
    reload: () => Promise<void>;
    canGoBack: () => Promise<boolean>;
    canGoForward: () => Promise<boolean>;
    getURL: () => Promise<string>;
    getTitle: () => Promise<string>;
    setVisible: (visible: boolean) => Promise<void>;
    getThemeColor: () => Promise<string>;
    setBounds: (bounds: Bounds) => Promise<void>;
    setStatusBarBounds: (bounds: Bounds) => Promise<void>;
    setDeviceFrameBounds: (bounds: Bounds) => Promise<void>;

    // Event listeners
    onDidStartLoading: (callback: () => void) => () => void;
    onDidStopLoading: (callback: () => void) => () => void;
    onDidNavigate: (callback: (url: string) => void) => () => void;
    onDidNavigateInPage: (callback: (url: string) => void) => () => void;
    onDomReady: (callback: () => void) => () => void;
    onDidFailLoad: (callback: (errorCode: number, errorDescription: string) => void) => () => void;
    onRenderProcessGone: (callback: (details: any) => void) => () => void;
  };
}

interface Window {
  electronAPI?: ElectronAPI;
}
