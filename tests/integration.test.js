'use strict';

const { analyzeInput } = require('../dist-backend/shared');
const { getPlatforms } = require('../dist-backend/username');

describe('MVC Pipeline Integration', () => {
  it('should sanitize input and successfully resolve matching platform configurations', () => {
    const rawInput = '  @johndoe  ';
    const categories = ['Tech', 'Gaming'];

    // 1. Analyze and sanitize the raw UI target input
    const analysis = analyzeInput(rawInput);
    expect(analysis.valid).toBe(true);
    expect(analysis.sanitized).toBe('johndoe');
    expect(analysis.type).toBe('USERNAME');

    // 2. Fetch platform list for the specified categories
    const platformsToScan = getPlatforms(categories);
    expect(Array.isArray(platformsToScan)).toBe(true);
    expect(platformsToScan.length).toBeGreaterThan(20); // Dynamic Tech + Gaming count

    // 3. Verify every configuration shape matches the expected spec
    platformsToScan.forEach(p => {
      expect(p).toHaveProperty('name');
      expect(p).toHaveProperty('category');
      expect(p).toHaveProperty('url');
      expect(p).toHaveProperty('checkType');
      expect(p).toHaveProperty('checkValue');
      expect(['Tech', 'Gaming']).toContain(p.category);
    });
  });

  it('should resolve all platforms if categories array is empty or undefined', () => {
    const analysis = analyzeInput('johndoe');
    expect(analysis.valid).toBe(true);

    const allPlatforms = getPlatforms([]);
    expect(allPlatforms.length).toBeGreaterThan(85);
  });

  it('should gracefully stop scanning if input analyzer rejects the input format', () => {
    const rawInput = '<script>alert(1)</script>'; // Malicious XSS input
    const analysis = analyzeInput(rawInput);

    expect(analysis.valid).toBe(false);
    expect(analysis.type).toBeNull();
    expect(analysis.error).toBeDefined();

    // Since validation failed, the Controller would not call getPlatforms or proceed with scanning
    const platformsToScan = getPlatforms(['Tech']);
    expect(platformsToScan.length).toBeGreaterThan(5); // Standard retrieval should still function normally without crashing
  });
});
