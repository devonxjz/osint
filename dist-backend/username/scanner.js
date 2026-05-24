// backend/scanner.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanPlatform = scanPlatform;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const url_1 = require("url");
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 30 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}
/**
 * Parses proxy connection strings into Axios proxy configurations
 */
function parseProxyString(proxyStr) {
    if (!proxyStr)
        return null;
    try {
        const parsed = new url_1.URL(proxyStr);
        return {
            protocol: parsed.protocol.replace(':', ''),
            host: parsed.hostname,
            port: parseInt(parsed.port, 10),
            auth: parsed.username ? {
                username: decodeURIComponent(parsed.username),
                password: decodeURIComponent(parsed.password)
            } : undefined
        };
    }
    catch (e) {
        return null;
    }
}
/**
 * Extracts basic metadata (bio, avatar, etc.) if available in HTML
 */
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
            // Generic meta tags extraction as fallback
            metadata.avatar = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
            metadata.bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
        }
        // Clean up urls
        if (metadata.avatar && metadata.avatar.startsWith('//')) {
            metadata.avatar = 'https:' + metadata.avatar;
        }
    }
    catch (err) {
        // Ignore extraction errors
    }
    return metadata;
}
/**
 * Scans a single username on a single platform
 */
async function scanPlatform(username, platform, cookieOverrides = {}, signal = null) {
    const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
    const userAgent = getRandomUserAgent();
    // 1. Resolve Session Cookies securely
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
    try {
        // 2. Build headers dynamically
        const headers = {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5,zh-CN;q=0.3',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Referer': 'https://www.google.com/'
        };
        if (cookie) {
            headers['Cookie'] = cookie;
        }
        // 3. Resolve Proxy config
        let proxy = undefined;
        if (platform.requiresProxy && process.env.PROXY_POOL_URL) {
            proxy = parseProxyString(process.env.PROXY_POOL_URL) || undefined;
        }
        else if (platform.category === 'DarkWeb') {
            const torProxy = process.env.TOR_PROXY_URL || 'socks5://127.0.0.1:9050';
            proxy = parseProxyString(torProxy) || undefined;
        }
        const response = await axios_1.default.get(targetUrl, {
            headers,
            timeout: platform.timeout || 5000,
            proxy: proxy,
            validateStatus: () => true, // Allow any status code so we can check it
            httpAgent,
            httpsAgent,
            signal: signal || undefined
        });
        const responseTimeMs = Date.now() - startTime;
        const status = response.status;
        const html = response.data;
        // Global HTML Blacklist phrase check to filter out generic 200 OK error templates
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
                // Localized and exact platform error strings from user screenshots
                'không phải cứ biến mất là mất tích',
                'trang này thì mất tích thật rồi',
                'liên kết không hoạt động hoặc trang này không còn nữa',
                'sorry, that page does not exist',
                "page you're looking for could not be found",
                'there was an error on the server',
                'the server returned this error',
                'error! there was an error on the server'
            ];
            // Contextual extraction to prevent false negatives from user-defined bios/usernames
            const metadata = extractMetadata(html, platform.name);
            const bio = (metadata.bio || '').toLowerCase();
            const lowerUsername = (username || '').toLowerCase();
            for (const phrase of GLOBAL_HTML_BLACKLIST) {
                if (lowerHtml.includes(phrase)) {
                    // Skip if the phrase is customized inside the user's bio or username
                    if (bio.includes(phrase) || lowerUsername.includes(phrase)) {
                        continue;
                    }
                    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
                }
            }
        }
        // Detect WAF rate limiting or bot-block status signatures
        if (status === 429 || status === 403) {
            return {
                platform: platform.name,
                status: 'NOT_FOUND',
                url: targetUrl,
                error: 'BLOCKED_BY_WAF',
                responseTimeMs
            };
        }
        // 1. Check HTTP status rules
        if (platform.checkType === 'status' && status === platform.checkValue) {
            return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
        }
        // Treat 404 as not found by default
        if (status === 404) {
            return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
        }
        // 2. Check text rules (false positive checking)
        if (platform.checkType === 'text' && typeof html === 'string') {
            if (html.includes(platform.checkValue)) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
        }
        // 3. Check selector rules (if element absent/present)
        if (platform.checkType === 'selector' && typeof html === 'string') {
            const $ = cheerio.load(html);
            if ($(platform.checkValue).length === 0) {
                return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
            }
        }
        // Standard check if page is actually returning error-like content
        if (status >= 400) {
            return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
        }
        // If passed all rules, user exists!
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
        const responseTimeMs = Date.now() - startTime;
        // If request timeout or network error, check if it was raw Axios block
        if (error.response && (error.response.status === 429 || error.response.status === 403)) {
            return {
                platform: platform.name,
                status: 'NOT_FOUND',
                url: targetUrl,
                error: 'BLOCKED_BY_WAF',
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
