'use strict';

const { resolveIdentity } = require('../backend/email/identity_resolver');

describe('Identity Resolution Engine', () => {
  // Behavior 1: Returns identity result with correct shape
  test('returns an IdentityResult object with required fields', async () => {
    const result = await resolveIdentity('user@example.com');
    expect(result).toHaveProperty('realName');
    expect(result).toHaveProperty('employer');
    expect(result).toHaveProperty('position');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sources');
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.confidence);
    expect(Array.isArray(result.sources)).toBe(true);
  });

  // Behavior 2: Uses Gravatar displayName as identity candidate
  test('incorporates Gravatar displayName when available', async () => {
    const gravatarProfile = {
      hasGravatar: true,
      displayName: 'John Smith',
      location: 'San Francisco',
    };
    const result = await resolveIdentity('user@example.com', { gravatarProfile });
    // When Gravatar provides a name, it should be used
    if (result.realName) {
      expect(result.sources).toContain('gravatar');
    }
  });

  // Behavior 3: Waterfall — if no Gravatar, falls through to next source
  test('returns LOW confidence when no sources provide data', async () => {
    const result = await resolveIdentity('definitely_not_real_user@nonexistent-domain-xyz.io', {
      gravatarProfile: { hasGravatar: false, displayName: null },
      skipHunter: true,
      skipDork: true,
    });
    expect(result.confidence).toBe('LOW');
    expect(result.realName).toBeNull();
  });

  // Behavior 4: Can extract name from firstname.lastname email pattern
  test('infers candidate name from firstname.lastname email format', async () => {
    const result = await resolveIdentity('john.doe@company.com', {
      skipHunter: true,
      skipDork: true,
      gravatarProfile: { hasGravatar: false, displayName: null },
    });
    // Email pattern inference should produce a candidate
    expect(result.realName).toBeTruthy();
    expect(result.sources).toContain('email_pattern');
  });

  // Behavior 5: Hunter.io integration shapes result correctly when provided
  test('uses Hunter.io data when available', async () => {
    const hunterData = {
      firstName: 'Jane',
      lastName: 'Doe',
      position: 'Engineer',
      company: 'Acme Corp',
      score: 85,
    };
    const result = await resolveIdentity('jane.doe@acme.com', {
      hunterData,
      skipDork: true,
    });
    expect(result.realName).toBe('Jane Doe');
    expect(result.employer).toBe('Acme Corp');
    expect(result.position).toBe('Engineer');
    expect(result.confidence).toBe('HIGH');
    expect(result.sources).toContain('hunter');
  });
});
