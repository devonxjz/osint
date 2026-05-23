// backend/phone/social_sync.ts

'use strict';

import { validatePhone } from './validator';
import { getDeterministicProfile } from './caller_id';

export interface FbDiscoveryMatch {
  profileUrl: string;
  pageName: string;
  candidateName: string;
}

export interface OttProfile {
  app: string;
  username: string;
  displayName: string;
  avatarUrl: string;
}

export interface SocialSyncResult {
  facebook: FbDiscoveryMatch;
  ottProfiles: OttProfile[];
}

/**
 * Normalizes strings to create clean alphanumeric usernames by stripping accents and special characters.
 *
 * @param str - Raw input name string
 * @returns Clean alphanumeric string
 */
function slugifyName(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strips Vietnamese accents
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, ''); // Strips spaces and non-alpha characters
}

/**
 * Simulated OTT Profile Lookup and Facebook Discovery.
 * 
 * ==========================================
 * IMPORTANT SECURITY AND ENVIRONMENT BOUNDS:
 * ==========================================
 * Due to end-to-end encryption (E2E) and strict privacy controls on modern 
 * OTT mobile applications (WhatsApp, Telegram, Zalo, Viber, Snapchat), 
 * direct emulator-based contact synchronization is impossible in a headless serverless function.
 * Therefore, this module is strictly a SIMULATED PROFILE LOOKUP (mock-only for sandbox environments).
 * It uses deterministic seed-based hashing to construct mock OTT app profiles and discovery records,
 * guaranteeing high fidelity and unified target profiling without real-world telemetry or tracking risk.
 *
 * @param phone - Target phone number
 * @returns SocialSyncResult
 */
export async function discoverSocialProfiles(phone: string): Promise<SocialSyncResult> {
  const validation = validatePhone(phone);
  const cleanPhone = validation.valid ? validation.formatted : phone;

  // Retrieve deterministic caller ID profile to ensure profile consistency
  const baseProfile = getDeterministicProfile(cleanPhone);
  const rawDigits = cleanPhone.replace('+', '');
  
  const usernameSlug = slugifyName(baseProfile.realName);

  // ─── Part 1: Facebook Discovery Mock ───
  const facebook: FbDiscoveryMatch = {
    profileUrl: `https://facebook.com/${usernameSlug}.profile`,
    pageName: `${baseProfile.realName} Store`,
    candidateName: baseProfile.realName
  };

  // ─── Part 2: OTT Mobile Sync Mock ───
  const isVN = cleanPhone.startsWith('+84');
  const appList = isVN 
    ? ['Zalo', 'Telegram', 'WhatsApp'] 
    : ['WhatsApp', 'Telegram', 'Snapchat'];

  const ottProfiles: OttProfile[] = appList.map((app) => {
    return {
      app,
      username: `${usernameSlug}_${app.toLowerCase()}`,
      displayName: baseProfile.realName,
      avatarUrl: `https://i.pravatar.cc/150?u=${rawDigits}`
    };
  });

  return {
    facebook,
    ottProfiles
  };
}
