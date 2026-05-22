// api/cache.js

'use strict';

class ResultCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTtlMs = options.defaultTtlMs || 300000; // 5 min
    this.store = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.store.has(key)) {
      this.misses++;
      return null;
    }

    const entry = this.store.get(key);
    const now = Date.now();
    const age = now - entry.createdAt;

    if (age > entry.ttl) {
      this.store.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;

    // Refresh LRU position by re-inserting at the end of Map order
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  set(key, value, ttlMs = null) {
    const ttl = ttlMs !== null ? ttlMs : this.defaultTtlMs;

    // Delete existing key so new insertion goes to the end of Map order (most recently used)
    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, {
      value,
      createdAt: Date.now(),
      ttl
    });

    // Check size limit and evict oldest if needed
    if (this.store.size > this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
  }

  invalidate(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats() {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size
    };
  }
}

module.exports = { ResultCache };
