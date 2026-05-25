// backend/username/scanner.ts

'use strict';

import { PlatformConfig } from './registry';
import { BaseEngine } from './engines/base';
import { apiEngine } from './engines/apiEngine';
import { htmlEngine } from './engines/htmlEngine';
import { browserEngine } from './engines/browserEngine';
import { impersonateEngine } from './engines/impersonateEngine';

export type Platform = PlatformConfig;

export interface ScanResult {
  platform: string;
  status: 'FOUND' | 'NOT_FOUND';
  url: string;
  error?: string;
  responseTimeMs?: number;
  bio?: string | null;
  avatar?: string | null;
  location?: string | null;
  confidence?: 'HIGH' | 'LOW';
  method?: string;
  fallbackReason?: 'binary_missing' | 'vercel_env';
}

/**
 * Polymorphic Scan Platform Router
 * Delegates the scan target query to the appropriate specialized engine.
 */
export async function scanPlatform(
  username: string,
  platform: Platform,
  cookieOverrides: Record<string, string> = {},
  signal: AbortSignal | null = null,
  options: any = {}
): Promise<ScanResult> {
  let engine: BaseEngine;

  if (platform.checkType === 'api') {
    engine = apiEngine;
  } else if (platform.checkType === 'browser') {
    engine = browserEngine;
  } else if (platform.checkType === 'impersonate') {
    engine = impersonateEngine;
  } else {
    engine = htmlEngine; // status, text, selector
  }

  return engine.scan(username, platform, { cookieOverrides, signal, ...options });
}
