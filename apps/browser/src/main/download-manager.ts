import { shell } from "electron";

export type DownloadState =
  | "active"
  | "cancelled"
  | "completed"
  | "interrupted";

export interface DownloadItem {
  endedAt?: number;
  filename: string;
  id: string;
  receivedBytes: number;
  savePath: string;
  startedAt: number;
  state: DownloadState;
  totalBytes: number;
  url: string;
}

export interface StartDownloadInput {
  filename: string;
  savePath: string;
  totalBytes: number;
  url: string;
}

export class DownloadManager {
  private downloads: DownloadItem[] = [];
  private sequence = 0;

  startDownload(input: StartDownloadInput, startedAt = Date.now()): DownloadItem {
    const item: DownloadItem = {
      endedAt: undefined,
      filename: input.filename,
      id: `download-${startedAt}-${this.sequence++}`,
      receivedBytes: 0,
      savePath: input.savePath,
      startedAt,
      state: "active",
      totalBytes: input.totalBytes,
      url: input.url,
    };
    this.downloads.unshift(item);
    return item;
  }

  updateProgress(id: string, receivedBytes: number, totalBytes: number): void {
    const item = this.get(id);
    if (!item || item.state !== "active") return;
    item.receivedBytes = receivedBytes;
    item.totalBytes = totalBytes;
  }

  finishDownload(id: string, state: DownloadState, endedAt = Date.now()): void {
    const item = this.get(id);
    if (!item) return;
    item.state = state;
    item.endedAt = endedAt;
  }

  get(id: string): DownloadItem | undefined {
    return this.downloads.find((item) => item.id === id);
  }

  list(): DownloadItem[] {
    return [...this.downloads];
  }

  clearCompleted(): DownloadItem[] {
    this.downloads = this.downloads.filter((item) => item.state === "active");
    return this.list();
  }

  openInFolder(id: string): boolean {
    const item = this.get(id);
    if (!item?.savePath) return false;
    shell.showItemInFolder(item.savePath);
    return true;
  }

  registerSession(electronSession: any, onUpdated: () => void): void {
    electronSession.on("will-download", (_event: any, item: any) => {
      const download = this.startDownload({
        filename: item.getFilename(),
        savePath: item.getSavePath(),
        totalBytes: item.getTotalBytes(),
        url: item.getURL(),
      });
      onUpdated();

      item.on("updated", () => {
        this.updateProgress(
          download.id,
          item.getReceivedBytes(),
          item.getTotalBytes()
        );
        onUpdated();
      });

      item.once("done", (_doneEvent: any, state: string) => {
        this.finishDownload(download.id, toDownloadState(state));
        onUpdated();
      });
    });
  }
}

function toDownloadState(state: string): DownloadState {
  if (state === "completed") return "completed";
  if (state === "cancelled") return "cancelled";
  return "interrupted";
}
