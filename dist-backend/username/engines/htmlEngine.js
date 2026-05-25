// backend/username/engines/htmlEngine.ts
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
exports.htmlEngine = exports.HtmlEngine = void 0;
exports.getRandomUserAgent = getRandomUserAgent;
exports.extractMetadata = extractMetadata;
const cheerio = __importStar(require("cheerio"));
const undici_1 = require("undici");
const evasionClient_1 = require("./evasionClient");
const evasionClient = new evasionClient_1.EvasionClient();
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
function extractMetadata(html, platformName) {
    const $ = cheerio.load(html);
    const metadata = { bio: null, avatar: null, location: null };
    try {
        if (platformName === 'GitHub') {
            metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
            metadata.bio = $('.p-note div').text().trim() || $('meta[property="og:description"]').attr('content') || null;
            metadata.location = $('span[itemprop="homeLocation"]').text().trim() || null;
        }
        else if (platformName === 'GitLab') {
            metadata.avatar = $('.avatar-jpg').attr('src') || null;
            metadata.bio = $('.user-profile-bio').text().trim() || null;
        }
        else if (platformName === 'Medium') {
            metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
            metadata.bio = $('meta[name="description"]').attr('content') || null;
        }
        else {
            metadata.avatar = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
            metadata.bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
        }
        if (metadata.avatar && metadata.avatar.startsWith('//')) {
            metadata.avatar = 'https:' + metadata.avatar;
        }
    }
    catch (err) {
        // Ignore extraction errors
    }
    return metadata;
}
class HtmlEngine {
    async scan(username, platform, options = {}) {
        const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
        const userAgent = getRandomUserAgent();
        const cookieOverrides = options.cookieOverrides || {};
        const signal = options.signal || null;
        let cookie = undefined;
        if (platform.envCookieKey) {
            if (cookieOverrides && cookieOverrides[platform.envCookieKey]) {
                cookie = cookieOverrides[platform.envCookieKey];
            }
            else {
                cookie = process.env[platform.envCookieKey];
            }
            if (!cookie) {
                return {
                    platform: platform.name,
                    status: 'NOT_FOUND',
                    url: targetUrl,
                    error: 'MISSING_SESSION_CREDENTIALS'
                };
            }
        }
        const startTime = Date.now();
        // Timeout controller wrapper for native fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), platform.timeout || 5000);
        if (signal) {
            signal.addEventListener('abort', () => controller.abort());
        }
        try {
            const headers = {
                'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'upgrade-insecure-requests': '1',
                'User-Agent': userAgent,
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-fetch-site': 'none',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-user': '?1',
                'sec-fetch-dest': 'document',
                'accept-encoding': 'gzip, deflate, br',
                'accept-language': 'en-US,en;q=0.9',
            };
            if (cookie) {
                headers['Cookie'] = cookie;
            }
            // Native ProxyAgent configuration via Undici
            let dispatcher = undefined;
            const proxyUrl = options.proxyUrl || (platform.requiresProxy ? process.env.PROXY_POOL_URL : undefined);
            if (proxyUrl) {
                dispatcher = new undici_1.ProxyAgent(proxyUrl);
            }
            else if (platform.category === 'DarkWeb') {
                const torProxy = process.env.TOR_PROXY_URL || 'socks5://127.0.0.1:9050';
                dispatcher = new undici_1.ProxyAgent(torProxy);
            }
            const response = await evasionClient.request(targetUrl, {
                headers,
                signal: controller.signal,
                dispatcher
            });
            clearTimeout(timeoutId);
            const responseTimeMs = Date.now() - startTime;
            const status = response.status;
            if (status === 429 || status === 403) {
                return {
                    platform: platform.name,
                    status: 'NOT_FOUND',
                    url: targetUrl,
                    error: 'BLOCKED_BY_WAF',
                    responseTimeMs
                };
            }
            // Soft 404 Redirect Detection (e.g. MeWe redirects non-existent users to mewe.com/404 with 200 OK status)
            if (response.url && (response.url.endsWith('/404') ||
                response.url.includes('/404') ||
                response.url.includes('/error/404') ||
                response.url.endsWith('/error'))) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
            const html = response.body;
            if (typeof html === 'string') {
                const lowerHtml = html.toLowerCase();
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
                    'we have shut down stack overflow jobs',
                    'story has been shut down',
                    'story has been sunset',
                    'không phải cứ biến mất là mất tích',
                    'trang này thì mất tích thật rồi',
                    'liên kết không hoạt động hoặc trang này không còn nữa',
                    'sorry, that page does not exist',
                    "page you're looking for could not be found",
                    'there was an error on the server',
                    'the server returned this error',
                    'error! there was an error on the server'
                ];
                const metadata = extractMetadata(html, platform.name);
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
            }
            if (platform.checkType === 'status' && status === platform.checkValue) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
            if (status === 404) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
            if (platform.checkType === 'text' && typeof html === 'string') {
                if (html.includes(platform.checkValue)) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
            }
            if (platform.checkType === 'selector' && typeof html === 'string') {
                const $ = cheerio.load(html);
                if ($(platform.checkValue).length === 0) {
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
            }
            if (status >= 400) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
            const metadata = typeof html === 'string' ? extractMetadata(html, platform.name) : { bio: null, avatar: null, location: null };
            return {
                platform: platform.name,
                status: 'FOUND',
                url: targetUrl,
                responseTimeMs,
                ...metadata
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            const responseTimeMs = Date.now() - startTime;
            if (error.name === 'AbortError') {
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
    }
}
exports.HtmlEngine = HtmlEngine;
exports.htmlEngine = new HtmlEngine();
