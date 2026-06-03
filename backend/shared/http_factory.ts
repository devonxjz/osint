// backend/shared/http_factory.ts
'use strict';

import { isServerless } from './runtime';
import { evasionClient, EvasionResponse, EvasionRequestOptions } from '../username/engines/evasionClient';
import { proxyClient } from './proxy_client';
import { playwrightStealthClient } from './playwright_client';
import { ScanSession } from './session_state';

export class HttpFactory {
  /**
   * Helper to identify if a response has been blocked by WAF.
   */
  static isWAFBlocked(res: EvasionResponse): boolean {
    if (!res) return false;
    const status = res.status;
    const cfMitigated = res.headers && (res.headers['cf-mitigated'] || res.headers['Cf-Mitigated']);
    
    const hasWafHeaders = cfMitigated === 'challenge' ||
      (typeof res.body === 'string' && (
        res.body.includes('cf-challenge') ||
        res.body.includes('Just a moment...') ||
        res.body.includes('ddos') ||
        res.body.includes('security check')
      ));

    return status === 403 || status === 429 || !!hasWafHeaders;
  }

  /**
   * Dispatches a request using adaptive session routing.
   *
   * @param url - Target URL
   * @param options - Request options
   * @param session - Isolated ScanSession state tracking object
   */
  static async fetchWithSession(
    url: string,
    options: EvasionRequestOptions = {},
    session?: ScanSession
  ): Promise<EvasionResponse> {
    const resolvedSession = session || new ScanSession();
    const serverless = isServerless();

    // 1. Serverless Mode (Vercel Production)
    if (serverless) {
      if (resolvedSession.shouldUseProxy()) {
        return proxyClient.request(url, options);
      }

      const res = await evasionClient.request(url, options);

      if (this.isWAFBlocked(res)) {
        resolvedSession.recordWAFHit();
        return proxyClient.request(url, options);
      }

      return res;
    }

    // 2. Local Mode (Local execution)
    // If blocked or if custom check type is set, local will fallback to Playwright Stealth.
    const res = await evasionClient.request(url, options);
    if (this.isWAFBlocked(res)) {
      resolvedSession.recordWAFHit();
      try {
        return await playwrightStealthClient.request(url, options);
      } catch (err) {
        // Fallback to original blocked response if playwright fails/throws
        return res;
      }
    }
    return res;
  }
}
