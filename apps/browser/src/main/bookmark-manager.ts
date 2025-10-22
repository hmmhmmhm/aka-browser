/**
 * Bookmark management functionality
 */

import { app } from "electron";
import path from "path";
import fs from "fs";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  createdAt: number;
  updatedAt: number;
}

export class BookmarkManager {
  private bookmarksPath: string;
  private bookmarks: Bookmark[] = [];

  constructor() {
    const userDataPath = app.getPath("userData");
    this.bookmarksPath = path.join(userDataPath, "bookmarks.json");
    this.loadBookmarks();
  }

  /**
   * Normalize URL by ensuring it has a protocol
   */
  private normalizeUrl(url: string): string {
    // Trim whitespace
    url = url.trim();
    
    // If URL already has a protocol, return as is
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)) {
      return url;
    }
    
    // Add https:// by default
    return `https://${url}`;
  }

  /**
   * Load bookmarks from file
   */
  private loadBookmarks(): void {
    try {
      if (fs.existsSync(this.bookmarksPath)) {
        const data = fs.readFileSync(this.bookmarksPath, "utf-8");
        this.bookmarks = JSON.parse(data);
        console.log(`[BookmarkManager] Loaded ${this.bookmarks.length} bookmarks`);
      } else {
        this.bookmarks = [];
        console.log("[BookmarkManager] No bookmarks file found, starting fresh");
      }
    } catch (error) {
      console.error("[BookmarkManager] Failed to load bookmarks:", error);
      this.bookmarks = [];
    }
  }

  /**
   * Save bookmarks to file
   */
  private saveBookmarks(): void {
    try {
      const data = JSON.stringify(this.bookmarks, null, 2);
      fs.writeFileSync(this.bookmarksPath, data, "utf-8");
      console.log(`[BookmarkManager] Saved ${this.bookmarks.length} bookmarks`);
    } catch (error) {
      console.error("[BookmarkManager] Failed to save bookmarks:", error);
    }
  }

  /**
   * Get all bookmarks
   */
  getAll(): Bookmark[] {
    return [...this.bookmarks];
  }

  /**
   * Get bookmark by ID
   */
  getById(id: string): Bookmark | undefined {
    return this.bookmarks.find((b) => b.id === id);
  }

  /**
   * Check if URL is bookmarked
   */
  isBookmarked(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    return this.bookmarks.some((b) => b.url === normalizedUrl);
  }

  /**
   * Add a new bookmark
   */
  add(title: string, url: string, favicon?: string): Bookmark {
    const normalizedUrl = this.normalizeUrl(url);
    const now = Date.now();
    const bookmark: Bookmark = {
      id: `bookmark-${now}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      url: normalizedUrl,
      favicon,
      createdAt: now,
      updatedAt: now,
    };

    this.bookmarks.push(bookmark);
    this.saveBookmarks();
    console.log(`[BookmarkManager] Added bookmark: ${title} (${normalizedUrl})`);
    return bookmark;
  }

  /**
   * Update an existing bookmark
   */
  update(id: string, updates: Partial<Omit<Bookmark, "id" | "createdAt">>): Bookmark | null {
    const index = this.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) {
      console.error(`[BookmarkManager] Bookmark not found: ${id}`);
      return null;
    }

    // Normalize URL if it's being updated
    if (updates.url) {
      updates.url = this.normalizeUrl(updates.url);
    }

    this.bookmarks[index] = {
      ...this.bookmarks[index],
      ...updates,
      updatedAt: Date.now(),
    };

    this.saveBookmarks();
    console.log(`[BookmarkManager] Updated bookmark: ${id}`);
    return this.bookmarks[index];
  }

  /**
   * Remove a bookmark
   */
  remove(id: string): boolean {
    const index = this.bookmarks.findIndex((b) => b.id === id);
    if (index === -1) {
      console.error(`[BookmarkManager] Bookmark not found: ${id}`);
      return false;
    }

    const removed = this.bookmarks.splice(index, 1)[0];
    this.saveBookmarks();
    console.log(`[BookmarkManager] Removed bookmark: ${removed.title}`);
    return true;
  }

  /**
   * Remove bookmark by URL
   */
  removeByUrl(url: string): boolean {
    const normalizedUrl = this.normalizeUrl(url);
    const index = this.bookmarks.findIndex((b) => b.url === normalizedUrl);
    if (index === -1) {
      console.error(`[BookmarkManager] Bookmark not found for URL: ${normalizedUrl}`);
      return false;
    }

    const removed = this.bookmarks.splice(index, 1)[0];
    this.saveBookmarks();
    console.log(`[BookmarkManager] Removed bookmark: ${removed.title}`);
    return true;
  }

  /**
   * Clear all bookmarks
   */
  clear(): void {
    this.bookmarks = [];
    this.saveBookmarks();
    console.log("[BookmarkManager] Cleared all bookmarks");
  }
}
