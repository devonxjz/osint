'use strict';

const { lookupGravatar, computeGravatarHash } = require('../dist-backend/email/gravatar');

describe('Gravatar & Avatar Intelligence', () => {
  // Behavior 1: MD5 hash normalization — trim + lowercase before hashing
  test('computes correct MD5 hash with trim and lowercase normalization', () => {
    // Known: "test@example.com" → "55502f40dc8b7c769880b10874abc9d0"
    const hash = computeGravatarHash('test@example.com');
    expect(hash).toBe('55502f40dc8b7c769880b10874abc9d0');
  });

  test('normalizes uppercase and whitespace before hashing', () => {
    const hash1 = computeGravatarHash('  Test.Email@Gmail.com  ');
    const hash2 = computeGravatarHash('test.email@gmail.com');
    expect(hash1).toBe(hash2);
  });

  // Behavior 2: Returns avatar URL when Gravatar exists
  test('returns avatarUrl for emails with Gravatar profiles', async () => {
    // Using a known Gravatar test email
    const result = await lookupGravatar('test@example.com');
    expect(result).toHaveProperty('hasGravatar');
    expect(result).toHaveProperty('avatarUrl');
    expect(result).toHaveProperty('hash');
    expect(result.hash).toBe('55502f40dc8b7c769880b10874abc9d0');
  });

  // Behavior 3: Returns hasGravatar false for non-existent profiles
  test('returns hasGravatar false for random nonexistent email', async () => {
    const result = await lookupGravatar('definitely_not_a_real_user_92384@nonexistent-domain-zzz.com');
    expect(result.hasGravatar).toBe(false);
    expect(result.avatarUrl).toBeNull();
  });

  // Behavior 4: Profile data structure includes expected fields
  test('profile object contains displayName and location fields when available', async () => {
    const result = await lookupGravatar('test@example.com');
    // These may be null but the fields must exist
    expect(result).toHaveProperty('displayName');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('aboutMe');
  });
});
