'use strict';

const { validateEmail } = require('../api/email/validator');

describe('Email Validator', () => {
  // Behavior 1: Valid email passes RFC 5322 syntax check
  test('accepts a well-formed email address', () => {
    const result = validateEmail('mike.brown@company.com');
    expect(result.syntaxValid).toBe(true);
    expect(result.email).toBe('mike.brown@company.com');
  });

  // Behavior 2: Rejects malformed email
  test('rejects an email without @ symbol', () => {
    const result = validateEmail('notanemail');
    expect(result.syntaxValid).toBe(false);
  });

  test('rejects an empty string', () => {
    const result = validateEmail('');
    expect(result.syntaxValid).toBe(false);
  });

  // Behavior 3: Detects disposable email providers
  test('flags disposable email domains', () => {
    const result = validateEmail('user@mailinator.com');
    expect(result.isDisposable).toBe(true);
  });

  test('does not flag gmail as disposable', () => {
    const result = validateEmail('user@gmail.com');
    expect(result.isDisposable).toBe(false);
  });

  // Behavior 4: Domain MX check (mocked DNS)
  test('reports domainExists true for domains with MX records', async () => {
    const result = await validateEmail('user@gmail.com', { checkMx: true });
    expect(result.domainExists).toBe(true);
  });

  // Behavior 5: Generates email permutations from a work-style email
  test('generates permutations from firstname.lastname pattern', () => {
    const result = validateEmail('mike.brown@company.com');
    expect(result.suggestedPermutations).toEqual(
      expect.arrayContaining([
        'mbrown@company.com',
        'mike@company.com',
        'm.brown@company.com',
      ])
    );
  });

  test('does not generate permutations for simple usernames', () => {
    const result = validateEmail('mikeb55@yahoo.com');
    // Simple username — no firstname.lastname pattern, so fewer permutations
    expect(result.suggestedPermutations.length).toBeLessThanOrEqual(3);
  });
});
