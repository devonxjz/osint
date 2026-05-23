// backend/cache.ts

'use strict';

export interface ResultCacheOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class ResultCache {
  private maxSize: number;
  private defaultTtlMs: number;
  public store: Map<string, CacheEntry<any>>;
  private hits: number = 0;
  private misses: number = 0;

  constructor(options: ResultCacheOptions = {}) {
    this.maxSize = options.maxSize || 500;
    this.defaultTtlMs = options.defaultTtlMs || 300000; // 5 min
    this.store = new Map();
  }

  get<T = any>(key: string): T | null {
    if (!this.store.has(key)) {
      this.misses++;
      return null;
    }

    const entry = this.store.get(key)!;
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

    return entry.value as T;
  }

  set<T = any>(key: string, value: T, ttlMs: number | null = null): void {
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
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size
    };
  }
}
