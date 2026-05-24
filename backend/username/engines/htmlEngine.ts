// backend/username/engines/htmlEngine.ts

'use strict';

import * as cheerio from 'cheerio';
import { ProxyAgent } from 'undici';
import { BaseEngine, EngineScanOptions } from './base';
import { PlatformConfig } from '../registry';
import { ScanResult } from '../scanner';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'
];

export function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

interface PlatformMetadata {
  bio: string | null;
  avatar: string | null;
  location: string | null;
}

export function extractMetadata(html: string, platformName: string): PlatformMetadata {
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
      metadata.avatar = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
      metadata.bio = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
    }

    if (metadata.avatar && metadata.avatar.startsWith('//')) {
      metadata.avatar = 'https:' + metadata.avatar;
    }
  } catch (err) {
    // Ignore extraction errors
  }

  return metadata;
}

export class HtmlEngine implements BaseEngine {
  async scan(
    username: string,
    platform: PlatformConfig,
    options: EngineScanOptions = {}
  ): Promise<ScanResult> {
    const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
    const userAgent = getRandomUserAgent();
    const cookieOverrides = options.cookieOverrides || {};
    const signal = options.signal || null;

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

    // Timeout controller wrapper for native fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), platform.timeout || 5000);
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const headers: Record<string, string> = { 
        'User-Agent': userAgent
      };

      if (cookie) {
        headers['Cookie'] = cookie;
      }

      // Native ProxyAgent configuration via Undici
      let dispatcher: any = undefined;
      if (platform.requiresProxy && process.env.PROXY_POOL_URL) {
        dispatcher = new ProxyAgent(process.env.PROXY_POOL_URL);
      } else if (platform.category === 'DarkWeb') {
        const torProxy = process.env.TOR_PROXY_URL || 'socks5://127.0.0.1:9050';
        dispatcher = new ProxyAgent(torProxy);
      }

      const response = await fetch(targetUrl, {
        headers,
        signal: controller.signal,
        dispatcher
      } as any);
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

      const html = await response.text();

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

    } catch (error: any) {
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

export const htmlEngine = new HtmlEngine();
