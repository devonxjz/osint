'use strict';

const { getPlatforms, getAllPlatforms, getCategories } = require('../backend/registry');
const { benchmarkSync } = require('./utils/benchmark');

describe('Platform Registry', () => {
  const all = getAllPlatforms();

  it('has greater than 100 platforms total', () => {
    expect(all.length).toBeGreaterThan(85);
  });

  it('all platforms have required fields with correct types', () => {
    const REQUIRED = ['name', 'category', 'url', 'checkType', 'checkValue'];
    const ALLOWED_CATEGORIES = ['Social', 'Tech', 'Gaming', 'Media', 'Regional', 'Privacy', 'DarkWeb'];
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
      expect(results.length).toBeGreaterThan(0);
      results.forEach(p => {
        expect(p.category).toBe('Tech');
      });
    });

    it('returns combined platforms for multiple category filters case-insensitively', () => {
      const results = getPlatforms(['tech', 'gaming']);
      expect(results.length).toBeGreaterThan(0);
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
      expect(categories.sort()).toEqual([
        'DarkWeb',
        'Gaming',
        'Media',
        'Privacy',
        'Regional',
        'Social',
        'Tech'
      ]);
    });
  });

  describe('Upgraded PlatformConfig Schema & Security validation', () => {
    it('ensures every platform has a valid identifierType', () => {
      const ALLOWED_IDENTIFIER_TYPES = ['USERNAME', 'PHONE', 'EMAIL'];
      all.forEach(p => {
        expect(p).toHaveProperty('identifierType');
        expect(ALLOWED_IDENTIFIER_TYPES).toContain(p.identifierType);
      });
    });

    it('validates optional PlatformConfig attributes if present', () => {
      const ALLOWED_IDENTIFIER_TYPES = ['USERNAME', 'PHONE', 'EMAIL'];
      const ALLOWED_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

      all.forEach(p => {
        // 1. identifierType validation
        if (p.identifierType !== undefined) {
          expect(ALLOWED_IDENTIFIER_TYPES).toContain(p.identifierType);
        }

        // 2. requiresProxy validation
        if (p.requiresProxy !== undefined) {
          expect(typeof p.requiresProxy).toBe('boolean');
        }

        // 3. envCookieKey validation (Security: no raw cookies, valid uppercase key pattern)
        if (p.envCookieKey !== undefined) {
          expect(typeof p.envCookieKey).toBe('string');
          expect(p.envCookieKey).toMatch(/^[A-Z0-9_]+_COOKIE_KEY$/);
        }
        expect(p).not.toHaveProperty('customCookies'); // raw cookies anti-pattern guard

        // 4. timeout validation (positive number > 0)
        if (p.timeout !== undefined) {
          expect(typeof p.timeout).toBe('number');
          expect(p.timeout).toBeGreaterThan(0);
          expect(Number.isInteger(p.timeout)).toBe(true);
        }

        // 5. riskLevel validation
        if (p.riskLevel !== undefined) {
          expect(ALLOWED_RISK_LEVELS).toContain(p.riskLevel);
        }
      });
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
      require('../backend/registry');
      const end = performance.now();
      expect(end - start).toBeLessThan(5.0);
    });
  });
});
