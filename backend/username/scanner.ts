// backend/scanner.ts

'use strict';

import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import * as http from 'http';
import * as https from 'https';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 30 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 30 });

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

interface ProxyAuth {
  username?: string;
  password?: string;
}

interface AxiosProxyConfig {
  protocol: string;
  host: string;
  port: number;
  auth?: ProxyAuth;
}

/**
 * Parses proxy connection strings into Axios proxy configurations
 */
function parseProxyString(proxyStr: string): AxiosProxyConfig | null {
  if (!proxyStr) return null;
  try {
    const parsed = new URL(proxyStr);
    return {
      protocol: parsed.protocol.replace(':', ''),
      host: parsed.hostname,
      port: parseInt(parsed.port, 10),
      auth: parsed.username ? {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password)
      } : undefined
    };
  } catch (e) {
    return null;
  }
}

interface PlatformMetadata {
  bio: string | null;
  avatar: string | null;
  location: string | null;
}

/**
 * Extracts basic metadata (bio, avatar, etc.) if available in HTML
 */
function extractMetadata(html: string, platformName: string): PlatformMetadata {
  const $ = cheerio.load(html);
  const metadata: PlatformMetadata = { bio: null, avatar: null, location: null };

  try {
    if (platformName === 'GitHub') {
      metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
      metadata.bio = $('.p-note div').text().trim() || $('meta[property="og:description"]').attr('content') || null;
      metadata.location = $('span[itemprop="homeLocation"]').text().trim() || null;
    } else if (platformName === 'GitLab') {
      metadata.avatar = $('.avatar-jpg').attr('src') || null;
      metadata.bio = $('.user-profile-bio').text().trim() || null;
    } else if (platformName === 'Medium') {
      metadata.avatar = $('meta[property="og:image"]').attr('content') || null;
      metadata.bio = $('meta[name="description"]').attr('content') || null;
    } else {
      // Generic meta tags extraction as fallback
      metadata.avatar = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
      metadata.bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
    }

    // Clean up urls
    if (metadata.avatar && metadata.avatar.startsWith('//')) {
      metadata.avatar = 'https:' + metadata.avatar;
    }
  } catch (err) {
    // Ignore extraction errors
  }

  return metadata;
}

export interface Platform {
  name: string;
  url: string;
  envCookieKey?: string;
  requiresProxy?: boolean;
  category?: string;
  timeout?: number;
  checkType: 'status' | 'text' | 'selector';
  checkValue: any;
}

export interface ScanResult {
  platform: string;
  status: 'FOUND' | 'NOT_FOUND';
  url: string;
  error?: string;
  responseTimeMs?: number;
  bio?: string | null;
  avatar?: string | null;
  location?: string | null;
}

/**
 * Scans a single username on a single platform
 */
export async function scanPlatform(
  username: string,
  platform: Platform,
  cookieOverrides: Record<string, string> = {},
  signal: AbortSignal | null = null
): Promise<ScanResult> {
  const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
  const userAgent = getRandomUserAgent();

  // 1. Resolve Session Cookies securely
  let cookie: string | undefined = undefined;
  if (platform.envCookieKey) {
    if (cookieOverrides && cookieOverrides[platform.envCookieKey]) {
      cookie = cookieOverrides[platform.envCookieKey];
    } else {
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
    const headers: Record<string, string> = { 
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
    let proxy: AxiosProxyConfig | undefined = undefined;
    if (platform.requiresProxy && process.env.PROXY_POOL_URL) {
      proxy = parseProxyString(process.env.PROXY_POOL_URL) || undefined;
    } else if (platform.category === 'DarkWeb') {
      const torProxy = process.env.TOR_PROXY_URL || 'socks5://127.0.0.1:9050';
      proxy = parseProxyString(torProxy) || undefined;
    }

    const response = await axios.get(targetUrl, {
      headers,
      timeout: platform.timeout || 5000,
      proxy: proxy as any,
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

  } catch (error: any) {
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
