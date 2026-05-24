// backend/email/gravatar.ts

'use strict';

import crypto from 'crypto';
import axios from 'axios';

/**
 * Computes Gravatar-compatible MD5 hash.
 * Per PRD Module 4: email must be trim() + toLowerCase() before hashing.
 *
 * @param email
 * @returns MD5 hex digest
 */
export function computeGravatarHash(email: string): string {
  return crypto
    .createHash('md5')
    .update(email.trim().toLowerCase())
    .digest('hex');
}

export interface GravatarResult {
  hash: string;
  hasGravatar: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  aboutMe: string | null;
  location: string | null;
  profileUrls: string[];
}

/**
 * Looks up Gravatar avatar and extended profile for an email.
 *
 * Flow:
 *   email → normalize → MD5 → avatar endpoint (?d=404)
 *   If 200 → fetch profile JSON for displayName, aboutMe, location
 *   If 404 → hasGravatar: false
 *
 * @param email
 * @returns GravatarResult
 */
export async function lookupGravatar(email: string): Promise<GravatarResult> {
  const hash = computeGravatarHash(email);
  const result: GravatarResult = {
    hash,
    hasGravatar: false,
    avatarUrl: null,
    displayName: null,
    aboutMe: null,
    location: null,
    profileUrls: [],
  };

  try {
    // Step 1: Check avatar existence
    const avatarResponse = await axios.get(
      `https://www.gravatar.com/avatar/${hash}?d=404`,
      {
        validateStatus: () => true,
        timeout: 5000,
        responseType: 'arraybuffer', // Don't parse image as text
      }
    );

    if (avatarResponse.status !== 200) {
      return result;
    }

    result.hasGravatar = true;
    result.avatarUrl = `https://www.gravatar.com/avatar/${hash}?s=200`;

    // Step 2: Fetch extended profile JSON
    try {
      const profileResponse = await axios.get(
        `https://www.gravatar.com/${hash}.json`,
        {
          validateStatus: () => true,
          timeout: 5000,
        }
      );

      if (profileResponse.status === 200 && profileResponse.data && profileResponse.data.entry) {
        const entry = profileResponse.data.entry[0];
        result.displayName = entry.displayName || entry.preferredUsername || null;
        result.aboutMe = entry.aboutMe || null;
        result.location = entry.currentLocation || null;
        result.profileUrls = (entry.urls || []).map((u: any) => u.value);
      }
    } catch {
      // Profile JSON is optional, avatar is sufficient
    }

    return result;

  } catch {
    // Network error — treat as no Gravatar
    return result;
  }
}
