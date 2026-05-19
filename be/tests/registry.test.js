'use strict';

const { getPlatforms, getAllPlatforms, getCategories } = require('../src/registry');
const { benchmarkSync } = require('./utils/benchmark');

describe('Platform Registry', () => {
  const all = getAllPlatforms();

  it('has exactly 45 platforms total', () => {
    expect(all.length).toBe(45);
  });

  it('all platforms have required fields with correct types', () => {
    const REQUIRED = ['name', 'category', 'url', 'checkType', 'checkValue'];
    const ALLOWED_CATEGORIES = ['Tech', 'Social', 'Gaming', 'Media'];
    const ALLOWED_CHECK_TYPES = ['status', 'text', 'selector'];

    all.forEach(p => {
      // 1. Check all required fields are present
      REQUIRED.forEach(field => expect(p).toHaveProperty(field));

      // 2. Validate category
      expect(ALLOWED_CATEGORIES).toContain(p.category);

      // 3. Validate checkType
      expect(ALLOWED_CHECK_TYPES).toContain(p.checkType);

      // 4. Validate checkValue type depending on checkType
      if (p.checkType === 'status') {
        expect(typeof p.checkValue).toBe('number');
      } else {
        expect(typeof p.checkValue).toBe('string');
      }
    });
  });

  it('every url contains exactly one "{}" placeholder', () => {
    all.forEach(p => {
      const count = (p.url.match(/\{\}/g) || []).length;
      expect(count).toBe(1);
    });
  });

  it('every url starts with https://', () => {
    all.forEach(p => {
      expect(p.url.startsWith('https://')).toBe(true);
    });
  });

  it('no url contains spaces', () => {
    all.forEach(p => {
      expect(p.url).not.toContain(' ');
    });
  });

  it('no duplicate platform names', () => {
    const names = all.map(p => p.name.toLowerCase());
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('no duplicate urls', () => {
    const urls = all.map(p => p.url.toLowerCase());
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);
  });

  describe('getPlatforms() behavior', () => {
    it('returns all platforms when called with no args', () => {
      const results = getPlatforms();
      expect(results.length).toBe(all.length);
    });

    it('returns all platforms when called with empty array', () => {
      const results = getPlatforms([]);
      expect(results.length).toBe(all.length);
    });

    it('returns only Tech platforms when filtered', () => {
      const results = getPlatforms(['Tech']);
      expect(results.length).toBe(10);
      results.forEach(p => {
        expect(p.category).toBe('Tech');
      });
    });

    it('returns combined platforms for multiple category filters case-insensitively', () => {
      const results = getPlatforms(['tech', 'gaming']);
      expect(results.length).toBe(19);
      results.forEach(p => {
        expect(['Tech', 'Gaming']).toContain(p.category);
      });
    });

    it('returns empty array for unknown category', () => {
      const results = getPlatforms(['Unknown']);
      expect(results).toEqual([]);
    });
  });

  describe('getCategories() behavior', () => {
    it('returns unique list of categories', () => {
      const categories = getCategories();
      expect(categories.sort()).toEqual(['Gaming', 'Media', 'Social', 'Tech']);
    });
  });

  describe('Performance Constraints', () => {
    it('executes getPlatforms under 1ms on average', () => {
      const avgTime = benchmarkSync(getPlatforms, [['Tech', 'Gaming']], 1000);
      expect(avgTime).toBeLessThan(1.0);
    });

    it('executes getAllPlatforms under 1ms on average', () => {
      const avgTime = benchmarkSync(getAllPlatforms, [], 1000);
      expect(avgTime).toBeLessThan(1.0);
    });

    it('module loads under 5ms (indirectly tested by require speed)', () => {
      const start = performance.now();
      require('../src/registry');
      const end = performance.now();
      expect(end - start).toBeLessThan(5.0);
    });
  });
});
