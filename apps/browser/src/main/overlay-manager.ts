/**
 * Manages overlay views that appear on top of WebContentsView
 * Used for menus, dialogs, and other UI elements that need to be above web content
 */

import { WebContentsView } from "electron";
import path from "path";
import { AppState } from "./types";

export class OverlayManager {
  private appState: AppState;
  private overlayView: WebContentsView | null = null;
  private isVisible: boolean = false;

  constructor(appState: AppState) {
    this.appState = appState;
  }

  /**
   * Initialize overlay view (called once)
   */
  initializeOverlay() {
    if (this.overlayView || !this.appState.mainWindow) return;

    console.log("[OverlayManager] Initializing overlay view");

    this.overlayView = new WebContentsView({
      webPreferences: {
        preload: path.join(__dirname, "../preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Load the same renderer but it will show overlay content
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
      this.overlayView.webContents.loadURL("http://localhost:5173/#overlay");
    } else {
      this.overlayView.webContents.loadFile(
        path.join(__dirname, "../../dist-renderer/index.html"),
        { hash: "overlay" }
      );
    }

    // Set initial bounds (full window, but invisible)
    const bounds = this.appState.mainWindow.getBounds();
    this.overlayView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    });

    // Start hidden
    this.overlayView.setVisible(false);

    // Add to window (will be on top due to order)
    this.appState.mainWindow.contentView.addChildView(this.overlayView);

    console.log("[OverlayManager] Overlay view initialized");
  }

  /**
   * Show overlay
   */
  showOverlay() {
    if (!this.overlayView || !this.appState.mainWindow) return;

    console.log("[OverlayManager] Showing overlay");

    // Update bounds to match current window size
    const bounds = this.appState.mainWindow.getBounds();
    this.overlayView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    });

    // Make visible
    this.overlayView.setVisible(true);
    this.isVisible = true;

    // Send message to overlay to show menu
    this.overlayView.webContents.send("overlay-show-menu");
  }

  /**
   * Hide overlay
   */
  hideOverlay() {
    if (!this.overlayView) return;

    console.log("[OverlayManager] Hiding overlay");

    this.overlayView.setVisible(false);
    this.isVisible = false;

    // Send message to overlay to hide menu
    this.overlayView.webContents.send("overlay-hide-menu");
  }

  /**
   * Update overlay bounds (called on window resize)
   */
  updateBounds() {
    if (!this.overlayView || !this.appState.mainWindow || !this.isVisible) return;

    const bounds = this.appState.mainWindow.getBounds();
    this.overlayView.setBounds({
      x: 0,
      y: 0,
      width: bounds.width,
      height: bounds.height,
    });
  }

  /**
   * Destroy overlay
   */
  destroy() {
    if (this.overlayView) {
      console.log("[OverlayManager] Destroying overlay view");
      this.overlayView.webContents.close();
      this.overlayView = null;
      this.isVisible = false;
    }
  }

  /**
   * Check if overlay is visible
   */
  isOverlayVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get overlay view
   */
  getOverlayView(): WebContentsView | null {
    return this.overlayView;
  }
}
