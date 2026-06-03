import { scanPlatform, getAllPlatforms } from '../username';

// High-value subset of platforms to query for Real Name scans
const HIGH_VALUE_PLATFORMS = new Set([
  'GitHub', 'GitLab', 'Medium', 'Reddit', 'Pinterest',
  'Tumblr', 'Flickr', 'Gravatar', 'X', 'YouTube',
  'Spotify', 'Behance', 'Dribbble', 'ArtStation', 'Goodreads'
]);

/**
 * Generates candidate username variants from a real name.
 */
export function generateVariants(realName: string, deepScan: boolean = false): string[] {
  if (!realName || typeof realName !== 'string') return [];

  const words = realName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const variants: string[] = [];

  if (words.length === 1) {
    variants.push(words[0]);
  } else if (words.length === 2) {
    const [w1, w2] = words;
    // Default 4
    variants.push(`${w1}${w2}`);      // johndoe
    variants.push(`${w1}_${w2}`);     // john_doe
    variants.push(`${w1}.${w2}`);     // john.doe
    variants.push(`${w1[0]}${w2}`);    // jdoe

    if (deepScan) {
      variants.push(`${w2}${w1}`);    // doejohn
      variants.push(`${w2}_${w1}`);   // doe_john
      variants.push(`${w2}.${w1}`);   // doe.john
      variants.push(`${w2[0]}${w1}`);  // djohn
    }
  } else {
    // 3 or more words (e.g. Nguyen Van A)
    const w1 = words[0];
    const wLast = words[words.length - 1];

    // Default 4
    variants.push(words.join(''));              // nguyenvana
    variants.push(words.join('_'));             // nguyen_van_a
    variants.push(words.join('.'));             // nguyen.van.a
    variants.push(`${w1}${wLast}`);             // nguyena

    if (deepScan) {
      variants.push(`${w1}_${wLast}`);          // nguyen_a
      variants.push(`${w1}.${wLast}`);          // nguyen.a
      variants.push(`${w1[0]}${wLast}`);         // na
      variants.push(`${wLast}${w1}`);            // anguyen (Vietnamese style)
      variants.push(`${wLast}.${w1}`);           // a.nguyen
      // Given Name + initials of middle/first: e.g. anv
      const initials = words.slice(0, -1).map(w => w[0]).join('');
      variants.push(`${wLast}${initials}`);     // anv
    }
  }

  // Deduplicate and filter by basic username criteria (min 2, max 64, alphanumeric/dashes/dots/underscores)
  const USERNAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
  const uniqueVariants = [...new Set(variants)].filter(v => {
    return v.length >= 2 && v.length <= 64 && USERNAME_REGEX.test(v);
  });

  return uniqueVariants;
}

/**
 * Evaluates profile findings to score aggregated digital footprint confidence.
 */
export function scoreConfidence(results: any[], realName: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!results || results.length === 0) return 'LOW';

  const nameParts = realName.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (nameParts.length === 0) return 'MEDIUM';

  // Check if any profile bio contains all parts of the target name
  for (const profile of results) {
    const bio = (profile.bio || '').toLowerCase();
    if (bio) {
      const containsAllParts = nameParts.every(part => bio.includes(part));
      if (containsAllParts) {
        return 'HIGH';
      }
    }
  }

  return 'MEDIUM';
}

import { ScanSession } from '../shared/session_state';

export interface ScanIdentityOptions {
  deepScan?: boolean;
  cookies?: Record<string, string>;
  onResult?: (result: any) => void;
  onProgress?: (progress: { completed: number; total: number; percentage: number }) => void;
  session?: ScanSession;
}

/**
 * Scan a target name across high-value social platforms.
 */
export async function scanIdentity(
  realName: string,
  options: ScanIdentityOptions = {},
  signal: AbortSignal | null = null
): Promise<{ found: any[]; confidence: 'HIGH' | 'MEDIUM' | 'LOW' }> {
  const variants = generateVariants(realName, options.deepScan);
  if (variants.length === 0) {
    return { found: [], confidence: 'LOW' };
  }

  // Get high-value subset of platforms from the registry
  const allPlatforms = getAllPlatforms();
  const targetPlatforms = allPlatforms.filter(p => HIGH_VALUE_PLATFORMS.has(p.name));

  // If no high-value platforms match, fallback to tech/social categories
  const platformsToScan = targetPlatforms.length > 0 ? targetPlatforms : allPlatforms.slice(0, 15);

  let completed = 0;
  const total = platformsToScan.length;

  if (options.onProgress) {
    options.onProgress({ completed: 0, total, percentage: 0 });
  }

  // Scan in parallel across platforms, but check variants sequentially for each platform (Early Termination)
  const platformPromises = platformsToScan.map(async (platform) => {
    for (const variant of variants) {
      if (signal && signal.aborted) break;

      try {
        const result = await scanPlatform(variant, platform as any, options.cookies, signal, { session: options.session });
        if (result.status === 'FOUND') {
          const matched = { variant, ...result };
          if (options.onResult) {
            options.onResult(matched);
          }
          completed++;
          if (options.onProgress) {
            options.onProgress({
              completed,
              total,
              percentage: Math.round((completed / total) * 100)
            });
          }
          return matched;
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || signal?.aborted) {
          // Silent exit on abort
          break;
        }
        // Fail-silent on individual requests to keep scan going
      }
    }
    completed++;
    if (options.onProgress) {
      options.onProgress({
        completed,
        total,
        percentage: Math.round((completed / total) * 100)
      });
    }
    return null;
  });

  const rawResults = await Promise.all(platformPromises);
  const found = rawResults.filter(Boolean);
  const confidence = scoreConfidence(found, realName);

  return {
    found,
    confidence
  };
}
