import { describe, expect, it, vi } from "vitest";
import { BrowsingDataManager } from "../browsing-data-manager";

function createManager() {
  const history = { clear: vi.fn() };
  const permissions = { clear: vi.fn() };
  const sessionState = { clear: vi.fn() };
  const favicon = { clearCache: vi.fn() };
  const theme = { clear: vi.fn() };
  const electronSession = {
    clearCache: vi.fn(async () => undefined),
    clearStorageData: vi.fn(async () => undefined),
  };

  return {
    electronSession,
    favicon,
    history,
    manager: new BrowsingDataManager({
      electronSession,
      faviconCache: favicon,
      historyManager: history,
      permissionManager: permissions,
      sessionManager: sessionState,
      themeColorCache: theme,
    }),
    permissions,
    sessionState,
    theme,
  };
}

describe("BrowsingDataManager", () => {
  it("clears history", async () => {
    const { history, manager } = createManager();

    await expect(manager.clearHistory()).resolves.toEqual({
      ok: true,
      target: "history",
    });
    expect(history.clear).toHaveBeenCalledOnce();
  });

  it("clears cookies and cache through Electron session", async () => {
    const { electronSession, manager } = createManager();

    await manager.clearCookies();
    await manager.clearCache();

    expect(electronSession.clearStorageData).toHaveBeenCalledWith({
      storages: ["cookies"],
    });
    expect(electronSession.clearCache).toHaveBeenCalledOnce();
  });

  it("clears all app-owned site data", async () => {
    const { favicon, history, manager, permissions, sessionState, theme } =
      createManager();

    const results = await manager.clearAll();

    expect(results.every((result) => result.ok)).toBe(true);
    expect(history.clear).toHaveBeenCalledOnce();
    expect(permissions.clear).toHaveBeenCalledOnce();
    expect(sessionState.clear).toHaveBeenCalledOnce();
    expect(favicon.clearCache).toHaveBeenCalledOnce();
    expect(theme.clear).toHaveBeenCalledOnce();
  });

  it("returns structured failures", async () => {
    const { manager, history } = createManager();
    history.clear.mockImplementation(() => {
      throw new Error("disk failed");
    });

    await expect(manager.clearHistory()).resolves.toEqual({
      error: "disk failed",
      ok: false,
      target: "history",
    });
  });
});
