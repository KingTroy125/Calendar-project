/**
 * Small dependency-free in-process cache with time-based expiry.
 *
 * The Calendar API uses Redis-free caching on purpose: the deployment is a
 * single Vercel Function that already scales horizontally, and the only data
 * worth caching is a short-lived, per-user event window. For a shared cache
 * across many instances, see docs/caching.md.
 *
 * Behavior:
 *   - entries expire after a TTL and are removed lazily on read
 *   - reads refresh recency, so the size limit approximates LRU
 *   - a size limit keeps memory bounded even under many distinct keys
 *   - prefix invalidation lets a write drop every window for one user
 *
 * This module has no Express or Prisma dependency; it can be unit tested on its
 * own.
 */

export class TtlCache {
  #entries = new Map();
  #ttlMs;
  #maxEntries;
  #hits = 0;
  #misses = 0;
  #evictions = 0;

  constructor({ ttlMs = 5_000, maxEntries = 500 } = {}) {
    this.#ttlMs = Number.isFinite(ttlMs) && ttlMs >= 0 ? ttlMs : 5_000;
    this.#maxEntries = Number.isFinite(maxEntries) && maxEntries >= 1 ? Math.floor(maxEntries) : 500;
  }

  get ttlMs() {
    return this.#ttlMs;
  }

  get maxEntries() {
    return this.#maxEntries;
  }

  /** Number of live entries. Expired entries are pruned first. */
  get size() {
    this.#pruneExpired();
    return this.#entries.size;
  }

  /** Return the cached value, or undefined when missing or expired. */
  get(key) {
    const entry = this.#entries.get(key);
    if (!entry) {
      this.#misses += 1;
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      this.#misses += 1;
      return undefined;
    }

    // Re-insert so Map iteration order tracks recency for eviction.
    this.#entries.delete(key);
    this.#entries.set(key, entry);
    this.#hits += 1;
    return entry.value;
  }

  /**
   * Store a value. A zero (or negative) TTL removes the key instead, which is
   * how `EVENTS_CACHE_TTL_MS=0` disables caching without branching at call sites.
   */
  set(key, value, ttlMs = this.#ttlMs) {
    this.#entries.delete(key);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) return;

    this.#entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    this.#enforceLimit();
  }

  delete(key) {
    return this.#entries.delete(key);
  }

  /** Remove every key that starts with `prefix`; returns how many were removed. */
  invalidatePrefix(prefix) {
    let removed = 0;
    for (const key of [...this.#entries.keys()]) {
      if (key.startsWith(prefix)) {
        this.#entries.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  clear() {
    this.#entries.clear();
  }

  /** Counters are safe to log; keys may contain user IDs and are never exposed. */
  stats() {
    return {
      entries: this.size,
      hits: this.#hits,
      misses: this.#misses,
      evictions: this.#evictions,
      ttlMs: this.#ttlMs,
      maxEntries: this.#maxEntries,
    };
  }

  #pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.#entries) {
      if (entry.expiresAt <= now) this.#entries.delete(key);
    }
  }

  #enforceLimit() {
    if (this.#entries.size <= this.#maxEntries) return;

    this.#pruneExpired();

    // Map.keys() is in insertion order, which `get` refreshes, so this drops
    // the least recently used entry first.
    while (this.#entries.size > this.#maxEntries) {
      const oldestKey = this.#entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.#entries.delete(oldestKey);
      this.#evictions += 1;
    }
  }
}
