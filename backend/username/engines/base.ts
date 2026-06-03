// backend/username/engines/base.ts

'use strict';

import { PlatformConfig } from '../registry';
import { ScanResult } from '../scanner';

export interface EngineScanOptions {
  cookieOverrides?: Record<string, string>;
  signal?: AbortSignal | null;
  sharedContext?: any;
  proxyUrl?: string;
}

export interface BaseEngine {
  scan(
    username: string,
    platform: PlatformConfig,
    options?: EngineScanOptions
  ): Promise<ScanResult>;
}
