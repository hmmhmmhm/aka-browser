/**
 * Main entry point for the Electron application
 */

import { app } from "electron";
import { AppState } from "./types";
import { ThemeColorCache } from "./theme-cache";
import { TabManager } from "./tab-manager";
import { WindowManager } from "./window-manager";
import { BookmarkManager } from "./bookmark-manager";
import { FaviconCache } from "./favicon-cache";
import { IPCHandlers } from "./ipc-handlers";
import { TrayManager } from "./tray-manager";
import { AppLifecycle } from "./app-lifecycle";

// Initialize application state
const appState: AppState = {
  mainWindow: null,
  tray: null,
  isAlwaysOnTop: false,
  webContentsView: null,
  isLandscape: false,
  tabs: [],
  activeTabId: null,
  latestThemeColor: null,
};

// Initialize managers
const themeColorCache = new ThemeColorCache();
const bookmarkManager = new BookmarkManager();
const faviconCache = new FaviconCache();
const tabManager = new TabManager(appState, themeColorCache);
const windowManager = new WindowManager(appState, tabManager);
const trayManager = new TrayManager(appState, windowManager);
const ipcHandlers = new IPCHandlers(appState, tabManager, windowManager, bookmarkManager, faviconCache, themeColorCache);
const appLifecycle = new AppLifecycle(appState, windowManager, trayManager);

// Initialize Widevine
appLifecycle.initializeWidevine();

// Wait for Widevine components on ready
app.on("ready", async () => {
  await appLifecycle.waitForWidevineComponents();
});

// Setup application when ready
app.whenReady().then(async () => {
  await appLifecycle.setupApp();
  ipcHandlers.registerHandlers();
});
