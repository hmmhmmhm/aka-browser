import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryManager } from "../history-manager";

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aka-history-"));
});

afterEach(() => {
  fs.rmSync(tempDir, { force: true, recursive: true });
});

describe("HistoryManager", () => {
  it("records new visits", () => {
    const manager = new HistoryManager(tempDir);

    manager.recordVisit("https://example.com", "Example", 100);

    expect(manager.list()).toEqual([
      {
        title: "Example",
        url: "https://example.com",
        visitCount: 1,
        visitedAt: 100,
      },
    ]);
  });

  it("deduplicates by URL and increments visit count", () => {
    const manager = new HistoryManager(tempDir);

    manager.recordVisit("https://example.com", "Old", 100);
    manager.recordVisit("https://example.com", "New", 200);

    expect(manager.list()).toEqual([
      {
        title: "New",
        url: "https://example.com",
        visitCount: 2,
        visitedAt: 200,
      },
    ]);
  });

  it("sorts newest visits first and applies limits", () => {
    const manager = new HistoryManager(tempDir);

    manager.recordVisit("https://a.example", "A", 100);
    manager.recordVisit("https://b.example", "B", 300);
    manager.recordVisit("https://c.example", "C", 200);

    expect(manager.list(2).map((entry) => entry.url)).toEqual([
      "https://b.example",
      "https://c.example",
    ]);
  });

  it("clears history", () => {
    const manager = new HistoryManager(tempDir);
    manager.recordVisit("https://example.com", "Example", 100);

    manager.clear();

    expect(manager.list()).toEqual([]);
  });

  it("recovers from corrupt storage", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    fs.writeFileSync(path.join(tempDir, "history.json"), "{", "utf-8");

    const manager = new HistoryManager(tempDir);

    expect(manager.list()).toEqual([]);
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
