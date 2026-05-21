'use strict';

const { searchPeopleData } = require('../api/phone/people_search');
const { getDeterministicProfile } = require('../api/phone/caller_id');

describe('Phone People Search & Dorking Aggregator', () => {
  // Behavior 1: Unified deterministic mock profile consistency
  test('returns deterministic personal details matching the phone seed profile', async () => {
    const phone = '+84987654321';
    const profile = getDeterministicProfile(phone);
    const result = await searchPeopleData(phone);

    expect(result.name).toBe(profile.realName);
    expect(result.realAddress).toContain('Vietnam');
    expect(result.relatives.length).toBeGreaterThan(0);
    expect(result.business).not.toBeNull();
  });

  // Behavior 2: Schema validation
  test('returns the complete data schema fields', async () => {
    const result = await searchPeopleData('+12025550143');

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('realAddress');
    expect(result).toHaveProperty('relatives');
    expect(result).toHaveProperty('business');
    expect(result).toHaveProperty('dorkUrls');
    expect(Array.isArray(result.relatives)).toBe(true);
    expect(Array.isArray(result.dorkUrls)).toBe(true);
  });

  // Behavior 3: Google Dork URL structures
  test('generates actionable Google Dorking URLs with the clean target phone number', async () => {
    const phone = '+84987654321';
    const result = await searchPeopleData(phone);

    expect(result.dorkUrls.length).toBeGreaterThan(0);
    result.dorkUrls.forEach(url => {
      expect(url).toContain('https://www.google.com/search?q=');
      // Should encode target number correctly
      expect(url).toContain('84987654321');
    });
  });
});
