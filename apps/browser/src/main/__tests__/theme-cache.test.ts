import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const electronMock = vi.hoisted(() => ({
  beforeQuit: undefined as (() => void) | undefined,
  userDataPath: "",
}));

vi.mock("electron", () => ({
  app: {
    getPath: vi.fn(() => electronMock.userDataPath),
    on: vi.fn((event: string, callback: () => void) => {
      if (event === "before-quit") {
        electronMock.beforeQuit = callback;
      }
    }),
  },
}));

import { ThemeColorCache } from "../theme-cache";

describe("ThemeColorCache", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aka-theme-cache-"));
    electronMock.userDataPath = tempDir;
    electronMock.beforeQuit = undefined;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { force: true, recursive: true });
  });

  it("moves corrupt cache files aside and saves valid JSON afterward", () => {
    const cachePath = path.join(tempDir, "theme-colors.json");
    fs.writeFileSync(cachePath, "{", "utf-8");

    const cache = new ThemeColorCache();

    expect(cache.get("example.com")).toBeNull();
    expect(fs.existsSync(cachePath)).toBe(false);
    expect(fs.existsSync(`${cachePath}.corrupt`)).toBe(true);

    cache.set("example.com", "#ffffff");
    electronMock.beforeQuit?.();

    expect(JSON.parse(fs.readFileSync(cachePath, "utf-8"))).toEqual({
      "example.com": {
        color: "#ffffff",
        timestamp: expect.any(Number),
      },
    });
    expect(fs.existsSync(`${cachePath}.${process.pid}.tmp`)).toBe(false);
  });
});
