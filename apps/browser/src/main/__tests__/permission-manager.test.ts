import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PermissionManager,
  SitePermission,
} from "../permission-manager";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aka-permissions-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { force: true, recursive: true });
});

describe("PermissionManager", () => {
  it("returns prompt for supported permissions without a saved decision", () => {
    const manager = new PermissionManager(tempDir);

    expect(manager.getDecision("https://example.com", "media")).toBe("prompt");
  });

  it("persists allow and block decisions by origin and permission", () => {
    const manager = new PermissionManager(tempDir);

    manager.setDecision("https://example.com/path", "media", "allow");
    manager.setDecision("https://example.com/path", "fullscreen", "block");

    const reloaded = new PermissionManager(tempDir);
    expect(reloaded.getDecision("https://example.com", "media")).toBe("allow");
    expect(reloaded.getDecision("https://example.com", "fullscreen")).toBe(
      "block"
    );
  });

  it("lists decisions in updated order", () => {
    const manager = new PermissionManager(tempDir);

    manager.setDecision("https://a.example", "media", "allow", 10);
    manager.setDecision("https://b.example", "fullscreen", "block", 20);

    expect(manager.list().map((entry) => entry.origin)).toEqual([
      "https://b.example",
      "https://a.example",
    ]);
  });

  it("clears one origin or all decisions", () => {
    const manager = new PermissionManager(tempDir);
    const permission: SitePermission = "media";

    manager.setDecision("https://a.example", permission, "allow");
    manager.setDecision("https://b.example", permission, "block");
    manager.clear("https://a.example/path");

    expect(manager.getDecision("https://a.example", permission)).toBe("prompt");
    expect(manager.getDecision("https://b.example", permission)).toBe("block");

    manager.clear();
    expect(manager.list()).toEqual([]);
  });

  it("recovers from corrupt storage", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fs.writeFileSync(path.join(tempDir, "site-permissions.json"), "{", "utf-8");

    const manager = new PermissionManager(tempDir);

    expect(manager.list()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
