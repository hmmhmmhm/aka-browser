import fs from "fs";
import path from "path";

export interface SessionTabSnapshot {
  id: string;
  title: string;
  url: string;
}

export interface BrowserSessionSnapshot {
  activeTabId: string | null;
  orientation: "portrait" | "landscape";
  savedAt: number;
  tabs: SessionTabSnapshot[];
}

export class SessionManager {
  private readonly sessionPath: string;

  constructor(basePath: string) {
    this.sessionPath = path.join(basePath, "session.json");
  }

  save(snapshot: BrowserSessionSnapshot): void {
    try {
      fs.mkdirSync(path.dirname(this.sessionPath), { recursive: true });
      fs.writeFileSync(
        this.sessionPath,
        JSON.stringify(snapshot, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("[SessionManager] Failed to save session:", error);
    }
  }

  load(): BrowserSessionSnapshot | null {
    try {
      if (!fs.existsSync(this.sessionPath)) return null;

      const parsed = JSON.parse(
        fs.readFileSync(this.sessionPath, "utf-8")
      ) as BrowserSessionSnapshot;
      if (!parsed || !Array.isArray(parsed.tabs)) return null;

      return {
        activeTabId: parsed.activeTabId ?? null,
        orientation: parsed.orientation === "landscape" ? "landscape" : "portrait",
        savedAt: parsed.savedAt || 0,
        tabs: parsed.tabs.map((tab) => ({
          id: tab.id,
          title: tab.title || "New Tab",
          url: this.normalizeUrlForRestore(tab.url),
        })),
      };
    } catch (error) {
      console.error("[SessionManager] Failed to load session:", error);
      return null;
    }
  }

  clear(): void {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
      }
    } catch (error) {
      console.error("[SessionManager] Failed to clear session:", error);
    }
  }

  normalizeUrlForRestore(urlString: string): string {
    if (!urlString || urlString === "/") return "";
    if (
      urlString.includes("blank-page-tab-") ||
      urlString.includes("error-page-tab-")
    ) {
      return "";
    }

    try {
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:"
        ? urlString
        : "";
    } catch {
      return "";
    }
  }
}
