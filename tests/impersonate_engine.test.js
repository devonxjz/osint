// tests/impersonate_engine.test.js
'use strict';

const { impersonateEngine } = require('../dist-backend/username/engines/impersonateEngine');
const child_process = require('child_process');

jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('ImpersonateEngine - curl-impersonate Subprocess Pipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.VERCEL;
  });

  it('triggers curl-impersonate command correctly and parses success status', async () => {
    // Mock successful curl-impersonate command output
    child_process.exec.mockImplementation((cmd, options, callback) => {
      if (typeof options === 'function') {
        options(null, { stdout: '<html><body>Impersonated Profile Page Content</body></html>', stderr: '' });
      } else {
        callback(null, { stdout: '<html><body>Impersonated Profile Page Content</body></html>', stderr: '' });
      }
    });

    const mockPlatform = {
      name: 'HighSecurityTarget',
      category: 'Social',
      url: 'https://highsec.com/{}',
      checkType: 'impersonate',
      checkValue: 'user not found',
      timeout: 5000
    };

    const result = await impersonateEngine.scan('johndoe', mockPlatform);

    expect(child_process.exec).toHaveBeenCalledWith(
      expect.stringContaining('curl_chrome120'),
      expect.objectContaining({ timeout: 5000 }),
      expect.any(Function)
    );

    expect(result.status).toBe('FOUND');
    expect(result.platform).toBe('HighSecurityTarget');
    expect(result.url).toBe('https://highsec.com/johndoe');
  });

  it('correctly flags NOT_FOUND when the curl-impersonate response includes the checkValue text', async () => {
    child_process.exec.mockImplementation((cmd, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      cb(null, { stdout: '<html><body>Error: user not found!</body></html>', stderr: '' });
    });

    const mockPlatform = {
      name: 'HighSecurityTarget2',
      category: 'Social',
      url: 'https://highsec.com/{}',
      checkType: 'impersonate',
      checkValue: 'user not found',
      timeout: 5000
    };

    const result = await impersonateEngine.scan('johndoe2', mockPlatform);

    expect(result.status).toBe('NOT_FOUND');
    expect(result.platform).toBe('HighSecurityTarget2');
  });

  it('gracefully falls back to HtmlEngine when curl-impersonate binary is not installed', async () => {
    // Mock binary command not found error
    child_process.exec.mockImplementation((cmd, options, callback) => {
      const cb = typeof options === 'function' ? options : callback;
      cb(new Error('curl_chrome120: command not found'), { stdout: '', stderr: '' });
    });

    // Mock global.fetch for the fallback HTML scan
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      text: async () => '<html><body>Fallback profile content</body></html>'
    });

    const mockPlatform = {
      name: 'FallbackSecurityTarget',
      category: 'Social',
      url: 'https://highsec.com/{}',
      checkType: 'impersonate',
      checkValue: 'user not found',
      timeout: 5000
    };

    const result = await impersonateEngine.scan('johndoe3', mockPlatform);

    expect(result.status).toBe('FOUND');
    expect(result.platform).toBe('FallbackSecurityTarget');
  });
});
