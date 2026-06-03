// backend/phone/phone_orchestrator.ts
 
'use strict';
 
import { validatePhone, PhoneValidationResult } from './validator';
import * as callerIdModule from './caller_id';
import * as peopleSearchModule from './people_search';
import * as socialSyncModule from './social_sync';
import { ScanSession } from '../shared/session_state';
 
export interface PhoneDossier {
  phone: string;
  validation: PhoneValidationResult;
  callerId?: callerIdModule.CallerIdResult;
  peopleSearch?: peopleSearchModule.PeopleSearchResult;
  socialSync?: socialSyncModule.SocialSyncResult;
  timeTakenMs: number;
}
 
export interface OrchestratePhoneScanOptions {
  onEvent?: (event: { module: string; status: string; data: any }) => void;
  session?: ScanSession;
}
 
/**
 * Coordinates all phone intelligence scanning lanes concurrently.
 * Emits progress updates in real-time.
 *
 * @param phone - Target phone number string
 * @param options - Configuration and callback options
 * @returns Consolidated telephone intelligence dossier
 */
export async function orchestratePhoneScan(phone: string, options: OrchestratePhoneScanOptions = {}): Promise<PhoneDossier> {
  const { onEvent = () => {}, session } = options;
  const startTime = Date.now();
 
  const dossier: PhoneDossier = {
    phone,
    validation: { valid: false, formatted: '', countryCode: 'VN', carrier: 'Unknown' },
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
  const stagger = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
 
  // Step 2: Parallel execution lanes with isolated error boundaries and staggered delays
  const [callerIdResult, peopleSearchResult, socialSyncResult] = await Promise.all([
    // Lane A: Reverse Caller ID Lookup (staggered delay ~400ms)
    (async (): Promise<callerIdModule.CallerIdResult> => {
      try {
        await stagger(400);
        const result = await callerIdModule.lookupCallerID(cleanPhone, { session });
        onEvent({
          module: 'caller_id',
          status: 'FOUND',
          data: result
        });
        return result;
      } catch (err: any) {
        onEvent({
          module: 'caller_id',
          status: 'ERROR',
          data: { error: err.message }
        });
        return { realName: 'Not Resolved', location: 'Unknown', carrier: 'Unknown', sources: ['Error Fallback'] };
      }
    })(),

    // Lane B: Data Brokers & Google Dorks (staggered delay ~800ms)
    (async (): Promise<peopleSearchModule.PeopleSearchResult> => {
      try {
        await stagger(800);
        const result = await peopleSearchModule.searchPeopleData(cleanPhone);
        onEvent({
          module: 'people_search',
          status: 'FOUND',
          data: result
        });
        return result;
      } catch (err: any) {
        onEvent({
          module: 'people_search',
          status: 'ERROR',
          data: { error: err.message }
        });
        return { name: '', realAddress: '', relatives: [], business: '', dorkUrls: [] };
      }
    })(),

    // Lane C: Social Discovery & OTT Sync (staggered delay ~1200ms)
    (async (): Promise<socialSyncModule.SocialSyncResult> => {
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
      } catch (err: any) {
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
