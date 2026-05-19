import { contextBridge, ipcRenderer } from "electron";
import { installCornerMask } from "./webview/corner-mask";
import { exposeWebviewApi } from "./webview/exposed-api";
import { installFullscreenPolyfill } from "./webview/fullscreen-polyfill";
import { installNavigationGestures } from "./webview/navigation-gestures";
import { installThemeColorMonitoring } from "./webview/theme-color";

console.log("[Preload] Loaded webview preload");

installFullscreenPolyfill(ipcRenderer);
installThemeColorMonitoring(ipcRenderer);
installCornerMask(ipcRenderer);
installNavigationGestures(ipcRenderer);
exposeWebviewApi(contextBridge, ipcRenderer);
