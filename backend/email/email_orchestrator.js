'use strict';

const { validateEmail } = require('./validator');
const { extractUsernames } = require('./username_extractor');
const { lookupBreaches } = require('./breach_engine');
const { lookupGravatar } = require('./gravatar');
const { resolveIdentity } = require('./identity_resolver');
const { generateEmailPermutations } = require('./permutation_engine');

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
 * @param {string} email - Target email address
 * @param {object} options
 * @param {function} options.onEvent - SSE event callback: (event: {module, status, data}) => void
 * @param {string} [options.hibpApiKey] - Optional HIBP API key
 * @returns {Promise<object>} Consolidated dossier
 */
async function orchestrateEmailScan(email, options = {}) {
  const { onEvent = () => {}, hibpApiKey = null } = options;
  const startTime = Date.now();

  const dossier = {
    email,
    validation: { syntaxValid: false },
    breaches: [],
    gravatar: { hasGravatar: false, avatarUrl: null },
    identity: { realName: null, employer: null, position: null, confidence: 'LOW', sources: [] },
    usernames: { primary: '', variants: [] },
    permutations: { workEmails: [], personalEmails: [] },
    timeTakenMs: 0,
  };

  // ─── Step 1: Validation (gate) ───
  const validation = validateEmail(email);
  dossier.validation = validation;
  onEvent({ module: 'validation', status: validation.syntaxValid ? 'VALID' : 'INVALID', data: validation });

  if (!validation.syntaxValid) {
    dossier.timeTakenMs = Date.now() - startTime;
    return dossier;
  }

  // Helper utility to stagger simulated latency
  const stagger = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ─── Step 2: Parallel pipelines with isolated error boundaries and staggered delays ───
  const [usernameResult, breachResult, gravatarResult] = await Promise.all([
    // Pipeline A: Username Extraction (~300ms)
    (async () => {
      try {
        await stagger(300);
        const result = extractUsernames(email);
        onEvent({ module: 'usernames', status: 'DONE', data: result });
        return result;
      } catch (err) {
        onEvent({ module: 'usernames', status: 'ERROR', data: { error: err.message } });
        return { primary: email.split('@')[0] || '', variants: [] };
      }
    })(),

    // Pipeline B: Breach Lookup (~600ms)
    (async () => {
      try {
        await stagger(600);
        const result = await lookupBreaches(email, { hibpApiKey });
        onEvent({ module: 'breach', status: result.breaches.length > 0 ? 'FOUND' : 'CLEAN', data: result });
        return result;
      } catch (err) {
        onEvent({ module: 'breach', status: 'ERROR', data: { error: err.message } });
        return { source: 'error', breaches: [] };
      }
    })(),

    // Pipeline C: Gravatar Lookup (~900ms)
    (async () => {
      try {
        await stagger(900);
        const result = await lookupGravatar(email);
        onEvent({ module: 'gravatar', status: result.hasGravatar ? 'FOUND' : 'NOT_FOUND', data: result });
        return result;
      } catch (err) {
        onEvent({ module: 'gravatar', status: 'ERROR', data: { error: err.message } });
        return { hash: '', hasGravatar: false, avatarUrl: null };
      }
    })(),
  ]);

  dossier.usernames = usernameResult;
  dossier.breaches = breachResult.breaches;
  dossier.gravatar = gravatarResult;

  // ─── Step 3: Identity Resolution (needs Gravatar) (~1200ms) ───
  await stagger(300); // 900ms + 300ms = 1200ms
  let identityResult;
  try {
    identityResult = await resolveIdentity(email, {
      gravatarProfile: gravatarResult,
    });
    onEvent({ module: 'identity', status: identityResult.realName ? 'RESOLVED' : 'UNRESOLVED', data: identityResult });
  } catch (err) {
    identityResult = { realName: null, employer: null, position: null, confidence: 'LOW', sources: ['Error Fallback'] };
    onEvent({ module: 'identity', status: 'ERROR', data: { error: err.message } });
  }
  dossier.identity = identityResult;

  // ─── Step 4: Permutation Engine (needs Identity + Username) (~1500ms) ───
  await stagger(300); // 1200ms + 300ms = 1500ms
  let permutations;
  try {
    const [, domain] = email.split('@');
    permutations = generateEmailPermutations({
      realName: identityResult.realName,
      domain,
      username: usernameResult.primary,
    });
    onEvent({ module: 'permutations', status: 'DONE', data: permutations });
  } catch (err) {
    permutations = { workEmails: [], personalEmails: [] };
    onEvent({ module: 'permutations', status: 'ERROR', data: { error: err.message } });
  }
  dossier.permutations = permutations;

  dossier.timeTakenMs = Date.now() - startTime;
  return dossier;
}

module.exports = { orchestrateEmailScan };
