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
import { HistoryManager } from "./history-manager";
import { PermissionManager } from "./permission-manager";
import { SessionManager } from "./session-manager";
import { IPCHandlers } from "./ipc-handlers";
import { TrayManager } from "./tray-manager";
import { AppLifecycle } from "./app-lifecycle";
import { LanguageManager } from "./language-manager";
import { toChromiumLocale } from "../shared/language";

const languageManager = new LanguageManager();
const initialLanguage = languageManager.getState().effectiveLanguage;
app.commandLine.appendSwitch("lang", toChromiumLocale(initialLanguage));

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
  language: initialLanguage,
};

// Initialize managers
const themeColorCache = new ThemeColorCache();
const bookmarkManager = new BookmarkManager();
const faviconCache = new FaviconCache();
const permissionManager = new PermissionManager(app.getPath("userData"));
const historyManager = new HistoryManager(app.getPath("userData"));
const sessionManager = new SessionManager(app.getPath("userData"));
const tabManager = new TabManager(
  appState,
  themeColorCache,
  permissionManager,
  historyManager,
  sessionManager
);
const windowManager = new WindowManager(appState, tabManager, sessionManager);
const trayManager = new TrayManager(appState, windowManager);
const ipcHandlers = new IPCHandlers(appState, tabManager, windowManager, bookmarkManager, faviconCache, themeColorCache, languageManager, permissionManager);
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
