// backend/username/engines/browserEngine.ts
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
exports.browserEngine = exports.BrowserEngine = void 0;
const cheerio = __importStar(require("cheerio"));
const htmlEngine_1 = require("./htmlEngine");
class BrowserEngine {
    async scan(username, platform, options = {}) {
        const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
        // Hybrid Production Fallback for Vercel Serverless environment
        if (process.env.VERCEL) {
            console.log(`[BrowserEngine] Vercel detected. Gracefully falling back to HtmlEngine for ${platform.name}`);
            return htmlEngine_1.htmlEngine.scan(username, platform, options);
        }
        const startTime = Date.now();
        const signal = options.signal || null;
        // Dynamically import Playwright only when running locally to avoid load errors
        let playwrightChromium;
        try {
            const playwright = require('playwright');
            playwrightChromium = playwright.chromium;
        }
        catch (e) {
            console.error('[BrowserEngine] Playwright is not available, falling back to HtmlEngine', e);
            return htmlEngine_1.htmlEngine.scan(username, platform, options);
        }
        let browser = null;
        try {
            // Launch headless browser with high-evasion arguments
            browser = await playwrightChromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled'
                ]
            });
            const userAgent = (0, htmlEngine_1.getRandomUserAgent)();
            const context = await browser.newContext({
                userAgent,
                locale: 'en-US',
                viewport: { width: 1280, height: 720 },
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false
            });
            // Secure Session Cookie injection if present
            const cookieOverrides = options.cookieOverrides || {};
            let cookie = undefined;
            if (platform.envCookieKey) {
                cookie = cookieOverrides[platform.envCookieKey] || process.env[platform.envCookieKey];
                if (cookie) {
                    const cookieDomain = new URL(targetUrl).hostname;
                    // Parse name=value pairs from the cookie string
                    const cookiesList = cookie.split(';').map(c => {
                        const parts = c.trim().split('=');
                        return {
                            name: parts[0],
                            value: parts.slice(1).join('='),
                            domain: cookieDomain,
                            path: '/'
                        };
                    });
                    await context.addCookies(cookiesList);
                }
            }
            const page = await context.newPage();
            // Monitor AbortSignal to close page and browser immediately on client disconnect
            if (signal) {
                if (signal.aborted) {
                    throw new Error('Scan aborted before navigation');
                }
                signal.addEventListener('abort', async () => {
                    try {
                        if (browser)
                            await browser.close();
                    }
                    catch (e) {
                        // ignore close errors
                    }
                });
            }
            // Navigate to page
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: platform.timeout || 10000
            });
            // Wait a short duration to let SPA javascript hydrate
            await page.waitForTimeout(1500);
            const html = await page.content();
            const responseTimeMs = Date.now() - startTime;
            if (typeof html === 'string') {
                const lowerHtml = html.toLowerCase();
                // 1. Check for standard error pages or global blacklist phrases
                const GLOBAL_HTML_BLACKLIST = [
                    'page not found',
                    'profile not found',
                    'user not found',
                    'cannot be found',
                    'could not be found',
                    "we can't find that page",
                    "page no longer exists",
                    'no such user',
                    'user does not exist',
                    "user doesn't exist",
                    'account does not exist',
                    "account doesn't exist",
                    'profile does not exist',
                    "profile doesn't exist",
                    'sorry, that page does not exist',
                    "page you're looking for could not be found"
                ];
                const metadata = (0, htmlEngine_1.extractMetadata)(html, platform.name);
                const bio = (metadata.bio || '').toLowerCase();
                const lowerUsername = (username || '').toLowerCase();
                for (const phrase of GLOBAL_HTML_BLACKLIST) {
                    if (lowerHtml.includes(phrase)) {
                        if (bio.includes(phrase) || lowerUsername.includes(phrase)) {
                            continue;
                        }
                        return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                    }
                }
                // 2. Platform match rules checkType
                if (platform.checkType === 'text' && html.includes(platform.checkValue)) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
                if (platform.checkType === 'selector') {
                    const $ = cheerio.load(html);
                    if ($(platform.checkValue).length === 0) {
                        return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                    }
                }
            }
            // If passed all not-found checks, target profile exists!
            const metadata = (0, htmlEngine_1.extractMetadata)(html, platform.name);
            return {
                platform: platform.name,
                status: 'FOUND',
                url: targetUrl,
                responseTimeMs,
                ...metadata
            };
        }
        catch (error) {
            const responseTimeMs = Date.now() - startTime;
            if (error.name === 'AbortError' || error.message.includes('aborted') || (signal && signal.aborted)) {
                return {
                    platform: platform.name,
                    status: 'NOT_FOUND',
                    url: targetUrl,
                    error: 'SCAN_ABORTED',
                    responseTimeMs
                };
            }
            return {
                platform: platform.name,
                status: 'NOT_FOUND',
                url: targetUrl,
                error: error.message,
                responseTimeMs
            };
        }
        finally {
            // Complete resource cleanup is mandatory
            if (browser) {
                try {
                    await browser.close();
                }
                catch (e) {
                    // ignore close errors
                }
            }
        }
    }
}
exports.BrowserEngine = BrowserEngine;
exports.browserEngine = new BrowserEngine();
