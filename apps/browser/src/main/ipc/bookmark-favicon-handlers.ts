import { ipcMain, WebContentsView, BrowserWindow } from "electron";
import { BookmarkManager } from "../bookmark-manager";
import { FaviconCache } from "../favicon-cache";

interface BookmarkHandlersState {
  mainWindow: BrowserWindow | null;
  webContentsView: WebContentsView | null;
}

export function registerBookmarkHandlers(
  state: BookmarkHandlersState,
  bookmarkManager: BookmarkManager
): void {
  const notifyBookmarkUpdate = () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.webContents.send("bookmarks-updated");
    }

    if (
      state.webContentsView &&
      !state.webContentsView.webContents.isDestroyed()
    ) {
      state.webContentsView.webContents.send("bookmarks-updated");
    }
  };

  ipcMain.handle("bookmarks-get-all", () => bookmarkManager.getAll());
  ipcMain.handle("bookmarks-get-by-id", (_event, id: string) =>
    bookmarkManager.getById(id)
  );
  ipcMain.handle("bookmarks-is-bookmarked", (_event, url: string) =>
    bookmarkManager.isBookmarked(url)
  );
  ipcMain.handle(
    "bookmarks-add",
    (_event, title: string, url: string, favicon?: string) => {
      const bookmark = bookmarkManager.add(title, url, favicon);
      notifyBookmarkUpdate();
      return bookmark;
    }
  );
  ipcMain.handle("bookmarks-update", (_event, id: string, updates: any) => {
    const bookmark = bookmarkManager.update(id, updates);
    notifyBookmarkUpdate();
    return bookmark;
  });
  ipcMain.handle("bookmarks-remove", (_event, id: string) => {
    const result = bookmarkManager.remove(id);
    notifyBookmarkUpdate();
    return result;
  });
  ipcMain.handle("bookmarks-remove-by-url", (_event, url: string) => {
    const result = bookmarkManager.removeByUrl(url);
    notifyBookmarkUpdate();
    return result;
  });
  ipcMain.handle("bookmarks-clear", () => {
    bookmarkManager.clear();
    notifyBookmarkUpdate();
  });
}

export function registerFaviconHandlers(faviconCache: FaviconCache): void {
  ipcMain.handle("favicon-get", async (_event, url: string) =>
    faviconCache.getFavicon(url)
  );
  ipcMain.handle("favicon-get-with-fallback", async (_event, pageUrl: string) =>
    faviconCache.getFaviconWithFallback(pageUrl)
  );
  ipcMain.handle("favicon-is-cached", (_event, url: string) =>
    faviconCache.isCached(url)
  );
  ipcMain.handle("favicon-clear-cache", () => {
    faviconCache.clearCache();
  });
  ipcMain.handle("favicon-get-cache-size", () => faviconCache.getCacheSize());
}
