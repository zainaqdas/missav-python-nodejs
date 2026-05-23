/**
 * Simple in-memory cache with TTL support.
 * Mirrors the caching behavior from the Python eaf_base_api.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl: number;

  constructor(defaultTtl: number = 5 * 60 * 1000) {
    this.defaultTtl = defaultTtl;
  }

  /** Get a cached value. Returns undefined if missing or expired. */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  /** Set a cached value with optional TTL override (in ms). */
  set<T>(key: string, value: T, ttl?: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl),
    });
  }

  /** Check if a key exists and is not expired */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /** Delete a specific key */
  delete(key: string): void {
    this.store.delete(key);
  }

  /** Clear all cached entries */
  clear(): void {
    this.store.clear();
  }

  /** Get the number of cached entries */
  get size(): number {
    return this.store.size;
  }
}
