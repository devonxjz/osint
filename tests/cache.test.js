// tests/cache.test.js

'use strict';

const { ResultCache } = require('../dist-backend/cache');

describe('ResultCache - Behavior 1: Basic Set/Get', () => {
  test('should store and retrieve a value by its key', () => {
    const cache = new ResultCache();
    const result = { platform: 'GitHub', status: 'FOUND', url: 'https://github.com/testuser' };
    
    cache.set('testuser::GitHub', result);
    
    expect(cache.get('testuser::GitHub')).toEqual(result);
  });

  test('should return null for non-existent keys', () => {
    const cache = new ResultCache();
    expect(cache.get('nonexistent')).toBeNull();
  });
});

describe('ResultCache - Behavior 2: TTL Expiration', () => {
  let dateSpy;

  beforeEach(() => {
    dateSpy = jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    dateSpy.mockRestore();
  });

  test('should expire items after custom TTL', () => {
    const cache = new ResultCache();
    const result = { platform: 'GitHub', status: 'FOUND' };

    dateSpy.mockReturnValue(1000); // Time = 1000ms
    cache.set('key1', result, 500); // 500ms TTL

    // At 1400ms: should still be active
    dateSpy.mockReturnValue(1400);
    expect(cache.get('key1')).toEqual(result);

    // At 1501ms: should expire
    dateSpy.mockReturnValue(1501);
    expect(cache.get('key1')).toBeNull();
  });

  test('should expire items after default TTL when custom TTL is not provided', () => {
    const cache = new ResultCache({ defaultTtlMs: 1000 });
    const result = { platform: 'GitLab', status: 'FOUND' };

    dateSpy.mockReturnValue(1000);
    cache.set('key1', result);

    dateSpy.mockReturnValue(1999);
    expect(cache.get('key1')).toEqual(result);

    dateSpy.mockReturnValue(2001);
    expect(cache.get('key1')).toBeNull();
  });

  test('should delete expired item from the internal store on access', () => {
    const cache = new ResultCache({ defaultTtlMs: 100 });
    
    dateSpy.mockReturnValue(1000);
    cache.set('key1', 'val1');

    dateSpy.mockReturnValue(1200);
    expect(cache.get('key1')).toBeNull();

    // Verify key was removed from internal map entirely (lazy collection)
    expect(cache.store.has('key1')).toBe(false);
  });
});

describe('ResultCache - Behavior 3: LRU Eviction', () => {
  test('should evict the oldest key when size limit is exceeded', () => {
    const cache = new ResultCache({ maxSize: 3 });
    
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');

    // Currently at maxSize limit (3 items)
    expect(cache.get('key1')).toBe('val1');
    expect(cache.get('key2')).toBe('val2');
    expect(cache.get('key3')).toBe('val3');

    // Adding key4 should trigger eviction of the oldest ('key1')
    cache.set('key4', 'val4');

    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('val2');
    expect(cache.get('key3')).toBe('val3');
    expect(cache.get('key4')).toBe('val4');
  });
});

describe('ResultCache - Behavior 4: Access Refreshes LRU Status', () => {
  test('should keep recently accessed key and evict older unaccessed key instead', () => {
    const cache = new ResultCache({ maxSize: 3 });
    
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    cache.set('key3', 'val3');

    // Access key1, which refreshes its LRU position (making key2 the oldest)
    cache.get('key1');

    // Adding key4 should now trigger eviction of 'key2' instead of 'key1'
    cache.set('key4', 'val4');

    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key1')).toBe('val1');
    expect(cache.get('key3')).toBe('val3');
    expect(cache.get('key4')).toBe('val4');
  });
});

describe('ResultCache - Behavior 5: Cache Statistics', () => {
  test('should report accurate hits, misses, and current size', () => {
    const cache = new ResultCache({ defaultTtlMs: 100 });
    
    // Initial stats
    expect(cache.stats()).toEqual({ hits: 0, misses: 0, size: 0 });

    // Store items
    cache.set('key1', 'val1');
    cache.set('key2', 'val2');
    expect(cache.stats().size).toBe(2);

    // Hit
    expect(cache.get('key1')).toBe('val1');
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 0, size: 2 });

    // Miss
    expect(cache.get('nonexistent')).toBeNull();
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 1, size: 2 });

    // Miss due to expiration (lazy eviction should reduce size)
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 500);
    expect(cache.get('key2')).toBeNull();
    expect(cache.stats()).toMatchObject({ hits: 1, misses: 2, size: 1 });
    dateSpy.mockRestore();
  });
});
