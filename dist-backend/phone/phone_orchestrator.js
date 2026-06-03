// backend/phone/phone_orchestrator.ts
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestratePhoneScan = orchestratePhoneScan;
const validator_1 = require("./validator");
const callerIdModule = __importStar(require("./caller_id"));
const peopleSearchModule = __importStar(require("./people_search"));
const socialSyncModule = __importStar(require("./social_sync"));
/**
 * Coordinates all phone intelligence scanning lanes concurrently.
 * Emits progress updates in real-time.
 *
 * @param phone - Target phone number string
 * @param options - Configuration and callback options
 * @returns Consolidated telephone intelligence dossier
 */
async function orchestratePhoneScan(phone, options = {}) {
    const { onEvent = () => { }, session } = options;
    const startTime = Date.now();
    const dossier = {
        phone,
        validation: { valid: false, formatted: '', countryCode: 'VN', carrier: 'Unknown' },
        callerId: undefined,
        peopleSearch: undefined,
        socialSync: undefined,
        timeTakenMs: 0
    };
    // Step 1: Input Validation & Carrier Lookup (early gating)
    const validation = (0, validator_1.validatePhone)(phone);
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
                const result = await callerIdModule.lookupCallerID(cleanPhone, { session });
                onEvent({
                    module: 'caller_id',
                    status: 'FOUND',
                    data: result
                });
                return result;
            }
            catch (err) {
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
            }
            catch (err) {
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
            }
            catch (err) {
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
