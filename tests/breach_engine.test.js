'use strict';

const { lookupBreaches } = require('../backend/email/breach_engine');

describe('Breach Engine', () => {
  // Behavior 1: No API key → uses mock breach database
  test('returns mock breaches when no HIBP API key is provided', async () => {
    const result = await lookupBreaches('user@gmail.com', { hibpApiKey: null });
    expect(result.source).toBe('mock');
    expect(result.breaches.length).toBeGreaterThan(0);
  });

  // Behavior 2: Gmail pattern returns LinkedIn + Adobe
  test('returns LinkedIn and Adobe breaches for gmail.com emails', async () => {
    const result = await lookupBreaches('user@gmail.com', { hibpApiKey: null });
    const names = result.breaches.map(b => b.name);
    expect(names).toContain('LinkedIn');
    expect(names).toContain('Adobe');
  });

  // Behavior 3: Yahoo pattern returns Yahoo + Zing breaches
  test('returns Yahoo breach for yahoo.com emails', async () => {
    const result = await lookupBreaches('user@yahoo.com', { hibpApiKey: null });
    const names = result.breaches.map(b => b.name);
    expect(names).toContain('Yahoo');
  });

  // Behavior 4: admin@ prefix returns RockYou + Collection #1
  test('returns RockYou breach for admin@ prefix', async () => {
    const result = await lookupBreaches('admin@example.com', { hibpApiKey: null });
    const names = result.breaches.map(b => b.name);
    expect(names).toContain('RockYou');
  });

  // Behavior 5: test@ prefix returns Canva + MyFitnessPal
  test('returns Canva breach for test@ prefix', async () => {
    const result = await lookupBreaches('test@example.com', { hibpApiKey: null });
    const names = result.breaches.map(b => b.name);
    expect(names).toContain('Canva');
  });

  // Behavior 6: Deterministic — same email always returns same breaches
  test('returns identical breaches for the same unmatched email across multiple calls', async () => {
    const email = 'stable_target_42@customdomain.io';
    const r1 = await lookupBreaches(email, { hibpApiKey: null });
    const r2 = await lookupBreaches(email, { hibpApiKey: null });
    const r3 = await lookupBreaches(email, { hibpApiKey: null });

    // Breach names must be identical across all 3 calls
    const names1 = r1.breaches.map(b => b.name).sort();
    const names2 = r2.breaches.map(b => b.name).sort();
    const names3 = r3.breaches.map(b => b.name).sort();
    expect(names1).toEqual(names2);
    expect(names2).toEqual(names3);
  });

  // Behavior 7: Not all emails have breaches — false-negative rate > 0
  test('produces at least some emails with zero breaches (non-trivial false-negative rate)', async () => {
    const testEmails = [
      'clean_person@example.org',
      'nobody_here@nothing.xyz',
      'private_user@protonmail.com',
      'ghost@tutanota.com',
      'safe_account@icloud.com',
      'hidden_user@outlook.com',
      'unknown@test123.net',
      'invisible@randomdomain.co',
      'zero@nonexistent.dev',
      'phantom@unlisted.io',
    ];

    let cleanCount = 0;
    for (const email of testEmails) {
      const result = await lookupBreaches(email, { hibpApiKey: null });
      if (result.breaches.length === 0) cleanCount++;
    }

    // At least 2 out of 10 should be clean
    expect(cleanCount).toBeGreaterThanOrEqual(2);
  });

  // Behavior 8: Privacy-focused domains have lower breach rates than consumer domains
  test('privacy-focused email domains have lower breach exposure than consumer domains', async () => {
    const privacyEmails = [
      'user1@protonmail.com', 'user2@tutanota.com', 'user3@protonmail.com',
      'user4@tutanota.com', 'user5@protonmail.com',
    ];
    const consumerEmails = [
      'user1@hotmail.com', 'user2@aol.com', 'user3@hotmail.com',
      'user4@aol.com', 'user5@hotmail.com',
    ];

    let privacyBreaches = 0;
    let consumerBreaches = 0;
    for (const email of privacyEmails) {
      const r = await lookupBreaches(email, { hibpApiKey: null });
      privacyBreaches += r.breaches.length;
    }
    for (const email of consumerEmails) {
      const r = await lookupBreaches(email, { hibpApiKey: null });
      consumerBreaches += r.breaches.length;
    }

    // Privacy domains should yield strictly fewer total breaches
    expect(privacyBreaches).toBeLessThan(consumerBreaches);
  });

  // Behavior 9: Each breach object has required schema fields
  test('breach objects match the Breach interface schema', async () => {
    const result = await lookupBreaches('user@gmail.com', { hibpApiKey: null });
    const breach = result.breaches[0];
    expect(breach).toHaveProperty('name');
    expect(breach).toHaveProperty('domain');
    expect(breach).toHaveProperty('breachDate');
    expect(breach).toHaveProperty('pwnCount');
    expect(breach).toHaveProperty('compromisedData');
    expect(Array.isArray(breach.compromisedData)).toBe(true);
    expect(breach).toHaveProperty('isVerified');
  });
});

