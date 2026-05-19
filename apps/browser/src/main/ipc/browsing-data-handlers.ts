import { BrowserWindow, ipcMain } from "electron";
import { BrowsingDataManager } from "../browsing-data-manager";
import { logSecurityEvent } from "../security";

interface BrowsingDataHandlersState {
  mainWindow: BrowserWindow | null;
}

export function registerBrowsingDataHandlers(
  state: BrowsingDataHandlersState,
  browsingDataManager: BrowsingDataManager
): void {
  const guarded = <T>(event: Electron.IpcMainInvokeEvent, action: () => T): T => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to browsing data");
      throw new Error("Unauthorized");
    }
    return action();
  };

  ipcMain.handle("browsing-data-clear-history", (event) =>
    guarded(event, () => browsingDataManager.clearHistory())
  );
  ipcMain.handle("browsing-data-clear-cookies", (event) =>
    guarded(event, () => browsingDataManager.clearCookies())
  );
  ipcMain.handle("browsing-data-clear-cache", (event) =>
    guarded(event, () => browsingDataManager.clearCache())
  );
  ipcMain.handle("browsing-data-clear-site-data", (event) =>
    guarded(event, () => browsingDataManager.clearSiteData())
  );
  ipcMain.handle("browsing-data-clear-all", (event) =>
    guarded(event, () => browsingDataManager.clearAll())
  );
}
