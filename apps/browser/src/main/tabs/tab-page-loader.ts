/**
 * Helpers for loading blank-page and error-page HTML into a WebContentsView.
 * Handles both development (Vite dev server) and production (dist-renderer) modes.
 */

import { app } from "electron";
import path from "path";
import fs from "fs";
import { generateBlankPageHtml, generateErrorPageHtml } from "../html-generator";

/** Params forwarded to the error page's __QUERY_PARAMS__ global. */
export interface ErrorPageParams extends Record<string, string> {
  statusCode: string;
  statusText: string;
  url: string;
}

/** Ensure the per-session temp directory exists and return its path. */
function ensureTmpDir(): string {
  const tmpDir = path.join(app.getPath("temp"), "aka-browser");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

/** Build the dev-mode blank-page HTML that loads from the Vite dev server. */
function buildDevBlankHtml(): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#1c1c1e" />
    <title>Blank Page</title>
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://localhost:5173/pages/blank-page-entry.tsx"></script>
  </body>
</html>`;
}

/** Build the dev-mode error-page HTML that loads from the Vite dev server. */
function buildDevErrorHtml(params: ErrorPageParams): string {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#2d2d2d" />
    <title>Error</title>
    <script>window.__QUERY_PARAMS__ = ${JSON.stringify(params)};</script>
    <script type="module">
      import RefreshRuntime from 'http://localhost:5173/@react-refresh'
      RefreshRuntime.injectIntoGlobalHook(window)
      window.$RefreshReg$ = () => {}
      window.$RefreshSig$ = () => (type) => type
      window.__vite_plugin_react_preamble_installed__ = true
    </script>
    <script type="module" src="http://localhost:5173/@vite/client"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="http://localhost:5173/pages/error-page-entry.tsx"></script>
  </body>
</html>`;
}

/**
 * Write the blank-page HTML to a temp file and load it into `contents`.
 * Returns the temp file path so callers can clean up later if needed.
 */
export function loadBlankPage(
  contents: Electron.WebContents,
  tabId: string
): void {
  const isDev = process.env.NODE_ENV === "development";
  const tmpDir = ensureTmpDir();
  const tmpHtmlPath = path.join(tmpDir, `blank-page-${tabId}.html`);

  let html: string;
  if (isDev) {
    html = buildDevBlankHtml();
  } else {
    const distPath = path.join(app.getAppPath(), "dist-renderer");
    const scriptPath = path.join(distPath, "pages", "blank-page.js");
    html = generateBlankPageHtml(scriptPath, undefined, false);
  }

  fs.writeFileSync(tmpHtmlPath, html, "utf-8");
  contents.loadFile(tmpHtmlPath).catch((err) => {
    console.error("[TabPageLoader] Failed to load blank page:", err);
  });
}

/**
 * Write the error-page HTML to a temp file and load it into `contents`.
 * Resolves with the tab-info title string once the load completes.
 */
export async function loadErrorPage(
  contents: Electron.WebContents,
  tabId: string,
  params: ErrorPageParams,
  suffix: string = ""
): Promise<void> {
  const isDev = process.env.NODE_ENV === "development";
  const tmpDir = ensureTmpDir();
  const filename = suffix
    ? `error-page-${suffix}-${tabId}.html`
    : `error-page-${tabId}.html`;
  const tmpHtmlPath = path.join(tmpDir, filename);

  let html: string;
  if (isDev) {
    html = buildDevErrorHtml(params);
  } else {
    const distPath = path.join(app.getAppPath(), "dist-renderer");
    const scriptPath = path.join(distPath, "pages", "error-page.js");
    html = generateErrorPageHtml(scriptPath, undefined, params, false);
  }

  fs.writeFileSync(tmpHtmlPath, html, "utf-8");
  await contents.loadFile(tmpHtmlPath);
}
