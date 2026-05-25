// backend/username/engines/impersonateEngine.ts
'use strict';

import { exec } from 'child_process';
import { promisify } from 'util';
import { BaseEngine, EngineScanOptions } from './base';
import { PlatformConfig } from '../registry';
import { ScanResult } from '../scanner';
import { htmlEngine } from './htmlEngine';

const execAsync = promisify(exec);

export class ImpersonateEngine implements BaseEngine {
  async scan(
    username: string,
    platform: PlatformConfig,
    options: EngineScanOptions = {}
  ): Promise<ScanResult> {
    const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
    
    // Fall back to HtmlEngine in Vercel or if explicitly required
    if (process.env.VERCEL) {
      console.log(`[ImpersonateEngine] Vercel detected. Gracefully falling back to HtmlEngine for ${platform.name}`);
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
    const timeout = platform.timeout || 10000;

    // Detect cookie override or environment cookie
    const cookieOverrides = options.cookieOverrides || {};
    let cookie: string | undefined = undefined;
    if (platform.envCookieKey) {
      cookie = cookieOverrides[platform.envCookieKey] || process.env[platform.envCookieKey];
    }

    try {
      // Determine the curl-impersonate binary to use. We prefer curl_chrome120 or curl_chrome116.
      // On Windows, the binary might be curl-impersonate-chrome.exe or similar, or just not installed.
      // We will first try to invoke curl_chrome120. If it fails due to command not found, we fallback to undici.
      const bin = 'curl_chrome120';
      const cookieHeader = cookie ? `-H "Cookie: ${cookie.replace(/"/g, '\\"')}"` : '';
      
      const cmd = `${bin} -L -s -m ${Math.ceil(timeout / 1000)} ${cookieHeader} "${targetUrl}"`;

      // Timeout wrapper with abort support
      const { stdout } = await execAsync(cmd, {
        timeout,
        killSignal: 'SIGTERM'
      });

      const responseTimeMs = Date.now() - startTime;
      const html = stdout;

      if (typeof html === 'string') {
        const lowerHtml = html.toLowerCase();
        
        // Match logic checks
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
          "profile doesn't exist"
        ];

        for (const phrase of GLOBAL_HTML_BLACKLIST) {
          if (lowerHtml.includes(phrase)) {
            return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
          }
        }

        if (platform.checkType === 'text' && html.includes(platform.checkValue)) {
          return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl, responseTimeMs };
        }
      }

      return {
        platform: platform.name,
        status: 'FOUND',
        url: targetUrl,
        responseTimeMs
      };
    } catch (err: any) {
      // If command not found, or any execution issue, fallback gracefully to undici HtmlEngine!
      if (err.message && (err.message.includes('not found') || err.message.includes('is not recognized'))) {
        console.log(`[ImpersonateEngine] curl-impersonate not installed. Falling back to HtmlEngine for ${platform.name}`);
        const result = await htmlEngine.scan(username, platform, options);
        return {
          ...result,
          confidence: 'LOW',
          method: 'fallback',
          fallbackReason: 'binary_missing'
        };
      }

      const responseTimeMs = Date.now() - startTime;
      return {
        platform: platform.name,
        status: 'NOT_FOUND',
        url: targetUrl,
        error: err.message || 'SUBPROCESS_EXECUTION_FAILED',
        responseTimeMs
      };
    }
  }
}

export const impersonateEngine = new ImpersonateEngine();
