/**
 * Favicon caching system
 * Downloads and caches favicons locally to avoid repeated network requests
 */

import { app, net } from "electron";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class FaviconCache {
  private cachePath: string;

  constructor() {
    const userDataPath = app.getPath("userData");
    this.cachePath = path.join(userDataPath, "favicon-cache");
    this.ensureCacheDirectory();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
      console.log("[FaviconCache] Created cache directory");
    }
  }

  /**
   * Generate cache key from URL
   */
  private getCacheKey(url: string): string {
    return crypto.createHash("md5").update(url).digest("hex");
  }

  /**
   * Get cached favicon path
   */
  private getCachedPath(url: string, extension: string = "png"): string {
    const key = this.getCacheKey(url);
    return path.join(this.cachePath, `${key}.${extension}`);
  }

  /**
   * Check if favicon is cached
   */
  isCached(url: string): boolean {
    const cachedPath = this.getCachedPath(url);
    return fs.existsSync(cachedPath);
  }

  /**
   * Get cached favicon as data URL
   */
  getCached(url: string): string | null {
    try {
      const cachedPath = this.getCachedPath(url);
      if (fs.existsSync(cachedPath)) {
        const data = fs.readFileSync(cachedPath);
        const base64 = data.toString("base64");
        const ext = path.extname(cachedPath).slice(1);
        const mimeType = ext === "svg" ? "image/svg+xml" : `image/${ext}`;
        return `data:${mimeType};base64,${base64}`;
      }
      return null;
    } catch (error) {
      console.error("[FaviconCache] Failed to read cached favicon:", error);
      return null;
    }
  }

  /**
   * Download and cache favicon
   */
  async downloadAndCache(url: string): Promise<string | null> {
    try {
      console.log("[FaviconCache] Downloading favicon:", url);

      return new Promise((resolve) => {
        const request = net.request(url);
        const chunks: Buffer[] = [];

        request.on("response", (response) => {
          if (response.statusCode !== 200) {
            console.error("[FaviconCache] Failed to download:", response.statusCode);
            resolve(null);
            return;
          }

          response.on("data", (chunk) => {
            chunks.push(Buffer.from(chunk));
          });

          response.on("end", () => {
            try {
              const buffer = Buffer.concat(chunks);
              
              // Determine file extension from content-type
              const contentType = response.headers["content-type"];
              let extension = "png";
              if (contentType) {
                if (contentType.includes("svg")) extension = "svg";
                else if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
                else if (contentType.includes("gif")) extension = "gif";
                else if (contentType.includes("webp")) extension = "webp";
                else if (contentType.includes("ico")) extension = "ico";
              }

              const cachedPath = this.getCachedPath(url, extension);
              fs.writeFileSync(cachedPath, buffer);
              console.log("[FaviconCache] Cached favicon:", cachedPath);

              // Return as data URL
              const base64 = buffer.toString("base64");
              const mimeType = extension === "svg" ? "image/svg+xml" : `image/${extension}`;
              resolve(`data:${mimeType};base64,${base64}`);
            } catch (error) {
              console.error("[FaviconCache] Failed to save favicon:", error);
              resolve(null);
            }
          });

          response.on("error", (error) => {
            console.error("[FaviconCache] Response error:", error);
            resolve(null);
          });
        });

        request.on("error", (error) => {
          console.error("[FaviconCache] Request error:", error);
          resolve(null);
        });

        request.end();
      });
    } catch (error) {
      console.error("[FaviconCache] Failed to download favicon:", error);
      return null;
    }
  }

  /**
   * Get favicon with caching
   * Returns cached version if available, otherwise downloads and caches
   */
  async getFavicon(url: string): Promise<string | null> {
    // Check cache first
    const cached = this.getCached(url);
    if (cached) {
      console.log("[FaviconCache] Using cached favicon");
      return cached;
    }

    // Download and cache
    return this.downloadAndCache(url);
  }

  /**
   * Get multiple favicon URLs to try (high-res first)
   */
  getFaviconUrls(pageUrl: string): string[] {
    try {
      const url = new URL(pageUrl);
      const domain = url.hostname;
      
      return [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
        `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
        `https://${domain}/favicon.ico`,
      ];
    } catch {
      return [];
    }
  }

  /**
   * Try multiple favicon sources and return the first successful one
   */
  async getFaviconWithFallback(pageUrl: string): Promise<string | null> {
    const urls = this.getFaviconUrls(pageUrl);
    
    for (const url of urls) {
      const favicon = await this.getFavicon(url);
      if (favicon) {
        return favicon;
      }
    }
    
    return null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    try {
      const files = fs.readdirSync(this.cachePath);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cachePath, file));
      }
      console.log("[FaviconCache] Cache cleared");
    } catch (error) {
      console.error("[FaviconCache] Failed to clear cache:", error);
    }
  }

  /**
   * Get cache size in bytes
   */
  getCacheSize(): number {
    try {
      const files = fs.readdirSync(this.cachePath);
      let totalSize = 0;
      for (const file of files) {
        const stats = fs.statSync(path.join(this.cachePath, file));
        totalSize += stats.size;
      }
      return totalSize;
    } catch (error) {
      console.error("[FaviconCache] Failed to get cache size:", error);
      return 0;
    }
  }
}
