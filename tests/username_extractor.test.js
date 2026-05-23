'use strict';

const { extractUsernames } = require('../dist-backend/email/username_extractor');

describe('Username Extraction from Email', () => {
  // Behavior 1: Strips domain and returns primary username
  test('extracts local part as primary username', () => {
    const result = extractUsernames('mikeb55@yahoo.com');
    expect(result.primary).toBe('mikeb55');
  });

  // Behavior 2: Generates variants by stripping trailing numbers
  test('generates variant without trailing numbers', () => {
    const result = extractUsernames('mikeb55@yahoo.com');
    expect(result.variants).toContain('mikeb');
  });

  // Behavior 3: Swaps dots and underscores
  test('generates dot/underscore swap variants', () => {
    const result = extractUsernames('mike.b55@gmail.com');
    expect(result.variants).toContain('mike_b55');
  });

  test('swaps underscore to dot', () => {
    const result = extractUsernames('mike_b55@gmail.com');
    expect(result.variants).toContain('mike.b55');
  });

  // Behavior 4: Caps variants at 5 to avoid false positive flooding
  test('generates at most 5 variants', () => {
    const result = extractUsernames('some.complex_user.name123@example.com');
    expect(result.variants.length).toBeLessThanOrEqual(5);
  });

  // Behavior 5: Strips leading @ if present
  test('handles leading @ gracefully', () => {
    const result = extractUsernames('@mikeb55@yahoo.com');
    expect(result.primary).toBe('mikeb55');
  });

  // Behavior 6: Does not include the primary in variants
  test('variants do not include the primary username', () => {
    const result = extractUsernames('mikeb55@yahoo.com');
    expect(result.variants).not.toContain('mikeb55');
  });

  // Behavior 7: Handles firstname.lastname email
  test('extracts variants from firstname.lastname pattern', () => {
    const result = extractUsernames('john.doe@company.com');
    expect(result.primary).toBe('john.doe');
    expect(result.variants).toContain('johndoe');
    expect(result.variants).toContain('john_doe');
  });
});
