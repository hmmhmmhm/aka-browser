/**
 * Type definitions for the application
 */

import { WebContentsView } from "electron";

export interface Tab {
  id: string;
  view: WebContentsView;
  title: string;
  url: string;
  preview?: string; // Base64 encoded preview image
  isFullscreen?: boolean; // Track if this tab is in fullscreen mode
  originalBounds?: Electron.Rectangle; // Store original bounds for restoration
}

export interface AppState {
  mainWindow: Electron.BrowserWindow | null;
  tray: Electron.Tray | null;
  isAlwaysOnTop: boolean;
  webContentsView: WebContentsView | null;
  isLandscape: boolean;
  tabs: Tab[];
  activeTabId: string | null;
  latestThemeColor: string | null;
}
