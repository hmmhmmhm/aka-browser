import { BrowserWindow, ipcMain, WebContentsView } from "electron";
import { logSecurityEvent } from "../security";

interface PageToolHandlersState {
  mainWindow: BrowserWindow | null;
  webContentsView: WebContentsView | null;
}

export function registerPageToolHandlers(state: PageToolHandlersState): void {
  const getActiveContents = (event: Electron.IpcMainInvokeEvent) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to page tools");
      throw new Error("Unauthorized");
    }
    const contents = state.webContentsView?.webContents;
    if (!contents || contents.isDestroyed()) {
      throw new Error("No active page");
    }
    return contents;
  };

  ipcMain.handle("page-find", (event, text: string, forward = true) => {
    const contents = getActiveContents(event);
    if (!text.trim()) return;
    contents.findInPage(text, { forward, findNext: false });
  });

  ipcMain.handle("page-find-next", (event, text: string) => {
    const contents = getActiveContents(event);
    if (!text.trim()) return;
    contents.findInPage(text, { findNext: true, forward: true });
  });

  ipcMain.handle("page-find-previous", (event, text: string) => {
    const contents = getActiveContents(event);
    if (!text.trim()) return;
    contents.findInPage(text, { findNext: true, forward: false });
  });

  ipcMain.handle("page-stop-find", (event) => {
    getActiveContents(event).stopFindInPage("clearSelection");
  });

  ipcMain.handle("page-zoom-in", async (event) => {
    const contents = getActiveContents(event);
    const zoom = contents.getZoomLevel() + 0.5;
    contents.setZoomLevel(zoom);
    return zoom;
  });

  ipcMain.handle("page-zoom-out", async (event) => {
    const contents = getActiveContents(event);
    const zoom = contents.getZoomLevel() - 0.5;
    contents.setZoomLevel(zoom);
    return zoom;
  });

  ipcMain.handle("page-zoom-reset", async (event) => {
    getActiveContents(event).setZoomLevel(0);
    return 0;
  });

  ipcMain.handle("page-print", async (event) => {
    getActiveContents(event).print({});
  });
}
