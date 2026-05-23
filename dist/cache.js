"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
class Cache {
    store = new Map();
    defaultTtl;
    constructor(defaultTtl = 5 * 60 * 1000) {
        this.defaultTtl = defaultTtl;
    }
    /** Get a cached value. Returns undefined if missing or expired. */
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /** Set a cached value with optional TTL override (in ms). */
    set(key, value, ttl) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttl ?? this.defaultTtl),
        });
    }
    /** Check if a key exists and is not expired */
    has(key) {
        const entry = this.store.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
    /** Delete a specific key */
    delete(key) {
        this.store.delete(key);
    }
    /** Clear all cached entries */
    clear() {
        this.store.clear();
    }
    /** Get the number of cached entries */
    get size() {
        return this.store.size;
    }
}
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map