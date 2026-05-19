import { describe, expect, it } from "vitest";
import { DownloadManager } from "../download-manager";

describe("DownloadManager", () => {
  it("starts downloads and lists newest first", () => {
    const manager = new DownloadManager();

    const first = manager.startDownload({
      filename: "a.txt",
      savePath: "/tmp/a.txt",
      totalBytes: 10,
      url: "https://example.com/a.txt",
    }, 100);
    const second = manager.startDownload({
      filename: "b.txt",
      savePath: "/tmp/b.txt",
      totalBytes: 20,
      url: "https://example.com/b.txt",
    }, 200);

    expect(manager.list().map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it("tracks progress", () => {
    const manager = new DownloadManager();
    const item = manager.startDownload({
      filename: "a.txt",
      savePath: "/tmp/a.txt",
      totalBytes: 10,
      url: "https://example.com/a.txt",
    }, 100);

    manager.updateProgress(item.id, 5, 10);

    expect(manager.get(item.id)?.receivedBytes).toBe(5);
    expect(manager.get(item.id)?.totalBytes).toBe(10);
  });

  it("marks completed downloads", () => {
    const manager = new DownloadManager();
    const item = manager.startDownload({
      filename: "a.txt",
      savePath: "/tmp/a.txt",
      totalBytes: 10,
      url: "https://example.com/a.txt",
    }, 100);

    manager.finishDownload(item.id, "completed", 200);

    expect(manager.get(item.id)?.state).toBe("completed");
    expect(manager.get(item.id)?.endedAt).toBe(200);
  });

  it("clears completed downloads only", () => {
    const manager = new DownloadManager();
    const completed = manager.startDownload({
      filename: "a.txt",
      savePath: "/tmp/a.txt",
      totalBytes: 10,
      url: "https://example.com/a.txt",
    }, 100);
    const active = manager.startDownload({
      filename: "b.txt",
      savePath: "/tmp/b.txt",
      totalBytes: 20,
      url: "https://example.com/b.txt",
    }, 200);
    manager.finishDownload(completed.id, "completed", 300);

    manager.clearCompleted();

    expect(manager.list().map((item) => item.id)).toEqual([active.id]);
  });
});
