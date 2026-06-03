// backend/email/email_orchestrator.ts

'use strict';

import { validateEmail, VerificationResult } from './validator';
import { extractUsernames, ExtractedUsernames } from './username_extractor';
import { lookupBreaches, BreachRecord } from './breach_engine';
import { lookupGravatar, GravatarResult } from './gravatar';
import { resolveIdentity, IdentityResult } from './identity_resolver';
import { generateEmailPermutations, PermutationOutput } from './permutation_engine';
import { ScanSession } from '../shared/session_state';

export interface EmailDossier {
  email: string;
  validation: VerificationResult;
  breaches: BreachRecord[];
  gravatar: GravatarResult;
  identity: IdentityResult;
  usernames: ExtractedUsernames;
  permutations: PermutationOutput;
  timeTakenMs: number;
}

export interface OrchestrateEmailScanOptions {
  onEvent?: (event: { module: string; status: string; data: any }) => void;
  hibpApiKey?: string | null;
  session?: ScanSession;
}

/**
 * Email Scan Orchestrator — PRD Section 3 "Luồng Dữ Liệu Tổng Thể"
 *
 * Coordinates all email OSINT pipelines in parallel where possible,
 * then feeds results downstream for identity resolution and permutation.
 *
 * Pipeline flow:
 *   1. Validation (sync, gate)
 *   2. Parallel: [Username Extraction, Breach Lookup, Gravatar Lookup]
 *   3. Sequential: Identity Resolution (needs Gravatar result)
 *   4. Sequential: Permutation Engine (needs Identity result)
 *
 * @param email - Target email address
 * @param options
 * @returns Consolidated dossier
 */
export async function orchestrateEmailScan(email: string, options: OrchestrateEmailScanOptions = {}): Promise<EmailDossier> {
  const { onEvent = () => {}, hibpApiKey = null, session } = options;
  const startTime = Date.now();

  const dossier: EmailDossier = {
    email,
    validation: { email, syntaxValid: false, domainExists: null, isDisposable: false, suggestedPermutations: [] },
    breaches: [],
    gravatar: { hash: '', hasGravatar: false, avatarUrl: null, displayName: null, aboutMe: null, location: null, profileUrls: [] },
    identity: { realName: null, employer: null, position: null, confidence: 'LOW', sources: [] },
    usernames: { primary: '', variants: [] },
    permutations: { workEmails: [], personalEmails: [] },
    timeTakenMs: 0,
  };

  // ─── Step 1: Validation (gate) ───
  const validation = validateEmail(email) as VerificationResult;
  dossier.validation = validation;
  onEvent({ module: 'validation', status: validation.syntaxValid ? 'VALID' : 'INVALID', data: validation });

  if (!validation.syntaxValid) {
    dossier.timeTakenMs = Date.now() - startTime;
    return dossier;
  }

  // Helper utility to stagger simulated latency
  const stagger = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ─── Step 2: Parallel pipelines with isolated error boundaries and staggered delays ───
  const [usernameResult, breachResult, gravatarResult] = await Promise.all([
    // Pipeline A: Username Extraction (~300ms)
    (async (): Promise<ExtractedUsernames> => {
      try {
        await stagger(300);
        const result = extractUsernames(email);
        onEvent({ module: 'usernames', status: 'DONE', data: result });
        return result;
      } catch (err: any) {
        onEvent({ module: 'usernames', status: 'ERROR', data: { error: err.message } });
        return { primary: email.split('@')[0] || '', variants: [] };
      }
    })(),

    // Pipeline B: Breach Lookup (~600ms)
    (async () => {
      try {
        await stagger(600);
        const result = await lookupBreaches(email, { hibpApiKey, session });
        onEvent({ module: 'breach', status: result.breaches.length > 0 ? 'FOUND' : 'CLEAN', data: result });
        return result;
      } catch (err: any) {
        onEvent({ module: 'breach', status: 'ERROR', data: { error: err.message } });
        return { source: 'error', breaches: [] as BreachRecord[] };
      }
    })(),

    // Pipeline C: Gravatar Lookup (~900ms)
    (async (): Promise<GravatarResult> => {
      try {
        await stagger(900);
        const result = await lookupGravatar(email, session);
        onEvent({ module: 'gravatar', status: result.hasGravatar ? 'FOUND' : 'NOT_FOUND', data: result });
        return result;
      } catch (err: any) {
        onEvent({ module: 'gravatar', status: 'ERROR', data: { error: err.message } });
        return { hash: '', hasGravatar: false, avatarUrl: null, displayName: null, aboutMe: null, location: null, profileUrls: [] };
      }
    })(),
  ]);

  dossier.usernames = usernameResult;
  dossier.breaches = breachResult.breaches;
  dossier.gravatar = gravatarResult;

  // ─── Step 3: Identity Resolution (needs Gravatar) (~1200ms) ───
  await stagger(300); // 900ms + 300ms = 1200ms
  let identityResult: IdentityResult;
  try {
    identityResult = await resolveIdentity(email, {
      gravatarProfile: gravatarResult,
    });
    onEvent({ module: 'identity', status: identityResult.realName ? 'RESOLVED' : 'UNRESOLVED', data: identityResult });
  } catch (err: any) {
    identityResult = { realName: null, employer: null, position: null, confidence: 'LOW', sources: ['Error Fallback'] };
    onEvent({ module: 'identity', status: 'ERROR', data: { error: err.message } });
  }
  dossier.identity = identityResult;

  // ─── Step 4: Permutation Engine (needs Identity + Username) (~1500ms) ───
  await stagger(300); // 1200ms + 300ms = 1500ms
  let permutations: PermutationOutput;
  try {
    const [, domain] = email.split('@');
    permutations = generateEmailPermutations({
      realName: identityResult.realName || undefined,
      domain,
      username: usernameResult.primary,
    });
    onEvent({ module: 'permutations', status: 'DONE', data: permutations });
  } catch (err: any) {
    permutations = { workEmails: [], personalEmails: [] };
    onEvent({ module: 'permutations', status: 'ERROR', data: { error: err.message } });
  }
  dossier.permutations = permutations;

  dossier.timeTakenMs = Date.now() - startTime;
  return dossier;
}
