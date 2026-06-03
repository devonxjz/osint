// backend/shared/session_state.ts
'use strict';

/**
 * ScanSession monitors WAF hit counters and manages Adaptive Session Promotion.
 * Managed entirely in-memory per scan session.
 */
export class ScanSession {
  private wafHits: number = 0;
  private promoted: boolean = false;
  private readonly threshold: number;

  constructor(threshold?: number) {
    if (threshold !== undefined) {
      this.threshold = threshold;
    } else {
      const envVal = process.env.WAF_PROMOTION_THRESHOLD;
      const parsed = envVal ? parseInt(envVal, 10) : 2;
      this.threshold = isNaN(parsed) ? 2 : parsed;
    }
  }

  /**
   * Records a WAF hit. Promotes the session if hits meet or exceed the threshold.
   */
  recordWAFHit(): void {
    this.wafHits++;
    if (this.wafHits >= this.threshold) {
      this.promoted = true;
    }
  }

  /**
   * Returns whether standard queries should be bypassed and routed immediately via proxy.
   */
  shouldUseProxy(): boolean {
    return this.promoted;
  }

  /**
   * Returns current WAF hit count.
   */
  getWafHits(): number {
    return this.wafHits;
  }
}
