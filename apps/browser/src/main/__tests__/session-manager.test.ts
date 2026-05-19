import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SessionManager } from "../session-manager";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aka-session-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { force: true, recursive: true });
});

describe("SessionManager", () => {
  it("saves and loads session snapshots", () => {
    const manager = new SessionManager(tempDir);

    manager.save({
      activeTabId: "tab-1",
      orientation: "landscape",
      savedAt: 100,
      tabs: [{ id: "tab-1", title: "Example", url: "https://example.com" }],
    });

    expect(new SessionManager(tempDir).load()).toEqual({
      activeTabId: "tab-1",
      orientation: "landscape",
      savedAt: 100,
      tabs: [{ id: "tab-1", title: "Example", url: "https://example.com" }],
    });
  });

  it("normalizes internal and invalid restore URLs to blank tabs", () => {
    const manager = new SessionManager(tempDir);

    expect(manager.normalizeUrlForRestore("/")).toBe("");
    expect(manager.normalizeUrlForRestore("file:///tmp/blank-page-tab-1.html")).toBe("");
    expect(manager.normalizeUrlForRestore("notaurl")).toBe("");
    expect(manager.normalizeUrlForRestore("https://example.com")).toBe(
      "https://example.com"
    );
  });

  it("returns null for corrupt storage", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fs.writeFileSync(path.join(tempDir, "session.json"), "{", "utf-8");

    const manager = new SessionManager(tempDir);

    expect(manager.load()).toBeNull();
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });

  it("clears saved sessions", () => {
    const manager = new SessionManager(tempDir);
    manager.save({
      activeTabId: "tab-1",
      orientation: "portrait",
      savedAt: 100,
      tabs: [{ id: "tab-1", title: "Example", url: "https://example.com" }],
    });

    manager.clear();

    expect(manager.load()).toBeNull();
  });
});
