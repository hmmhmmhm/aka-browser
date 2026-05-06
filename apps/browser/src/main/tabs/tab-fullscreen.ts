/**
 * Fullscreen event handlers for tab WebContentsViews.
 *
 * Listens for Electron's native enter/leave-html-full-screen events and
 * adjusts the view's bounds to account for device-frame rounded corners.
 * Also exposes exitFullscreen() for ESC-key handling.
 */

import { AppState } from "../types";

// Layout constants (must match renderer/window-manager constants)
const TOP_BAR_HEIGHT = 40;
const DEVICE_FRAME_PADDING = 15;
const DEVICE_BORDER_RADIUS = 32;
const STATUS_BAR_HEIGHT = 58;
const STATUS_BAR_WIDTH = 58;
const FRAME_HALF = DEVICE_FRAME_PADDING / 2;

// Gaps applied while in fullscreen to avoid rounded corner artifacts
const FULLSCREEN_GAP_VERTICAL =
  DEVICE_FRAME_PADDING + DEVICE_BORDER_RADIUS + 20; // ~67px portrait top/bottom
const FULLSCREEN_GAP_HORIZONTAL =
  DEVICE_FRAME_PADDING + DEVICE_BORDER_RADIUS + 10; // ~57px landscape left/right

function boundsForFullscreenLandscape(windowBounds: Electron.Rectangle) {
  return {
    x: FULLSCREEN_GAP_HORIZONTAL - 30,
    y: TOP_BAR_HEIGHT + DEVICE_FRAME_PADDING,
    width: windowBounds.width - FULLSCREEN_GAP_HORIZONTAL * 2,
    height: windowBounds.height - TOP_BAR_HEIGHT - DEVICE_FRAME_PADDING * 2,
  };
}

function boundsForFullscreenPortrait(windowBounds: Electron.Rectangle) {
  return {
    x: DEVICE_FRAME_PADDING,
    y: TOP_BAR_HEIGHT + FULLSCREEN_GAP_VERTICAL - 30,
    width: windowBounds.width - DEVICE_FRAME_PADDING * 2,
    height:
      windowBounds.height -
      TOP_BAR_HEIGHT -
      FULLSCREEN_GAP_VERTICAL -
      FULLSCREEN_GAP_VERTICAL,
  };
}

function boundsForNormalLandscape(windowBounds: Electron.Rectangle) {
  return {
    x: STATUS_BAR_WIDTH,
    y: Math.round(TOP_BAR_HEIGHT + FRAME_HALF),
    width: Math.round(windowBounds.width - STATUS_BAR_WIDTH - FRAME_HALF),
    height: Math.round(windowBounds.height - TOP_BAR_HEIGHT - FRAME_HALF * 2),
  };
}

function boundsForNormalPortrait(windowBounds: Electron.Rectangle) {
  return {
    x: Math.round(FRAME_HALF),
    y: Math.round(TOP_BAR_HEIGHT + STATUS_BAR_HEIGHT + FRAME_HALF),
    width: Math.round(windowBounds.width - FRAME_HALF * 2),
    height: Math.round(
      windowBounds.height - TOP_BAR_HEIGHT - STATUS_BAR_HEIGHT - FRAME_HALF * 2
    ),
  };
}

/**
 * Force a one-pixel window resize trick to make Electron recalculate
 * WebContentsView layout after bounds changes.
 */
function forceWindowLayoutRecalc(
  mainWindow: Electron.BrowserWindow
): void {
  const b = mainWindow.getBounds();
  mainWindow.setBounds({ ...b, height: b.height + 1 });
  mainWindow.setBounds(b);
}

/**
 * Register enter/leave-html-full-screen event handlers on `contents`.
 * Mutates `state.tabs` to set the `isFullscreen` flag.
 */
export function setupFullscreenHandlers(
  contents: Electron.WebContents,
  tabId: string,
  state: AppState
): void {
  contents.on("enter-html-full-screen", () => {
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    const timestamp = new Date().toISOString().split("T")[1].slice(0, -1);
    console.log(
      `[Fullscreen][${timestamp}] enter-html-full-screen event received`
    );

    tab.isFullscreen = true;

    if (!state.mainWindow) return;

    const windowBounds = state.mainWindow.getBounds();
    const isLandscape = windowBounds.width > windowBounds.height;
    const bounds = isLandscape
      ? boundsForFullscreenLandscape(windowBounds)
      : boundsForFullscreenPortrait(windowBounds);

    tab.view.setBounds(bounds);
    state.mainWindow.webContents.send("fullscreen-mode-changed", true);

    forceWindowLayoutRecalc(state.mainWindow);

    // Reapply after resize trick
    tab.view.setBounds(bounds);

    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send("set-fullscreen-state", true);
    }
  });

  contents.on("leave-html-full-screen", () => {
    const tab = state.tabs.find((t) => t.id === tabId);
    if (!tab) return;

    tab.isFullscreen = false;

    if (!state.mainWindow) return;

    state.mainWindow.webContents.send("fullscreen-mode-changed", false);

    const windowBounds = state.mainWindow.getBounds();
    const isLandscape = windowBounds.width > windowBounds.height;
    const bounds = isLandscape
      ? boundsForNormalLandscape(windowBounds)
      : boundsForNormalPortrait(windowBounds);

    tab.view.setBounds(bounds);
    forceWindowLayoutRecalc(state.mainWindow);

    // Reapply after resize trick
    tab.view.setBounds(bounds);

    if (!tab.view.webContents.isDestroyed()) {
      tab.view.webContents.send("set-fullscreen-state", false);
    }
  });
}

/**
 * Programmatically exit fullscreen for a tab (called by ESC-key handler).
 * No-op if the tab is not currently fullscreen.
 */
export function exitFullscreen(tabId: string, state: AppState): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (!tab || !tab.isFullscreen) return;

  tab.view.webContents
    .executeJavaScript(
      `
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    `
    )
    .catch((err) => {
      console.error("[Fullscreen] Failed to exit fullscreen:", err);
    });

  if (!tab.view.webContents.isDestroyed()) {
    tab.view.webContents.send("webview-fullscreen-exited");
  }
}
