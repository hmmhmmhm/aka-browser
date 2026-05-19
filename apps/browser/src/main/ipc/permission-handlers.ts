import { BrowserWindow, ipcMain } from "electron";
import {
  PermissionDecision,
  PermissionManager,
  SitePermission,
} from "../permission-manager";
import { logSecurityEvent } from "../security";

interface PermissionHandlersState {
  mainWindow: BrowserWindow | null;
}

export function registerPermissionHandlers(
  state: PermissionHandlersState,
  permissionManager: PermissionManager
): void {
  ipcMain.handle("permissions-list", (event) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to permissions-list");
      return [];
    }
    return permissionManager.list();
  });

  ipcMain.handle(
    "permissions-set",
    (
      event,
      origin: string,
      permission: SitePermission,
      decision: PermissionDecision
    ) => {
      if (event.sender !== state.mainWindow?.webContents) {
        logSecurityEvent("Unauthorized IPC call to permissions-set");
        throw new Error("Unauthorized");
      }
      permissionManager.setDecision(origin, permission, decision);
      return permissionManager.list();
    }
  );

  ipcMain.handle("permissions-clear", (event, origin?: string) => {
    if (event.sender !== state.mainWindow?.webContents) {
      logSecurityEvent("Unauthorized IPC call to permissions-clear");
      throw new Error("Unauthorized");
    }
    permissionManager.clear(origin);
    return permissionManager.list();
  });
}
