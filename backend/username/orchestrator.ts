// backend/orchestrator.ts

'use strict';

import { scanPlatform, Platform, ScanResult } from './scanner';

interface CircuitBreakerState {
  consecutiveFailures: number;
  trippedUntil: number;
}

// Global/Module-level state for circuit breakers
export const circuitBreakers: Record<string, CircuitBreakerState> = {}; // key: platformName -> { consecutiveFailures: number, trippedUntil: number }

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ScanCallbacks {
  onResult: (result: ScanResult) => void;
  onProgress: (progress: { completed: number; total: number; percentage: number }) => void;
  onError: (platformName: string, errorType: string) => void;
}

export interface OrchestrateOptions {
  maxConcurrency?: number;
  highRiskConcurrency?: number;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  cache?: any;
  signal?: AbortSignal | null;
}

export async function orchestrateScan(
  target: string,
  platforms: Platform[],
  callbacks: ScanCallbacks,
  options: OrchestrateOptions = {}
): Promise<{ foundCount: number; timeTakenMs: number }> {
  const maxConcurrency = options.maxConcurrency || 20;
  const highRiskConcurrency = options.highRiskConcurrency || 3;
  const retryAttempts = options.retryAttempts !== undefined ? options.retryAttempts : 2;
  const retryBaseDelayMs = options.retryBaseDelayMs !== undefined ? options.retryBaseDelayMs : 500;
  const cache = options.cache;
  const signal = options.signal;
  const startTime = Date.now();

  const total = platforms.length;
  let completed = 0;
  let foundCount = 0;

  // Helper to check if signal is aborted
  const isAborted = () => signal && signal.aborted;

  // 1. Check cache first
  const remainingPlatforms: Platform[] = [];
  for (const platform of platforms) {
    if (isAborted()) break;

    const cacheKey = `${target}::${platform.name}`;
    if (cache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        completed++;
        if (cached.status === 'FOUND') {
          foundCount++;
        }
        callbacks.onResult(cached);
        callbacks.onProgress({
          completed,
          total,
          percentage: parseFloat(((completed / total) * 100).toFixed(1))
        });
        continue;
      }
    }
    remainingPlatforms.push(platform);
  }

  if (remainingPlatforms.length === 0 || isAborted()) {
    return {
      foundCount,
      timeTakenMs: Date.now() - startTime
    };
  }

  // 2. Priority Scheduling: low-risk first, high-risk last
  const isHighRisk = (p: Platform) => {
    const rawP = p as any;
    return rawP.riskLevel === 'HIGH' || rawP.requiresProxy === true || rawP.category === 'DarkWeb';
  };
  
  const standardPlatforms = remainingPlatforms.filter(p => !isHighRisk(p));
  const highRiskPlatforms = remainingPlatforms.filter(p => isHighRisk(p));

  // 3. Execution Lanes
  async function runLane(platformList: Platform[], laneConcurrency: number) {
    let index = 0;

    async function worker() {
      while (index < platformList.length && !isAborted()) {
        const currentIdx = index++;
        const platform = platformList[currentIdx];

        // Check Circuit Breaker
        const cbState = circuitBreakers[platform.name];
        if (cbState && cbState.trippedUntil && Date.now() < cbState.trippedUntil) {
          completed++;
          callbacks.onProgress({
            completed,
            total,
            percentage: parseFloat(((completed / total) * 100).toFixed(1))
          });
          callbacks.onError(platform.name, 'CIRCUIT_OPEN');
          continue;
        }

        let result: ScanResult | null = null;
        let success = false;
        let attempt = 0;

        while (attempt <= retryAttempts && !success && !isAborted()) {
          try {
            result = await scanPlatform(target, platform, {}, signal);
            
            // Check for permanent vs transient failure inside resolved result
            if (result.error === 'MISSING_SESSION_CREDENTIALS' || result.status === 'FOUND' || !result.error) {
              success = true;
            } else {
              // Treated as transient platform error or WAF block
              attempt++;
              if (attempt <= retryAttempts && !isAborted()) {
                await delay(retryBaseDelayMs * Math.pow(2, attempt - 1));
              }
            }
          } catch (err: any) {
            // Check if abort error
            if (isAborted()) break;

            attempt++;
            if (attempt <= retryAttempts && !isAborted()) {
              await delay(retryBaseDelayMs * Math.pow(2, attempt - 1));
            } else {
              result = {
                platform: platform.name,
                status: 'NOT_FOUND',
                url: platform.url ? platform.url.replace('{}', encodeURIComponent(target)) : '',
                error: err.message
              };
            }
          }
        }

        if (isAborted()) break;

        completed++;

        // Handle Circuit Breaker State based on success
        const hasFailed = !success || (result && result.error && result.error !== 'MISSING_SESSION_CREDENTIALS');
        if (hasFailed) {
          if (!circuitBreakers[platform.name]) {
            circuitBreakers[platform.name] = { consecutiveFailures: 0, trippedUntil: 0 };
          }
          circuitBreakers[platform.name].consecutiveFailures++;
          if (circuitBreakers[platform.name].consecutiveFailures >= 3) {
            // Trip circuit for 60 seconds
            circuitBreakers[platform.name].trippedUntil = Date.now() + 60000;
          }
        } else {
          // Reset circuit state on success
          if (circuitBreakers[platform.name]) {
            circuitBreakers[platform.name].consecutiveFailures = 0;
            circuitBreakers[platform.name].trippedUntil = 0;
          }
        }

        if (result) {
          if (result.status === 'FOUND') {
            foundCount++;
          }
          if (cache && !hasFailed) {
            cache.set(`${target}::${platform.name}`, result);
          }
          callbacks.onResult(result);
        } else {
          callbacks.onError(platform.name, 'UNKNOWN_ERROR');
        }

        callbacks.onProgress({
          completed,
          total,
          percentage: parseFloat(((completed / total) * 100).toFixed(1))
        });
      }
    }

    const workers = [];
    const workerCount = Math.min(laneConcurrency, platformList.length);
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);
  }

  // Run both concurrency lanes concurrently
  await Promise.all([
    runLane(standardPlatforms, maxConcurrency),
    runLane(highRiskPlatforms, highRiskConcurrency)
  ]);

  return {
    foundCount,
    timeTakenMs: Date.now() - startTime
  };
}
