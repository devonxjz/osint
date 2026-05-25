// tests/orchestrator.test.js

'use strict';

const { orchestrateScan } = require('../dist-backend/username');
const { scanPlatform } = require('../dist-backend/username/scanner');
const { ResultCache } = require('../dist-backend/shared');

// Mock scanPlatform
jest.mock('../dist-backend/username/scanner');

describe('ScanOrchestrator - Behavior 1: Basic Scans (Tracer Bullet)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should execute scan for all platforms, emit callbacks, and return summary', async () => {
    scanPlatform.mockImplementation(async (username, platform) => {
      return {
        platform: platform.name,
        status: platform.name === 'GitHub' ? 'FOUND' : 'NOT_FOUND',
        url: `https://${platform.name.toLowerCase()}.com/${username}`,
        responseTimeMs: 50
      };
    });

    const platforms = [
      { name: 'GitHub', category: 'Tech', url: 'https://github.com/{}' },
      { name: 'GitLab', category: 'Tech', url: 'https://gitlab.com/{}' }
    ];

    const results = [];
    const progress = [];
    const errors = [];

    const callbacks = {
      onResult: (res) => results.push(res),
      onProgress: (p) => progress.push(p),
      onError: (plat, err) => errors.push({ plat, err })
    };

    const summary = await orchestrateScan('testuser', platforms, callbacks, { maxConcurrency: 5 });

    expect(scanPlatform).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(progress).toHaveLength(2);
    expect(progress[progress.length - 1]).toEqual({
      completed: 2,
      total: 2,
      percentage: 100
    });
    expect(summary.foundCount).toBe(1);
    expect(summary.timeTakenMs).toBeGreaterThanOrEqual(0);
  });
});

describe('ScanOrchestrator - Behavior 2: Cache Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return cached hits immediately and populate cache on misses', async () => {
    const cache = new ResultCache();
    const cachedResult = {
      platform: 'GitHub',
      status: 'FOUND',
      url: 'https://github.com/testuser',
      responseTimeMs: 0
    };
    cache.set('testuser::GitHub', cachedResult);

    scanPlatform.mockImplementation(async (username, platform) => {
      return {
        platform: platform.name,
        status: 'NOT_FOUND',
        url: `https://${platform.name.toLowerCase()}.com/${username}`,
        responseTimeMs: 80
      };
    });

    const platforms = [
      { name: 'GitHub', category: 'Tech', url: 'https://github.com/{}' },
      { name: 'GitLab', category: 'Tech', url: 'https://gitlab.com/{}' }
    ];

    const results = [];
    const callbacks = {
      onResult: (res) => results.push(res),
      onProgress: () => {},
      onError: () => {}
    };

    await orchestrateScan('testuser', platforms, callbacks, { cache });

    expect(scanPlatform).toHaveBeenCalledTimes(1);
    expect(scanPlatform).toHaveBeenCalledWith('testuser', expect.objectContaining({ name: 'GitLab' }), expect.any(Object), undefined, expect.any(Object));

    expect(results).toHaveLength(2);
    const gitHubRes = results.find(r => r.platform === 'GitHub');
    const gitLabRes = results.find(r => r.platform === 'GitLab');

    expect(gitHubRes).toEqual(cachedResult);
    expect(gitLabRes.status).toBe('NOT_FOUND');

    const cachedGitLab = cache.get('testuser::GitLab');
    expect(cachedGitLab).toBeDefined();
    expect(cachedGitLab.status).toBe('NOT_FOUND');
  });
});

describe('ScanOrchestrator - Behavior 3: Concurrency Limits & Priority Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should prioritize low-risk platforms and enforce standard/high-risk concurrency lanes', async () => {
    let activeStandard = 0;
    let maxActiveStandard = 0;
    let activeHighRisk = 0;
    let maxActiveHighRisk = 0;
    const executionOrder = [];

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    scanPlatform.mockImplementation(async (username, platform) => {
      executionOrder.push(platform.name);
      const isHigh = platform.riskLevel === 'HIGH' || platform.requiresProxy;
      
      if (isHigh) {
        activeHighRisk++;
        maxActiveHighRisk = Math.max(maxActiveHighRisk, activeHighRisk);
      } else {
        activeStandard++;
        maxActiveStandard = Math.max(maxActiveStandard, activeStandard);
      }

      await delay(20);

      if (isHigh) {
        activeHighRisk--;
      } else {
        activeStandard--;
      }

      return { platform: platform.name, status: 'NOT_FOUND', url: 'https://site.com' };
    });

    const platforms = [
      { name: 'High1', riskLevel: 'HIGH' },
      { name: 'Std1', category: 'Tech' },
      { name: 'Std2', category: 'Tech' },
      { name: 'High2', requiresProxy: true },
      { name: 'Std3', category: 'Tech' }
    ];

    await orchestrateScan('testuser', platforms, {
      onResult: () => {},
      onProgress: () => {},
      onError: () => {}
    }, {
      maxConcurrency: 2,
      highRiskConcurrency: 1
    });

    // 1. Verify priority scheduling: standard (low risk) processed first before high risk
    // So the first two standard platforms executed should be Std1 and Std2
    expect(executionOrder.slice(0, 2)).toContain('Std1');
    expect(executionOrder.slice(0, 2)).toContain('Std2');


    // 2. Verify standard lane concurrency <= 2
    expect(maxActiveStandard).toBeLessThanOrEqual(2);

    // 3. Verify high risk lane concurrency <= 1
    expect(maxActiveHighRisk).toBeLessThanOrEqual(1);
  });
});

describe('ScanOrchestrator - Behavior 4: Retry with Exponential Backoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should retry transient network errors with base delay and succeed if retry succeeds', async () => {
    let callCount = 0;
    scanPlatform.mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        throw new Error('ETIMEDOUT');
      }
      return { platform: 'GitHub', status: 'FOUND', url: 'https://github.com/test' };
    });

    const results = [];
    const errors = [];
    await orchestrateScan('testuser', [{ name: 'GitHub' }], {
      onResult: (res) => results.push(res),
      onProgress: () => {},
      onError: (p, err) => errors.push({ p, err })
    }, {
      retryAttempts: 2,
      retryBaseDelayMs: 1
    });

    expect(callCount).toBe(2); // 1 initial + 1 retry
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('FOUND');
    expect(errors).toHaveLength(0);
  });

  test('should not retry permanent credentials/configuration missing errors', async () => {
    let callCount = 0;
    scanPlatform.mockImplementation(async () => {
      callCount++;
      return { platform: 'LinkedIn', status: 'NOT_FOUND', error: 'MISSING_SESSION_CREDENTIALS' };
    });

    const results = [];
    const errors = [];
    await orchestrateScan('testuser', [{ name: 'LinkedIn' }], {
      onResult: (res) => results.push(res),
      onProgress: () => {},
      onError: (p, err) => errors.push({ p, err })
    }, {
      retryAttempts: 2,
      retryBaseDelayMs: 1
    });

    expect(callCount).toBe(1); // 1 call only, no retry
    expect(results).toHaveLength(1);
    expect(results[0].error).toBe('MISSING_SESSION_CREDENTIALS');
  });
});

describe('ScanOrchestrator - Behavior 5: Circuit Breaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should trip circuit breaker after 3 consecutive failures and bypass subsequent scans', async () => {
    // Platform fails every time
    scanPlatform.mockRejectedValue(new Error('503 Service Unavailable'));

    const errors = [];
    const callbacks = {
      onResult: () => {},
      onProgress: () => {},
      onError: (p, err) => errors.push({ p, err })
    };

    // Scan 1
    await orchestrateScan('user1', [{ name: 'BrokenSite' }], callbacks, { retryAttempts: 0 });
    // Scan 2
    await orchestrateScan('user2', [{ name: 'BrokenSite' }], callbacks, { retryAttempts: 0 });
    // Scan 3
    await orchestrateScan('user3', [{ name: 'BrokenSite' }], callbacks, { retryAttempts: 0 });

    expect(scanPlatform).toHaveBeenCalledTimes(3);

    // Reset mocks count to see if the 4th scan bypasses scanPlatform call
    scanPlatform.mockClear();

    // Scan 4
    await orchestrateScan('user4', [{ name: 'BrokenSite' }], callbacks, { retryAttempts: 0 });

    expect(scanPlatform).not.toHaveBeenCalled(); // Bypassed!
    expect(errors[errors.length - 1]).toEqual({
      p: 'BrokenSite',
      err: 'CIRCUIT_OPEN'
    });
  });
});

describe('ScanOrchestrator - Behavior 6: AbortSignal / Cancellation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should abort scan immediately, term pending requests, and return partial summary', async () => {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    scanPlatform.mockImplementation(async (username, platform, cookies, signal) => {
      await delay(50);
      if (signal && signal.aborted) {
        throw new Error('signal aborted');
      }
      return { platform: platform.name, status: 'FOUND', url: 'https://github.com' };
    });

    const controller = new AbortController();

    const results = [];
    const progress = [];
    
    // Fire the scan, abort it after 10ms
    setTimeout(() => {
      controller.abort();
    }, 10);

    const platforms = [
      { name: 'GitHub' },
      { name: 'GitLab' }
    ];

    const summary = await orchestrateScan('testuser', platforms, {
      onResult: (res) => results.push(res),
      onProgress: (p) => progress.push(p),
      onError: () => {}
    }, {
      maxConcurrency: 1, // process sequentially so abort can stop GitLab
      signal: controller.signal
    });

    expect(results).toHaveLength(0); // cancelled before first finished
    expect(summary.foundCount).toBe(0);
  });
});
