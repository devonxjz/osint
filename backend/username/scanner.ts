// backend/username/scanner.ts

'use strict';

import { PlatformConfig } from './registry';
import { BaseEngine } from './engines/base';
import { apiEngine } from './engines/apiEngine';
import { htmlEngine } from './engines/htmlEngine';
import { browserEngine } from './engines/browserEngine';

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
}

/**
 * Polymorphic Scan Platform Router
 * Delegates the scan target query to the appropriate specialized engine.
 */
export async function scanPlatform(
  username: string,
  platform: Platform,
  cookieOverrides: Record<string, string> = {},
  signal: AbortSignal | null = null
): Promise<ScanResult> {
  let engine: BaseEngine;

  if (platform.checkType === 'api') {
    engine = apiEngine;
  } else if (platform.checkType === 'browser') {
    engine = browserEngine;
  } else {
    engine = htmlEngine; // status, text, selector
  }

  return engine.scan(username, platform, { cookieOverrides, signal });
}
