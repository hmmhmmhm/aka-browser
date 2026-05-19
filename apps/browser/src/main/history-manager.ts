import fs from "fs";
import path from "path";

export interface HistoryEntry {
  title: string;
  url: string;
  visitCount: number;
  visitedAt: number;
}

export class HistoryManager {
  private readonly historyPath: string;
  private entries: HistoryEntry[] = [];

  constructor(basePath: string) {
    this.historyPath = path.join(basePath, "history.json");
    this.load();
  }

  recordVisit(url: string, title: string, visitedAt: number = Date.now()): void {
    if (!isRecordableHistoryUrl(url)) return;

    const existing = this.entries.find((entry) => entry.url === url);
    if (existing) {
      existing.title = title || url;
      existing.visitedAt = visitedAt;
      existing.visitCount += 1;
    } else {
      this.entries.push({
        title: title || url,
        url,
        visitCount: 1,
        visitedAt,
      });
    }

    this.sort();
    this.save();
  }

  list(limit?: number): HistoryEntry[] {
    const entries = [...this.entries].sort(
      (left, right) => right.visitedAt - left.visitedAt
    );
    return typeof limit === "number" ? entries.slice(0, limit) : entries;
  }

  clear(): void {
    this.entries = [];
    this.save();
  }

  private load(): void {
    try {
      if (!fs.existsSync(this.historyPath)) {
        this.entries = [];
        return;
      }

      const parsed = JSON.parse(
        fs.readFileSync(this.historyPath, "utf-8")
      ) as HistoryEntry[];
      this.entries = Array.isArray(parsed) ? parsed : [];
      this.sort();
    } catch (error) {
      console.error("[HistoryManager] Failed to load history:", error);
      this.entries = [];
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.historyPath), { recursive: true });
      fs.writeFileSync(
        this.historyPath,
        JSON.stringify(this.entries, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("[HistoryManager] Failed to save history:", error);
    }
  }

  private sort(): void {
    this.entries.sort((left, right) => right.visitedAt - left.visitedAt);
  }
}

export function isRecordableHistoryUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
