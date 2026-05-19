import { BrowserWindow, ipcMain } from "electron";
import { DownloadManager } from "../download-manager";
import { logSecurityEvent } from "../security";

interface DownloadHandlersState {
  mainWindow: BrowserWindow | null;
}

export function notifyDownloadsUpdated(
  state: DownloadHandlersState,
  downloadManager: DownloadManager
): void {
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send("downloads-updated", downloadManager.list());
  }
}

export function registerDownloadHandlers(
  state: DownloadHandlersState,
  downloadManager: DownloadManager
): void {
  ipcMain.handle("downloads-list", (event) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to downloads-list");
      return [];
    }
    return downloadManager.list();
  });

  ipcMain.handle("downloads-clear-completed", (event) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to downloads-clear-completed");
      throw new Error("Unauthorized");
    }
    return downloadManager.clearCompleted();
  });

  ipcMain.handle("downloads-open-in-folder", (event, id: string) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to downloads-open-in-folder");
      throw new Error("Unauthorized");
    }
    return downloadManager.openInFolder(id);
  });
}
