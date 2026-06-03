// tests/vercel_fallback.test.js
'use strict';

const { BrowserEngine } = require('../dist-backend/username/engines/browserEngine');
const { ImpersonateEngine } = require('../dist-backend/username/engines/impersonateEngine');
const { htmlEngine } = require('../dist-backend/username/engines/htmlEngine');

jest.mock('../dist-backend/username/engines/htmlEngine', () => {
  return {
    htmlEngine: {
      scan: jest.fn().mockResolvedValue({
        platform: 'MockPlatform',
        status: 'FOUND',
        url: 'https://mock.com/john_doe'
      })
    }
  };
});

describe('Vercel Serverless Evasion Fallback', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('downgrades BrowserEngine to htmlEngine on Vercel with LOW confidence and fallback method', async () => {
    process.env.VERCEL = '1';

    const browserEngine = new BrowserEngine();
    const mockPlatform = {
      name: 'MockPlatform',
      category: 'Social',
      url: 'https://mock.com/{}',
      checkType: 'status',
      checkValue: 200
    };

    const result = await browserEngine.scan('john_doe', mockPlatform, {});

    expect(htmlEngine.scan).toHaveBeenCalledWith('john_doe', mockPlatform, {});
    expect(result).toEqual(
      expect.objectContaining({
        platform: 'MockPlatform',
        status: 'FOUND',
        url: 'https://mock.com/john_doe',
        confidence: 'LOW',
        method: 'fallback'
      })
    );
  });

  it('downgrades ImpersonateEngine to htmlEngine on Vercel with LOW confidence and fallback method', async () => {
    process.env.VERCEL = '1';

    const impersonateEngine = new ImpersonateEngine();
    const mockPlatform = {
      name: 'MockPlatform',
      category: 'Social',
      url: 'https://mock.com/{}',
      checkType: 'status',
      checkValue: 200
    };

    const result = await impersonateEngine.scan('john_doe', mockPlatform, {});

    expect(htmlEngine.scan).toHaveBeenCalledWith('john_doe', mockPlatform, {});
    expect(result).toEqual(
      expect.objectContaining({
        platform: 'MockPlatform',
        status: 'FOUND',
        url: 'https://mock.com/john_doe',
        confidence: 'LOW',
        method: 'fallback'
      })
    );
  });
});
