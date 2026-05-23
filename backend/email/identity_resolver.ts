// backend/email/identity_resolver.ts

'use strict';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface IdentityResult {
  realName: string | null;
  employer: string | null;
  position: string | null;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface HunterData {
  firstName?: string;
  lastName?: string;
  position?: string;
  company?: string;
  score?: number;
}

export interface ResolveIdentityOptions {
  gravatarProfile?: any;
  hunterData?: HunterData;
  skipHunter?: boolean;
  skipDork?: boolean;
}

/**
 * Identity Resolution Engine — PRD Module 5
 *
 * Waterfall strategy:
 *   1. Hunter.io (if data provided or API key available)
 *   2. Gravatar profile displayName
 *   3. Email pattern inference (firstname.lastname)
 *   4. Google Dork search (optional, for production)
 *
 * Each step checks if a confident result is found; if not, continues.
 */

/**
 * Resolves a real-world identity from an email address.
 *
 * @param email
 * @param options
 * @returns IdentityResult
 */
export async function resolveIdentity(email: string, options: ResolveIdentityOptions = {}): Promise<IdentityResult> {
  const result: IdentityResult = {
    realName: null,
    employer: null,
    position: null,
    confidence: 'LOW',
    sources: [],
  };

  const normalized = email.trim().toLowerCase();

  // ─── Step 1: Hunter.io ───
  if (!options.skipHunter) {
    const hunterResult = resolveFromHunter(options.hunterData);
    if (hunterResult) {
      result.realName = hunterResult.realName;
      result.employer = hunterResult.employer;
      result.position = hunterResult.position;
      result.confidence = hunterResult.confidence;
      result.sources.push('hunter');

      // If Hunter gives high confidence, return early
      if (result.confidence === 'HIGH') {
        return result;
      }
    }
  }

  // ─── Step 2: Gravatar profile ───
  const gravatar = options.gravatarProfile;
  if (gravatar && gravatar.hasGravatar && gravatar.displayName) {
    if (!result.realName) {
      result.realName = gravatar.displayName;
      result.confidence = upgradeConfidence(result.confidence, 'MEDIUM');
    }
    result.sources.push('gravatar');
  }

  // ─── Step 3: Email pattern inference ───
  const patternName = inferNameFromEmail(normalized);
  if (patternName && !result.realName) {
    result.realName = patternName;
    result.confidence = upgradeConfidence(result.confidence, 'LOW');
    result.sources.push('email_pattern');
  }

  // ─── Step 4: Google Dork (optional, not in lab mode) ───
  // Skipped by default or when skipDork is true
  // Production implementation would use cheerio to parse search results

  return result;
}

/**
 * Extracts identity from Hunter.io data object.
 */
function resolveFromHunter(hunterData?: HunterData): { realName: string | null; employer: string | null; position: string | null; confidence: ConfidenceLevel } | null {
  if (!hunterData) return null;

  const { firstName, lastName, position, company, score } = hunterData;
  if (!firstName && !lastName) return null;

  const realName = [firstName, lastName].filter(Boolean).join(' ');
  const confidence: ConfidenceLevel = score && score > 70 ? 'HIGH' : 'MEDIUM';

  return {
    realName: realName || null,
    employer: company || null,
    position: position || null,
    confidence,
  };
}

/**
 * Infers a candidate name from firstname.lastname email pattern.
 * e.g., "john.doe@company.com" → "John Doe"
 */
export function inferNameFromEmail(email: string): string | null {
  const localPart = email.split('@')[0];
  if (!localPart) return null;

  // Match patterns like: john.doe, john_doe, john-doe
  const separatorMatch = localPart.match(/^([a-z]+)[._-]([a-z]+)$/i);
  if (separatorMatch) {
    const first = capitalize(separatorMatch[1]);
    const last = capitalize(separatorMatch[2]);
    return `${first} ${last}`;
  }

  return null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function upgradeConfidence(current: ConfidenceLevel, proposed: ConfidenceLevel): ConfidenceLevel {
  const rank: Record<ConfidenceLevel, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  return rank[proposed] > rank[current] ? proposed : current;
}
