// backend/username/engines/base.ts

'use strict';

import { PlatformConfig } from '../registry';
import { ScanResult } from '../scanner';

export interface EngineScanOptions {
  cookieOverrides?: Record<string, string>;
  signal?: AbortSignal | null;
}

export interface BaseEngine {
  scan(
    username: string,
    platform: PlatformConfig,
    options?: EngineScanOptions
  ): Promise<ScanResult>;
}
