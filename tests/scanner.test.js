'use strict';

const axios = require('axios');
const { scanPlatform } = require('../dist-backend/scanner');

// Mock Axios to capture request arguments
jest.mock('axios');

describe('OSINT Scanner Evasion Request Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies custom timeout if configured in platform metadata, else defaults to 5000', async () => {
    // Mock successful 200 response
    axios.get.mockResolvedValue({
      status: 200,
      data: '<html><body>Mock Profile</body></html>'
    });

    const mockPlatform = {
      name: 'TestPlatform',
      category: 'Social',
      url: 'https://testplatform.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    // 1. Check with default timeout (none configured)
    await scanPlatform('johndoe', mockPlatform);
    expect(axios.get).toHaveBeenLastCalledWith(
      'https://testplatform.com/johndoe',
      expect.objectContaining({ timeout: 5000 })
    );

    // 2. Check with custom timeout configuration
    const mockPlatformWithTimeout = {
      ...mockPlatform,
      timeout: 15000
    };
    await scanPlatform('johndoe', mockPlatformWithTimeout);
    expect(axios.get).toHaveBeenLastCalledWith(
      'https://testplatform.com/johndoe',
      expect.objectContaining({ timeout: 15000 })
    );
  });

  it('injects realistic dynamic evasion and bot-avoidance browser headers', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: '<html><body>Mock Profile</body></html>'
    });

    const mockPlatform = {
      name: 'TestPlatform',
      category: 'Social',
      url: 'https://testplatform.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    await scanPlatform('johndoe', mockPlatform);

    // Assert that Axios was called with evasion headers
    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': expect.any(String),
          'Accept-Language': expect.any(String),
          'Sec-Fetch-Mode': expect.any(String),
          'Sec-Fetch-Dest': expect.any(String),
          'Referer': expect.any(String)
        })
      })
    );
  });

  it('captures WAF rate-limiting error signatures (429/403) gracefully as separate errors', async () => {
    // Mock Axios returning 429 Too Many Requests
    axios.get.mockResolvedValue({
      status: 429,
      data: 'Too many requests'
    });

    const mockPlatform = {
      name: 'TestPlatform',
      category: 'Social',
      url: 'https://testplatform.com/{}',
      checkType: 'status',
      checkValue: 404
    };

    const result429 = await scanPlatform('johndoe', mockPlatform);
    expect(result429.status).toBe('NOT_FOUND');
    expect(result429.error).toBe('BLOCKED_BY_WAF');

    // Mock Axios returning 403 Forbidden
    axios.get.mockResolvedValue({
      status: 403,
      data: 'Access denied'
    });

    const result403 = await scanPlatform('johndoe', mockPlatform);
    expect(result403.status).toBe('NOT_FOUND');
    expect(result403.error).toBe('BLOCKED_BY_WAF');
  });

  describe('Session Cookie Injection & Proxy Routing', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('injects session cookies resolved dynamically from .env based on envCookieKey', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: '<html><body>Mock Profile</body></html>'
      });

      process.env.MOCK_SESSION_COOKIE_KEY = 'li_at=session123456';

      const mockPlatform = {
        name: 'LinkedIn',
        category: 'Social',
        url: 'https://linkedin.com/in/{}',
        checkType: 'status',
        checkValue: 404,
        envCookieKey: 'MOCK_SESSION_COOKIE_KEY'
      };

      await scanPlatform('johndoe', mockPlatform);

      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Cookie': 'li_at=session123456'
          })
        })
      );
    });

    it('gracefully catches and returns MISSING_SESSION_CREDENTIALS if envCookieKey is not configured in .env', async () => {
      const mockPlatform = {
        name: 'LinkedIn',
        category: 'Social',
        url: 'https://linkedin.com/in/{}',
        checkType: 'status',
        checkValue: 404,
        envCookieKey: 'UNCONFIGURED_SESSION_COOKIE_KEY'
      };

      const result = await scanPlatform('johndoe', mockPlatform);

      expect(result.status).toBe('NOT_FOUND');
      expect(result.error).toBe('MISSING_SESSION_CREDENTIALS');
      expect(axios.get).not.toHaveBeenCalled();
    });

    it('applies HTTP/HTTPS proxy configuration when platform.requiresProxy is enabled', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: '<html><body>Mock Profile</body></html>'
      });

      process.env.PROXY_POOL_URL = 'http://proxyuser:proxypass@127.0.0.1:8080';

      const mockPlatform = {
        name: 'HighRiskSite',
        category: 'Social',
        url: 'https://highrisksite.com/{}',
        checkType: 'status',
        checkValue: 404,
        requiresProxy: true
      };

      await scanPlatform('johndoe', mockPlatform);

      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          proxy: expect.objectContaining({
            protocol: 'http',
            host: '127.0.0.1',
            port: 8080,
            auth: {
              username: 'proxyuser',
              password: 'proxypass'
            }
          })
        })
      );
    });

    it('applies Tor proxy configuration for platforms in the DarkWeb category', async () => {
      axios.get.mockResolvedValue({
        status: 200,
        data: '<html><body>Mock Onion Profile</body></html>'
      });

      process.env.TOR_PROXY_URL = 'socks5://127.0.0.1:9050';

      const mockPlatform = {
        name: 'Ahmia',
        category: 'DarkWeb',
        url: 'https://ahmia.fi/search/?q={}',
        checkType: 'status',
        checkValue: 404
      };

      await scanPlatform('johndoe', mockPlatform);

      expect(axios.get).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          proxy: expect.objectContaining({
            protocol: 'socks5',
            host: '127.0.0.1',
            port: 9050
          })
        })
      );
    });
  });

  describe('Task 16: Request Pipeline Hardening & Timings', () => {
    let dateSpy;

    beforeEach(() => {
      dateSpy = jest.spyOn(Date, 'now');
      axios.get.mockResolvedValue({
        status: 200,
        data: '<html><body>Mock Profile</body></html>'
      });
    });

    afterEach(() => {
      dateSpy.mockRestore();
    });

    it('measures response time and returns responseTimeMs in the scan result', async () => {
      const mockPlatform = {
        name: 'GitHub',
        category: 'Tech',
        url: 'https://github.com/{}',
        checkType: 'status',
        checkValue: 404
      };

      // Mock start time to 1000 and end time to 1250 (250ms duration)
      dateSpy.mockReturnValueOnce(1000); // start
      dateSpy.mockReturnValueOnce(1250); // end

      const result = await scanPlatform('johndoe', mockPlatform);

      expect(result.status).toBe('FOUND');
      expect(result.responseTimeMs).toBe(250);
    });

    it('accepts and propagates AbortSignal to axios options', async () => {
      const mockPlatform = {
        name: 'GitHub',
        category: 'Tech',
        url: 'https://github.com/{}',
        checkType: 'status',
        checkValue: 404
      };

      const controller = new AbortController();
      const signal = controller.signal;

      await scanPlatform('johndoe', mockPlatform, {}, signal);

      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal })
      );
    });
  });
});

