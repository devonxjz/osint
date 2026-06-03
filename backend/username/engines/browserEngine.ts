// backend/username/engines/browserEngine.ts

'use strict';

import * as cheerio from 'cheerio';
import { BaseEngine, EngineScanOptions } from './base';
import { PlatformConfig } from '../registry';
import { ScanResult } from '../scanner';
import { htmlEngine, getRandomUserAgent, extractMetadata, PlatformMetadata } from './htmlEngine';
import { isSoft404 } from '../../shared/blacklist';

export class BrowserEngine implements BaseEngine {
  async scan(
    username: string,
    platform: PlatformConfig,
    options: EngineScanOptions = {}
  ): Promise<ScanResult> {
    const targetUrl = platform.url.replace('{}', encodeURIComponent(username));

    // Hybrid Production Fallback for Vercel Serverless environment
    if (process.env.VERCEL) {
      console.log(`[BrowserEngine] Vercel detected. Gracefully falling back to HtmlEngine for ${platform.name}`);
      const result = await htmlEngine.scan(username, platform, options);
      return {
        ...result,
        confidence: 'LOW',
        method: 'fallback',
        fallbackReason: 'vercel_env'
      };
    }

    const startTime = Date.now();
    const signal = options.signal || null;

    let browser: any = null;
    let context: any = options.sharedContext || null;
    let page: any = null;

    try {
      if (!context) {
        // Dynamically import Playwright only when running locally to avoid load errors
        let playwrightChromium;
        try {
          const playwright = require('playwright');
          playwrightChromium = playwright.chromium;
        } catch (e) {
          console.error('[BrowserEngine] Playwright is not available, falling back to HtmlEngine', e);
          const result = await htmlEngine.scan(username, platform, options);
          return {
            ...result,
            confidence: 'LOW',
            method: 'fallback',
            fallbackReason: 'binary_missing'
          };
        }

        // Launch headless browser with high-evasion arguments
        browser = await playwrightChromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled'
          ]
        });

        const userAgent = getRandomUserAgent();
        context = await browser.newContext({
          userAgent,
          locale: 'en-US',
          viewport: { width: 1280, height: 720 },
          deviceScaleFactor: 1,
          isMobile: false,
          hasTouch: false
        });

        // Inject standard stealth properties inside context before scan starts (navigator.webdriver = false, WebGL, Canvas)
        const sessionSeed = Math.floor(Math.random() * 256);
        await context.addInitScript((seed: number) => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          // WebGL spoofing
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(parameter: number) {
            if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
            if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640'; // UNMASKED_RENDERER_WEBGL
            return getParameter.apply(this, [parameter]);
          };
          // Canvas math noise spoofing
          const getImageData = CanvasRenderingContext2D.prototype.getImageData;
          CanvasRenderingContext2D.prototype.getImageData = function(x: number, y: number, w: number, h: number) {
            const imageData = getImageData.apply(this, [x, y, w, h]);
            for (let i = 0; i < imageData.data.length; i += 4) {
              const offset = (seed + i + Math.floor(Math.random() * 3)) % 3;
              imageData.data[i] = (imageData.data[i] + offset) % 256;
            }
            return imageData;
          };
        }, sessionSeed);
      }

      // Secure Session Cookie injection if present
      const cookieOverrides = options.cookieOverrides || {};
      let cookie: string | undefined = undefined;
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

      page = await context.newPage();

      // Monitor AbortSignal to close page and browser immediately on client disconnect
      if (signal) {
        if (signal.aborted) {
          throw new Error('Scan aborted before navigation');
        }
        signal.addEventListener('abort', async () => {
          try {
            if (page && !page.isClosed()) await page.close();
            if (browser) await browser.close();
          } catch (e) {
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

      let parsedMetadata: PlatformMetadata = { bio: null, displayName: null, avatar: null, location: null };

      if (typeof html === 'string') {
        parsedMetadata = extractMetadata(html, platform.name);
        if (isSoft404(html, username, parsedMetadata.bio)) {
          return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
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
      return {
        platform: platform.name,
        status: 'FOUND',
        url: targetUrl,
        responseTimeMs,
        ...parsedMetadata
      };

    } catch (error: any) {
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
    } finally {
      // Complete resource cleanup is mandatory
      if (page && !page.isClosed()) {
        try {
          await page.close();
        } catch (e) {
          // ignore
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          // ignore close errors
        }
      }
    }
  }
}

export const browserEngine = new BrowserEngine();
