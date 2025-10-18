/**
 * Theme color cache with LRU eviction
 */

export class ThemeColorCache {
  private cache: Map<string, { color: string; timestamp: number }> = new Map();
  private readonly maxSize = 100;

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
  }

  get(domain: string): string | null {
    const entry = this.cache.get(domain);
    if (entry) {
      // Update timestamp on access (LRU)
      entry.timestamp = Date.now();
      return entry.color;
    }
    return null;
  }

  clear(): void {
    this.cache.clear();
  }
}
