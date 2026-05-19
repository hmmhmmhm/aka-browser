import type { ContextBridge, IpcRenderer } from "electron";

export function exposeWebviewApi(
  contextBridge: ContextBridge,
  ipcRenderer: IpcRenderer
): void {
  contextBridge.exposeInMainWorld("electronAPI", {
    bookmarks: {
      getAll: () => ipcRenderer.invoke("bookmarks-get-all"),
      add: (title: string, url: string, favicon?: string) =>
        ipcRenderer.invoke("bookmarks-add", title, url, favicon),
      remove: (id: string) => ipcRenderer.invoke("bookmarks-remove", id),
      update: (
        id: string,
        updates: { title?: string; url?: string; favicon?: string }
      ) => ipcRenderer.invoke("bookmarks-update", id, updates),
      clear: () => ipcRenderer.invoke("bookmarks-clear"),
      onUpdate: (callback: () => void) => {
        const listener = () => callback();
        ipcRenderer.on("bookmarks-updated", listener);
        return () => ipcRenderer.removeListener("bookmarks-updated", listener);
      },
    },
    favicon: {
      get: (url: string) => ipcRenderer.invoke("favicon-get", url),
      getWithFallback: (pageUrl: string) =>
        ipcRenderer.invoke("favicon-get-with-fallback", pageUrl),
      isCached: (url: string) => ipcRenderer.invoke("favicon-is-cached", url),
      clearCache: () => ipcRenderer.invoke("favicon-clear-cache"),
      getCacheSize: () => ipcRenderer.invoke("favicon-get-cache-size"),
    },
  });
}
