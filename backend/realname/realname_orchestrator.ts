import { scanPlatform, getAllPlatforms } from '../username';
import { distance } from 'fastest-levenshtein';

export class ExecutionBudget {
  private start = Date.now();
  constructor(private limitMs: number) {}
  
  isExhausted(reserveMs: number): boolean {
    return (Date.now() - this.start) + reserveMs >= this.limitMs;
  }
  
  elapsed(): number {
    return Date.now() - this.start;
  }
}

export function fuzzyMatch(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - distance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

export function generateExactVariants(realName: string): string[] {
  return generateVariants(realName, false);
}

export function generatePartialVariants(realName: string): string[] {
  const all = generateVariants(realName, true);
  const exact = new Set(generateVariants(realName, false));
  return all.filter(v => !exact.has(v));
}

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
      
      // Partial + positional variants from spec
      variants.push(w1);              // john
      variants.push(w2);              // doe
      variants.push(`${w1[0]}_${w2}`); // j_doe
      variants.push(`${w1}${w2[0]}`);  // johnd
      variants.push(`${w2}_${w1[0]}`); // doe_j
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
      
      // Add individual words
      words.forEach(w => variants.push(w));
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
 * Normalizes an avatar URL by removing query strings and trailing slashes.
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().toLowerCase().replace(/\/$/, '');
  } catch (e) {
    return url.split('?')[0].split('#')[0].toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Verifies a single profile match and assigns a confidence score and rating.
 */
export function verifyProfileMatch(profile: any, targetName: string, hasAvatarMatch: boolean = false): any {
  let score = 0;
  const nameTokens = targetName.toLowerCase().split(/\s+/).filter(Boolean);
  
  // 1. Display Name match (Levenshtein similarity)
  const displayName = profile.displayName || '';
  if (displayName && fuzzyMatch(displayName, targetName) >= 0.8) {
    score += 40;
  }
  
  // 2. Bio contains name tokens
  const bio = (profile.bio || '').toLowerCase();
  const bioHits = nameTokens.filter(t => bio.includes(t));
  score += bioHits.length * 15;
  
  // 3. Username/variant contains name tokens
  const username = (profile.variant || profile.username || '').toLowerCase();
  const usernameHits = nameTokens.filter(t => username.includes(t));
  score += usernameHits.length * 10;
  
  // 4. Avatar Match Boost
  if (hasAvatarMatch) {
    score += 35;
  }
  
  const confidence = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
  
  return {
    ...profile,
    score,
    confidence,
    verified: score >= 40
  };
}

/**
 * Evaluates profile findings to score aggregated digital footprint confidence.
 */
export function scoreConfidence(results: any[], realName: string): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!results || results.length === 0) return 'LOW';

  const avatarCounts: Record<string, number> = {};
  results.forEach(p => {
    const norm = normalizeAvatarUrl(p.avatar);
    if (norm) {
      const isDefault = norm.includes('default') || norm.includes('placeholder') || (norm.includes('avatar') && (norm.includes('github') || norm.includes('reddit') || norm.includes('gravatar.com/avatar/ad516503a11cd5ca435acc9bb6523536')));
      if (!isDefault) {
        avatarCounts[norm] = (avatarCounts[norm] || 0) + 1;
      }
    }
  });

  let maxScore = 0;
  for (const profile of results) {
    const normAvatar = normalizeAvatarUrl(profile.avatar);
    const hasAvatarMatch = !!(normAvatar && avatarCounts[normAvatar] > 1);
    const scored = verifyProfileMatch(profile, realName, hasAvatarMatch);
    if (scored.score > maxScore) {
      maxScore = scored.score;
    }
  }

  if (maxScore >= 70) return 'HIGH';
  if (maxScore >= 40) return 'MEDIUM';
  return 'LOW';
}

import { ScanSession } from '../shared/session_state';

export interface ScanIdentityOptions {
  deepScan?: boolean;
  cookies?: Record<string, string>;
  onResult?: (result: any) => void;
  onProgress?: (progress: { completed: number; total: number; percentage: number }) => void;
  onVerified?: (verifiedResults: any[]) => void;
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
  const budget = new ExecutionBudget(9500); // 9.5s hard ceiling

  const exactVariants = generateExactVariants(realName);
  if (exactVariants.length === 0) {
    return { found: [], confidence: 'LOW' };
  }

  // Get high-value subset of platforms from the registry
  const allPlatforms = getAllPlatforms();
  const targetPlatforms = allPlatforms.filter(p => HIGH_VALUE_PLATFORMS.has(p.name));

  // If no high-value platforms match, fallback to tech/social categories
  const platformsToScan = targetPlatforms.length > 0 ? targetPlatforms : allPlatforms.slice(0, 15);

  const total = platformsToScan.length;
  let completed = 0;

  if (options.onProgress) {
    options.onProgress({ completed: 0, total, percentage: 0 });
  }

  const allFound: any[] = [];

  const getVerifiedProfiles = (allFoundSoFar: any[]) => {
    const avatarCounts: Record<string, number> = {};
    allFoundSoFar.forEach(p => {
      const norm = normalizeAvatarUrl(p.avatar);
      if (norm) {
        const isDefault = norm.includes('default') || norm.includes('placeholder') || (norm.includes('avatar') && (norm.includes('github') || norm.includes('reddit') || norm.includes('gravatar.com/avatar/ad516503a11cd5ca435acc9bb6523536')));
        if (!isDefault) {
          avatarCounts[norm] = (avatarCounts[norm] || 0) + 1;
        }
      }
    });

    return allFoundSoFar.map(profile => {
      const normAvatar = normalizeAvatarUrl(profile.avatar);
      const hasAvatarMatch = !!(normAvatar && avatarCounts[normAvatar] > 1);
      return verifyProfileMatch(profile, realName, hasAvatarMatch);
    });
  };

  // Phase 1 & 2: Exact Match & Verification (Chunk size 5)
  for (let i = 0; i < platformsToScan.length; i += 5) {
    if (signal && signal.aborted) break;
    if (budget.isExhausted(1500)) break; // Reserve 1.5s buffer

    const chunk = platformsToScan.slice(i, i + 5);
    const chunkPromises = chunk.map(async (platform) => {
      for (const variant of exactVariants) {
        if (signal && signal.aborted) break;
        try {
          const result = await scanPlatform(variant, platform as any, options.cookies, signal, { session: options.session });
          if (result.status === 'FOUND') {
            const matched = { variant, ...result };
            if (options.onResult) {
              options.onResult(matched);
            }
            return matched;
          }
        } catch (err) {
          // Fail-silent on individual requests to keep scan going
        }
      }
      return null;
    });

    const chunkResults = (await Promise.all(chunkPromises)).filter(Boolean);
    chunkResults.forEach(r => allFound.push(r));

    completed += chunk.length;
    if (options.onProgress) {
      options.onProgress({
        completed,
        total,
        percentage: Math.round((completed / total) * 100)
      });
    }

    // Emit verified results for all found profiles so far (Inline per chunk)
    if (allFound.length > 0 && options.onVerified) {
      options.onVerified(getVerifiedProfiles(allFound));
    }

    if (i + 5 < platformsToScan.length && !budget.isExhausted(500)) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between chunks
    }
  }

  // Phase 3: Partial variants ONLY if deepScan=true and budget allows
  if (options.deepScan && !budget.isExhausted(3000)) {
    const partialVariants = generatePartialVariants(realName);
    if (partialVariants.length > 0) {
      // For partial scan, use smaller chunk size of 3 and 50ms delay
      for (let i = 0; i < platformsToScan.length; i += 3) {
        if (signal && signal.aborted) break;
        if (budget.isExhausted(1000)) break;

        const chunk = platformsToScan.slice(i, i + 3);
        const chunkPromises = chunk.map(async (platform) => {
          // Skip platforms where we already found an exact match
          const alreadyFound = allFound.some(f => f.platform === platform.name);
          if (alreadyFound) return null;

          for (const variant of partialVariants) {
            if (signal && signal.aborted) break;
            try {
              const result = await scanPlatform(variant, platform as any, options.cookies, signal, { session: options.session });
              if (result.status === 'FOUND') {
                const matched = { variant, ...result };
                if (options.onResult) {
                  options.onResult(matched);
                }
                return matched;
              }
            } catch (err) {
              // Fail-silent
            }
          }
          return null;
        });

        const chunkResults = (await Promise.all(chunkPromises)).filter(Boolean);
        chunkResults.forEach(r => allFound.push(r));

        if (allFound.length > 0 && options.onVerified) {
          options.onVerified(getVerifiedProfiles(allFound));
        }

        if (i + 3 < platformsToScan.length && !budget.isExhausted(500)) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  }

  const finalVerified = getVerifiedProfiles(allFound);
  const confidence = scoreConfidence(finalVerified, realName);

  return {
    found: finalVerified,
    confidence
  };
}
