import { FaviconCache } from "./favicon-cache";
import { HistoryManager } from "./history-manager";
import { PermissionManager } from "./permission-manager";
import { SessionManager } from "./session-manager";
import { ThemeColorCache } from "./theme-cache";

interface ElectronSessionLike {
  clearCache(): Promise<void>;
  clearStorageData(options?: { storages?: string[] }): Promise<void>;
}

export interface ClearResult {
  error?: string;
  ok: boolean;
  target: string;
}

interface BrowsingDataManagerOptions {
  electronSession: ElectronSessionLike;
  faviconCache: Pick<FaviconCache, "clearCache">;
  historyManager: Pick<HistoryManager, "clear">;
  permissionManager: Pick<PermissionManager, "clear">;
  sessionManager: Pick<SessionManager, "clear">;
  themeColorCache: Pick<ThemeColorCache, "clear">;
}

export class BrowsingDataManager {
  private readonly electronSession: ElectronSessionLike;
  private readonly faviconCache: Pick<FaviconCache, "clearCache">;
  private readonly historyManager: Pick<HistoryManager, "clear">;
  private readonly permissionManager: Pick<PermissionManager, "clear">;
  private readonly sessionManager: Pick<SessionManager, "clear">;
  private readonly themeColorCache: Pick<ThemeColorCache, "clear">;

  constructor(options: BrowsingDataManagerOptions) {
    this.electronSession = options.electronSession;
    this.faviconCache = options.faviconCache;
    this.historyManager = options.historyManager;
    this.permissionManager = options.permissionManager;
    this.sessionManager = options.sessionManager;
    this.themeColorCache = options.themeColorCache;
  }

  clearHistory(): Promise<ClearResult> {
    return this.run("history", () => this.historyManager.clear());
  }

  clearPermissions(): Promise<ClearResult> {
    return this.run("permissions", () => this.permissionManager.clear());
  }

  clearSessionRestore(): Promise<ClearResult> {
    return this.run("session", () => this.sessionManager.clear());
  }

  clearFavicons(): Promise<ClearResult> {
    return this.run("favicons", () => this.faviconCache.clearCache());
  }

  clearThemeColors(): Promise<ClearResult> {
    return this.run("theme-colors", () => this.themeColorCache.clear());
  }

  clearCache(): Promise<ClearResult> {
    return this.run("cache", () => this.electronSession.clearCache());
  }

  clearCookies(): Promise<ClearResult> {
    return this.run("cookies", () =>
      this.electronSession.clearStorageData({ storages: ["cookies"] })
    );
  }

  clearSiteData(): Promise<ClearResult> {
    return this.run("site-data", () =>
      this.electronSession.clearStorageData({
        storages: ["cookies", "localstorage", "indexdb", "cachestorage"],
      })
    );
  }

  async clearAll(): Promise<ClearResult[]> {
    return Promise.all([
      this.clearHistory(),
      this.clearPermissions(),
      this.clearSessionRestore(),
      this.clearFavicons(),
      this.clearThemeColors(),
      this.clearCache(),
      this.clearSiteData(),
    ]);
  }

  private async run(
    target: string,
    operation: () => Promise<void> | void
  ): Promise<ClearResult> {
    try {
      await operation();
      return { ok: true, target };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        ok: false,
        target,
      };
    }
  }
}
