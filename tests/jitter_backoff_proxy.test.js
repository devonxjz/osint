// tests/jitter_backoff_proxy.test.js
'use strict';

const { orchestrateScan } = require('../dist-backend/username/orchestrator');
const { scanPlatform } = require('../dist-backend/username/scanner');

jest.mock('../dist-backend/username/scanner', () => {
  return {
    scanPlatform: jest.fn()
  };
});

describe('Jitter Backoff & Residential Proxy Fallback Option', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('performs per-platform proxy retry on WAF block, and triggers session-wide proxy when threshold (>=3) is reached', async () => {
    process.env.PROXY_POOL_URL = 'http://residential.proxy:8080';

    const mockPlatform1 = {
      name: 'BlockedPlatform1',
      category: 'Social',
      url: 'https://p1.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    const mockPlatform2 = {
      name: 'BlockedPlatform2',
      category: 'Social',
      url: 'https://p2.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    const mockPlatform3 = {
      name: 'BlockedPlatform3',
      category: 'Social',
      url: 'https://p3.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    const mockPlatform4 = {
      name: 'SubsequentPlatform',
      category: 'Social',
      url: 'https://p4.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    scanPlatform.mockImplementation(async (target, platform, cookies, signal, options) => {
      if (platform.name.startsWith('BlockedPlatform')) {
        // Return block only if scanned without a proxy
        if (!options || !options.proxyUrl) {
          return {
            platform: platform.name,
            status: 'NOT_FOUND',
            url: 'https://blocked.com/' + target,
            error: 'BLOCKED_BY_WAF'
          };
        }
      }
      return {
        platform: platform.name,
        status: 'FOUND',
        url: platform.url.replace('{}', target)
      };
    });

    const mockCallbacks = {
      onResult: jest.fn(),
      onProgress: jest.fn(),
      onError: jest.fn()
    };

    await orchestrateScan(
      'john_doe',
      [mockPlatform1, mockPlatform2, mockPlatform3, mockPlatform4],
      mockCallbacks,
      {
        retryAttempts: 0,
        retryBaseDelayMs: 1,
        htmlConcurrency: 1
      }
    );

    // Call 1: Scanned BlockedPlatform1 without proxy
    expect(scanPlatform).toHaveBeenNthCalledWith(
      1,
      'john_doe',
      mockPlatform1,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: undefined })
    );

    // Call 2: BlockedPlatform1 is instantly retried with proxy
    expect(scanPlatform).toHaveBeenNthCalledWith(
      2,
      'john_doe',
      mockPlatform1,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: 'http://residential.proxy:8080' })
    );

    // Call 3: Scanned BlockedPlatform2 without proxy
    expect(scanPlatform).toHaveBeenNthCalledWith(
      3,
      'john_doe',
      mockPlatform2,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: undefined })
    );

    // Call 4: BlockedPlatform2 is instantly retried with proxy
    expect(scanPlatform).toHaveBeenNthCalledWith(
      4,
      'john_doe',
      mockPlatform2,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: 'http://residential.proxy:8080' })
    );

    // Call 5: BlockedPlatform3 is scanned (this is the 3rd block, reaching threshold)
    expect(scanPlatform).toHaveBeenNthCalledWith(
      5,
      'john_doe',
      mockPlatform3,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: undefined })
    );

    // Call 6: BlockedPlatform3 is instantly retried with proxy
    expect(scanPlatform).toHaveBeenNthCalledWith(
      6,
      'john_doe',
      mockPlatform3,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: 'http://residential.proxy:8080' })
    );

    // Call 7: Scanned SubsequentPlatform - this MUST now use sessionProxyOverride from the start!
    expect(scanPlatform).toHaveBeenNthCalledWith(
      7,
      'john_doe',
      mockPlatform4,
      expect.any(Object),
      undefined,
      expect.objectContaining({ proxyUrl: 'http://residential.proxy:8080' })
    );
  });

  it('triggers Jitter Backoff and retries requests with exponential delay + random jitter', async () => {
    const mockPlatform = {
      name: 'RateLimitedPlatform',
      category: 'Social',
      url: 'https://ratelimit.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    // Return an error on the first scan, succeed on the second scan
    let callCount = 0;
    scanPlatform.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          platform: 'RateLimitedPlatform',
          status: 'NOT_FOUND',
          url: 'https://ratelimit.com/john_doe',
          error: 'TRANSIENT_ERROR'
        };
      }
      return {
        platform: 'RateLimitedPlatform',
        status: 'FOUND',
        url: 'https://ratelimit.com/john_doe'
      };
    });

    const mockCallbacks = {
      onResult: jest.fn(),
      onProgress: jest.fn(),
      onError: jest.fn()
    };

    const startTime = Date.now();
    await orchestrateScan(
      'john_doe',
      [mockPlatform],
      mockCallbacks,
      {
        retryAttempts: 1,
        retryBaseDelayMs: 20 // Short base delay for testing
      }
    );

    const elapsed = Date.now() - startTime;
    // Expected delay = retryBaseDelayMs * 2^1 + random(0, 100) = 40 + [0-99] ms.
    // So the total time elapsed should be at least 40ms.
    expect(elapsed).toBeGreaterThanOrEqual(40);
    expect(scanPlatform).toHaveBeenCalledTimes(2);
  });
});
