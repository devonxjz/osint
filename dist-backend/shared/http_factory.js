// backend/shared/http_factory.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpFactory = void 0;
const runtime_1 = require("./runtime");
const evasionClient_1 = require("../username/engines/evasionClient");
const proxy_client_1 = require("./proxy_client");
const playwright_client_1 = require("./playwright_client");
const session_state_1 = require("./session_state");
class HttpFactory {
    /**
     * Helper to identify if a response has been blocked by WAF.
     */
    static isWAFBlocked(res) {
        if (!res)
            return false;
        const status = res.status;
        const cfMitigated = res.headers && (res.headers['cf-mitigated'] || res.headers['Cf-Mitigated']);
        const hasWafHeaders = cfMitigated === 'challenge' ||
            (typeof res.body === 'string' && (res.body.includes('cf-challenge') ||
                res.body.includes('Just a moment...') ||
                res.body.includes('ddos') ||
                res.body.includes('security check')));
        return status === 403 || status === 429 || !!hasWafHeaders;
    }
    /**
     * Dispatches a request using adaptive session routing.
     *
     * @param url - Target URL
     * @param options - Request options
     * @param session - Isolated ScanSession state tracking object
     */
    static async fetchWithSession(url, options = {}, session) {
        const resolvedSession = session || new session_state_1.ScanSession();
        const serverless = (0, runtime_1.isServerless)();
        // 1. Serverless Mode (Vercel Production)
        if (serverless) {
            if (resolvedSession.shouldUseProxy()) {
                return proxy_client_1.proxyClient.request(url, options);
            }
            const res = await evasionClient_1.evasionClient.request(url, options);
            if (this.isWAFBlocked(res)) {
                resolvedSession.recordWAFHit();
                return proxy_client_1.proxyClient.request(url, options);
            }
            return res;
        }
        // 2. Local Mode (Local execution)
        // If blocked or if custom check type is set, local will fallback to Playwright Stealth.
        const res = await evasionClient_1.evasionClient.request(url, options);
        if (this.isWAFBlocked(res)) {
            resolvedSession.recordWAFHit();
            try {
                return await playwright_client_1.playwrightStealthClient.request(url, options);
            }
            catch (err) {
                // Fallback to original blocked response if playwright fails/throws
                return res;
            }
        }
        return res;
    }
}
exports.HttpFactory = HttpFactory;
