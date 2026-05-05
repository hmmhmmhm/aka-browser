/**
 * Navigation event handlers for tab WebContentsViews.
 *
 * Covers: did-start/stop-loading, did-navigate, did-navigate-in-page,
 * dom-ready, did-fail-load, did-get-response-details, render-process-gone.
 * Error-page loading is delegated to tab-page-loader.
 * Error-code lookup is delegated to tab-error-codes.
 */

import { AppState } from "../types";
import { ThemeColorCache } from "../theme-cache";
import { getNetworkErrorText, getStatusText } from "./tab-error-codes";
import { loadErrorPage, ErrorPageParams } from "./tab-page-loader";

/** Shared tab-list snapshot shape sent to renderer. */
function tabsSnapshot(state: AppState) {
  return state.tabs.map((t) => ({
    id: t.id,
    title: t.title,
    url: t.url,
    preview: t.preview,
  }));
}

/**
 * Apply theme color from cache or reset it, then notify renderer.
 * Called when navigating to a new URL.
 */
function applyThemeColorForUrl(
  url: string,
  state: AppState,
  themeColorCache: ThemeColorCache
): void {
  try {
    const domain = new URL(url).hostname;
    const cached = themeColorCache.get(domain);
    if (cached) {
      state.latestThemeColor = cached;
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.webContents.send(
          "webcontents-theme-color-updated",
          cached
        );
      }
    } else {
      state.latestThemeColor = null;
    }
  } catch {
    state.latestThemeColor = null;
  }
}

/** Resolve the display URL and update the tab's stored url/title. */
function resolveNavigatedUrl(
  contents: Electron.WebContents,
  rawUrl: string,
  tabId: string,
  state: AppState
): string {
  const tab = state.tabs.find((t) => t.id === tabId);
  let displayUrl = rawUrl;

  if (tab) {
    if (rawUrl.includes("blank-page-tab-")) {
      tab.url = "/";
      tab.title = "Blank Page";
      displayUrl = "/";
    } else if (rawUrl.includes("error-page-tab-")) {
      tab.url = "/";
      tab.title =
        contents.getTitle() || "Aka Browser cannot open the page";
      displayUrl = "/";
    } else {
      tab.url = rawUrl;
      tab.title = contents.getTitle() || rawUrl;
    }
  }

  return displayUrl;
}

/** Apply the error-page theme color to state and notify renderer. */
function applyErrorPageThemeColor(state: AppState): void {
  const errorPageThemeColor = "#2d2d2d";
  state.latestThemeColor = errorPageThemeColor;
  if (state.mainWindow && !state.mainWindow.isDestroyed()) {
    state.mainWindow.webContents.send(
      "webcontents-theme-color-updated",
      errorPageThemeColor
    );
  }
}

/** Mark tab as error page and update its url/title. */
function markTabAsErrorPage(tabId: string, state: AppState): void {
  const tab = state.tabs.find((t) => t.id === tabId);
  if (tab) {
    tab.url = "/";
    tab.title = "Aka Browser cannot open the page";
  }
}

/**
 * Register all navigation-related WebContents event handlers.
 * `captureTabPreview` is injected to avoid a circular dependency on TabManager.
 */
export function setupNavigationHandlers(
  contents: Electron.WebContents,
  tabId: string,
  state: AppState,
  themeColorCache: ThemeColorCache,
  captureTabPreview: (tabId: string) => Promise<void>
): void {
  // ── Loading start / stop ──────────────────────────────────────────────────

  contents.on("did-start-loading", () => {
    const url = contents.getURL();
    if (url) {
      applyThemeColorForUrl(url, state, themeColorCache);
    } else {
      state.latestThemeColor = null;
    }
    state.mainWindow?.webContents.send("webcontents-did-start-loading");
  });

  contents.on("did-stop-loading", () => {
    state.mainWindow?.webContents.send("webcontents-did-stop-loading");
    setTimeout(() => {
      captureTabPreview(tabId).catch((err) => {
        console.error("Failed to capture preview after loading:", err);
      });
    }, 500);
  });

  // ── Navigation events ─────────────────────────────────────────────────────

  contents.on("did-navigate", (_event: any, url: string) => {
    const displayUrl = resolveNavigatedUrl(contents, url, tabId, state);
    state.mainWindow?.webContents.send("webcontents-did-navigate", displayUrl);

    if (state.activeTabId === tabId && state.mainWindow) {
      state.mainWindow.webContents.send("tabs-updated", {
        tabs: tabsSnapshot(state),
        activeTabId: state.activeTabId,
      });
    }
  });

  contents.on("did-navigate-in-page", (_event: any, url: string) => {
    const displayUrl = resolveNavigatedUrl(contents, url, tabId, state);
    state.mainWindow?.webContents.send(
      "webcontents-did-navigate-in-page",
      displayUrl
    );

    if (state.activeTabId === tabId && state.mainWindow) {
      state.mainWindow.webContents.send("tabs-updated", {
        tabs: tabsSnapshot(state),
        activeTabId: state.activeTabId,
      });
    }
  });

  contents.on("dom-ready", () => {
    state.mainWindow?.webContents.send("webcontents-dom-ready");
  });

  // ── Load failure ──────────────────────────────────────────────────────────

  contents.on(
    "did-fail-load",
    (
      _event: any,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
      isMainFrame: boolean
    ) => {
      // ERR_ABORTED (-3) and sub-frame failures are expected / benign
      if (errorCode === -3 || !isMainFrame) return;

      console.log(
        `[TabNavigation] Page load failed: ${errorCode} (${errorDescription}) for ${validatedURL}`
      );

      const statusText = getNetworkErrorText(errorCode, errorDescription);
      const params: ErrorPageParams = {
        statusCode: Math.abs(errorCode).toString(),
        statusText,
        url: validatedURL,
      };

      setTimeout(() => {
        if (contents.isDestroyed()) {
          console.log("[TabNavigation] Contents destroyed, skipping error page");
          return;
        }

        console.log("[TabNavigation] Loading error page now");
        loadErrorPage(contents, tabId, params)
          .then(() => {
            console.log("[TabNavigation] Error page loaded successfully");
            markTabAsErrorPage(tabId, state);
            applyErrorPageThemeColor(state);
          })
          .catch((err) => {
            console.error("[TabNavigation] Failed to load error page:", err);
          });
      }, 100);

      state.mainWindow?.webContents.send(
        "webcontents-did-fail-load",
        errorCode,
        errorDescription
      );
    }
  );

  // ── Render-process crash ──────────────────────────────────────────────────

  contents.on("render-process-gone", (_event: any, details: any) => {
    state.mainWindow?.webContents.send(
      "webcontents-render-process-gone",
      details
    );
  });

  // ── HTTP-level errors (non-2xx main-frame responses) ──────────────────────

  (contents as any).on(
    "did-get-response-details",
    (
      _event: any,
      _status: boolean,
      _newURL: string,
      originalURL: string,
      httpResponseCode: number,
      _requestMethod: string,
      _referrer: string,
      _headers: Record<string, string[]>,
      resourceType: string
    ) => {
      if (resourceType !== "mainFrame") return;
      if (httpResponseCode >= 200 && httpResponseCode < 300) return;

      console.log(
        `[TabNavigation] Non-success HTTP response: ${httpResponseCode} for ${originalURL}`
      );

      const statusText = getStatusText(httpResponseCode);
      const params: ErrorPageParams = {
        statusCode: httpResponseCode.toString(),
        statusText,
        url: originalURL,
      };

      loadErrorPage(contents, tabId, params, "http")
        .then(() => {
          markTabAsErrorPage(tabId, state);
          applyErrorPageThemeColor(state);
        })
        .catch((err) => {
          console.error(
            "[TabNavigation] Failed to load HTTP error page:",
            err
          );
        });

      state.mainWindow?.webContents.send(
        "webcontents-http-error",
        httpResponseCode,
        statusText,
        originalURL
      );
    }
  );
}
