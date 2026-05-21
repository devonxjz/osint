'use strict';

const { validatePhone } = require('./validator');
const callerIdModule = require('./caller_id');
const peopleSearchModule = require('./people_search');
const socialSyncModule = require('./social_sync');


/**
 * Coordinates all phone intelligence scanning lanes concurrently.
 * Emits progress updates in real-time.
 *
 * @param {string} phone - Target phone number string
 * @param {object} [options] - Configuration and callback options
 * @param {function} [options.onEvent] - Real-time event publisher callback
 * @returns {Promise<object>} Consolidated telephone intelligence dossier
 */
async function orchestratePhoneScan(phone, options = {}) {
  const { onEvent = () => {} } = options;
  const startTime = Date.now();

  const dossier = {
    phone,
    validation: { valid: false },
    callerId: undefined,
    peopleSearch: undefined,
    socialSync: undefined,
    timeTakenMs: 0
  };

  // Step 1: Input Validation & Carrier Lookup (early gating)
  const validation = validatePhone(phone);
  dossier.validation = validation;
  onEvent({
    module: 'validation',
    status: validation.valid ? 'VALID' : 'INVALID',
    data: validation
  });

  if (!validation.valid) {
    dossier.timeTakenMs = Date.now() - startTime;
    return dossier;
  }

  const cleanPhone = validation.formatted;

  // Helper utility to stagger simulated latency
  const stagger = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Step 2: Parallel execution lanes with isolated error boundaries and staggered delays
  const [callerIdResult, peopleSearchResult, socialSyncResult] = await Promise.all([
    // Lane A: Reverse Caller ID Lookup (staggered delay ~400ms)
    (async () => {
      try {
        await stagger(400);
        const result = await callerIdModule.lookupCallerID(cleanPhone);
        onEvent({
          module: 'caller_id',
          status: 'FOUND',
          data: result
        });
        return result;
      } catch (err) {
        onEvent({
          module: 'caller_id',
          status: 'ERROR',
          data: { error: err.message }
        });
        return { realName: 'Not Resolved', location: 'Unknown', carrier: 'Unknown', sources: ['Error Fallback'] };
      }
    })(),

    // Lane B: Data Brokers & Google Dorks (staggered delay ~800ms)
    (async () => {
      try {
        await stagger(800);
        const result = await peopleSearchModule.searchPeopleData(cleanPhone);
        onEvent({
          module: 'people_search',
          status: 'FOUND',
          data: result
        });
        return result;
      } catch (err) {
        onEvent({
          module: 'people_search',
          status: 'ERROR',
          data: { error: err.message }
        });
        return { name: '', realAddress: '', relatives: [], business: '', dorkUrls: [] };
      }
    })(),

    // Lane C: Social Discovery & OTT Sync (staggered delay ~1200ms)
    (async () => {
      try {
        await stagger(1200);
        const result = await socialSyncModule.discoverSocialProfiles(cleanPhone);
        onEvent({
          module: 'contact_sync',
          status: 'DONE',
          data: result.ottProfiles
        });
        onEvent({
          module: 'facebook',
          status: 'FOUND',
          data: result.facebook
        });
        return result;
      } catch (err) {
        onEvent({
          module: 'contact_sync',
          status: 'ERROR',
          data: { error: err.message }
        });
        onEvent({
          module: 'facebook',
          status: 'ERROR',
          data: { error: err.message }
        });
        return { facebook: { profileUrl: '', pageName: '', candidateName: '' }, ottProfiles: [] };
      }
    })()
  ]);

  dossier.callerId = callerIdResult;
  dossier.peopleSearch = peopleSearchResult;
  dossier.socialSync = socialSyncResult;
  dossier.timeTakenMs = Date.now() - startTime;

  return dossier;
}

module.exports = { orchestratePhoneScan };

