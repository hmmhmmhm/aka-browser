/**
 * Theme color cache with LRU eviction and disk persistence
 */

import { app } from "electron";
import path from "path";
import fs from "fs";

interface ThemeColorEntry {
  color: string;
  timestamp: number;
}

interface ThemeColorCacheData {
  [domain: string]: ThemeColorEntry;
}

export class ThemeColorCache {
  private cache: Map<string, ThemeColorEntry> = new Map();
  private readonly maxSize = 100;
  private cachePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly saveDelay = 1000; // Debounce save by 1 second

  constructor() {
    const userDataPath = app.getPath("userData");
    this.cachePath = path.join(userDataPath, "theme-colors.json");
    this.loadCache();
    
    // Save cache on app quit
    app.on("before-quit", () => {
      this.saveCacheImmediate();
    });
  }

  /**
   * Load cache from disk
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, "utf-8");
        const cacheData: ThemeColorCacheData = JSON.parse(data);
        
        // Convert to Map
        for (const [domain, entry] of Object.entries(cacheData)) {
          this.cache.set(domain, entry);
        }
        
        console.log(`[ThemeColorCache] Loaded ${this.cache.size} cached theme colors`);
      }
    } catch (error) {
      console.error("[ThemeColorCache] Failed to load cache:", error);
      this.cache.clear();
    }
  }

  /**
   * Save cache to disk immediately (synchronous)
   */
  private saveCacheImmediate(): void {
    try {
      // Clear any pending debounced save
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      
      // Convert Map to plain object
      const cacheData: ThemeColorCacheData = {};
      for (const [domain, entry] of this.cache.entries()) {
        cacheData[domain] = entry;
      }
      
      fs.writeFileSync(this.cachePath, JSON.stringify(cacheData, null, 2), "utf-8");
    } catch (error) {
      console.error("[ThemeColorCache] Failed to save cache:", error);
    }
  }

  /**
   * Save cache to disk with debouncing
   */
  private saveCache(): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Schedule save after delay
    this.saveTimeout = setTimeout(() => {
      this.saveCacheImmediate();
    }, this.saveDelay);
  }

  set(domain: string, color: string): void {
    // Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(domain)) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      )[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(domain, {
      color,
      timestamp: Date.now(),
    });
    
    // Save to disk
    this.saveCache();
  }

  get(domain: string): string | null {
    const entry = this.cache.get(domain);
    if (entry) {
      // Update timestamp on access (LRU) - only in memory
      entry.timestamp = Date.now();
      // No need to save immediately, will be saved on next set() or app quit
      return entry.color;
    }
    return null;
  }

  clear(): void {
    this.cache.clear();
    this.saveCache();
  }
}
