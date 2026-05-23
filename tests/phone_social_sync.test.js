'use strict';

const { discoverSocialProfiles } = require('../dist-backend/phone/social_sync');
const { getDeterministicProfile } = require('../dist-backend/phone/caller_id');

describe('Phone Social Media & App Sync Discovery', () => {
  // Behavior 1: Consistent Facebook Discovery matches
  test('returns simulated Facebook profiles matching target deterministic name', async () => {
    const phone = '+84987654321';
    const profile = getDeterministicProfile(phone);
    const result = await discoverSocialProfiles(phone);

    expect(result.facebook).toBeDefined();
    expect(result.facebook.candidateName).toBe(profile.realName);
    expect(result.facebook.profileUrl).toContain('facebook.com');
  });

  // Behavior 2: OTT App Sync simulation returns consistent profiles with working avatars
  test('returns simulated OTT app profiles with deterministic display names and working avatars', async () => {
    const phone = '+84987654321';
    const profile = getDeterministicProfile(phone);
    const result = await discoverSocialProfiles(phone);

    expect(result.ottProfiles).toBeDefined();
    expect(Array.isArray(result.ottProfiles)).toBe(true);
    expect(result.ottProfiles.length).toBeGreaterThan(0);

    result.ottProfiles.forEach(appProfile => {
      expect(appProfile).toHaveProperty('app');
      expect(appProfile).toHaveProperty('username');
      expect(appProfile).toHaveProperty('displayName');
      expect(appProfile).toHaveProperty('avatarUrl');

      // Names should match the seed target profile name
      expect(appProfile.displayName).toBe(profile.realName);

      // Avatars should be valid i.pravatar.cc links using phone numbers as seed
      expect(appProfile.avatarUrl).toContain('https://i.pravatar.cc/150?u=');
      expect(appProfile.avatarUrl).toContain('84987654321');
    });
  });

  // Behavior 3: OTT app list matches regional fallbacks
  test('includes Zalo in OTT apps for Vietnamese numbers but not for US numbers', async () => {
    const vnResult = await discoverSocialProfiles('+84987654321');
    const usResult = await discoverSocialProfiles('+12025550143');

    const vnApps = vnResult.ottProfiles.map(p => p.app);
    const usApps = usResult.ottProfiles.map(p => p.app);

    expect(vnApps).toContain('Zalo');
    expect(usApps).not.toContain('Zalo');
  });
});
