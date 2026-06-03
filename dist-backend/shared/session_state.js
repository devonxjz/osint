// backend/shared/session_state.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanSession = void 0;
/**
 * ScanSession monitors WAF hit counters and manages Adaptive Session Promotion.
 * Managed entirely in-memory per scan session.
 */
class ScanSession {
    wafHits = 0;
    promoted = false;
    threshold;
    constructor(threshold) {
        if (threshold !== undefined) {
            this.threshold = threshold;
        }
        else {
            const envVal = process.env.WAF_PROMOTION_THRESHOLD;
            const parsed = envVal ? parseInt(envVal, 10) : 2;
            this.threshold = isNaN(parsed) ? 2 : parsed;
        }
    }
    /**
     * Records a WAF hit. Promotes the session if hits meet or exceed the threshold.
     */
    recordWAFHit() {
        this.wafHits++;
        if (this.wafHits >= this.threshold) {
            this.promoted = true;
        }
    }
    /**
     * Returns whether standard queries should be bypassed and routed immediately via proxy.
     */
    shouldUseProxy() {
        return this.promoted;
    }
    /**
     * Returns current WAF hit count.
     */
    getWafHits() {
        return this.wafHits;
    }
}
exports.ScanSession = ScanSession;
