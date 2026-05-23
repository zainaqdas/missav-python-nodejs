export declare class Cache {
    private store;
    private readonly defaultTtl;
    constructor(defaultTtl?: number);
    /** Get a cached value. Returns undefined if missing or expired. */
    get<T>(key: string): T | undefined;
    /** Set a cached value with optional TTL override (in ms). */
    set<T>(key: string, value: T, ttl?: number): void;
    /** Check if a key exists and is not expired */
    has(key: string): boolean;
    /** Delete a specific key */
    delete(key: string): void;
    /** Clear all cached entries */
    clear(): void;
    /** Get the number of cached entries */
    get size(): number;
}
//# sourceMappingURL=cache.d.ts.map