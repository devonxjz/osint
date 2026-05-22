'use strict';

const { generateEmailPermutations } = require('../backend/email/permutation_engine');

describe('Email Permutation Engine', () => {
  // Behavior 1: Generates work email patterns from realName + domain
  test('generates work email variants from real name and domain', () => {
    const result = generateEmailPermutations({
      realName: 'Mike Brown',
      domain: 'company.com',
    });
    expect(result.workEmails).toContain('mike.brown@company.com');
    expect(result.workEmails).toContain('m.brown@company.com');
    expect(result.workEmails).toContain('mbrown@company.com');
    expect(result.workEmails).toContain('mike@company.com');
    expect(result.workEmails).toContain('brownm@company.com');
  });

  // Behavior 2: Generates personal email patterns from username
  test('generates personal email variants from username', () => {
    const result = generateEmailPermutations({
      username: 'mikeb55',
    });
    expect(result.personalEmails).toContain('mikeb55@gmail.com');
    expect(result.personalEmails).toContain('mikeb55@yahoo.com');
    expect(result.personalEmails).toContain('mikeb55@hotmail.com');
    expect(result.personalEmails).toContain('mikeb55@outlook.com');
  });

  // Behavior 3: Handles dot-variant for Gmail
  test('generates dot-variant for Gmail when username has adjacent alpha-numeric', () => {
    const result = generateEmailPermutations({
      username: 'mikeb55',
    });
    // Should try dot variants like mike.b55@gmail.com
    expect(result.personalEmails).toContain('mike.b55@gmail.com');
  });

  // Behavior 4: Returns empty arrays when insufficient input
  test('returns empty work emails when no realName provided', () => {
    const result = generateEmailPermutations({ username: 'mikeb55' });
    expect(result.workEmails).toEqual([]);
  });

  test('returns empty personal emails when no username provided', () => {
    const result = generateEmailPermutations({ realName: 'Mike Brown', domain: 'company.com' });
    expect(result.personalEmails).toEqual([]);
  });

  // Behavior 5: Does not produce duplicate entries
  test('produces no duplicate email addresses', () => {
    const result = generateEmailPermutations({
      realName: 'Mike Brown',
      domain: 'company.com',
      username: 'mikeb55',
    });
    const all = [...result.workEmails, ...result.personalEmails];
    const unique = new Set(all);
    expect(unique.size).toBe(all.length);
  });
});
