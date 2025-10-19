/**
 * Tray icon management
 */

import { Tray, Menu, nativeImage, app } from "electron";
import path from "path";
import { AppState } from "./types";
import { WindowManager } from "./window-manager";

export class TrayManager {
  private state: AppState;
  private windowManager: WindowManager;

  constructor(state: AppState, windowManager: WindowManager) {
    this.state = state;
    this.windowManager = windowManager;
  }

  /**
   * Create tray icon
   */
  createTray(): void {
    const iconPath = path.join(__dirname, "../../assets/tray-icon.png");

    let trayIcon = nativeImage.createFromPath(iconPath);

    if (trayIcon.isEmpty()) {
      console.error("Tray icon not found at:", iconPath);
      trayIcon = nativeImage.createEmpty();
    }

    // For macOS, use template image mode for proper transparency handling
    if (process.platform === "darwin") {
      trayIcon.setTemplateImage(true);
    }

    this.state.tray = new Tray(trayIcon);
    this.state.tray.setToolTip("Aka Browser");

    // Left click: toggle window visibility
    this.state.tray.on("click", () => {
      if (this.state.mainWindow) {
        if (this.state.mainWindow.isVisible()) {
          this.state.mainWindow.hide();
        } else {
          this.state.mainWindow.show();
          this.state.mainWindow.focus();
        }
      }
    });

    // Right click: show context menu
    this.state.tray.on("right-click", () => {
      this.showContextMenu();
    });
  }

  /**
   * Show tray context menu
   */
  private showContextMenu(): void {
    if (!this.state.tray) return;

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Open Browser",
        click: () => {
          if (this.state.mainWindow) {
            this.state.mainWindow.show();
            this.state.mainWindow.focus();
          }
        },
      },
      {
        label: "Open Settings",
        click: () => {
          if (this.state.mainWindow) {
            this.state.mainWindow.show();
            this.state.mainWindow.focus();
            this.state.mainWindow.webContents.send("open-settings");
          }
        },
      },
      {
        type: "separator",
      },
      {
        label: "Always on Top",
        type: "checkbox",
        checked: this.state.isAlwaysOnTop,
        click: () => {
          this.state.isAlwaysOnTop = !this.state.isAlwaysOnTop;
          if (this.state.mainWindow) {
            this.state.mainWindow.setAlwaysOnTop(this.state.isAlwaysOnTop);
          }
        },
      },
      {
        label: "Toggle Orientation",
        click: () => {
          this.windowManager.toggleOrientation();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Open DevTools",
        click: () => {
          if (this.state.webContentsView && !this.state.webContentsView.webContents.isDestroyed()) {
            this.state.webContentsView.webContents.openDevTools({ mode: "detach" });
          }
        },
      },
    ];

    // Add "Open DevTools (Main)" only in development mode
    if (!app.isPackaged) {
      menuTemplate.push({
        label: "Open DevTools (Main)",
        click: () => {
          if (this.state.mainWindow && !this.state.mainWindow.isDestroyed()) {
            this.state.mainWindow.webContents.openDevTools({ mode: "detach" });
          }
        },
      });
    }

    menuTemplate.push(
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          app.quit();
        },
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.state.tray.popUpContextMenu(contextMenu);
  }

  /**
   * Destroy tray icon
   */
  destroy(): void {
    if (this.state.tray) {
      this.state.tray.destroy();
      this.state.tray = null;
    }
  }
}
