// tests/registry_health.test.js

'use strict';

const cheerio = require('cheerio');
const { EvasionClient } = require('../dist-backend/username/engines/evasionClient');

// Mock EvasionClient to delegate to global.fetch for backward compatibility
const mockRequest = jest.fn().mockImplementation(async (url, options) => {
  const mockRes = await global.fetch(url, options);
  return {
    status: mockRes.status,
    body: typeof mockRes.text === 'function' ? await mockRes.text() : mockRes.body,
    headers: mockRes.headers || {},
    url
  };
});
EvasionClient.prototype.request = mockRequest;

// Keep global.fetch as a Jest spy so all existing mock assertions pass seamlessly
global.fetch = jest.fn();

const { getAllPlatforms } = require('../dist-backend/username');
const { scanPlatform } = require('../dist-backend/username/scanner');

describe('Registry Matcher Rule Diagnostics & Dry-Run Health checks (Axios-Free Fetch Engine)', () => {
  const allPlatforms = getAllPlatforms();
  const originalVercel = process.env.VERCEL;

  beforeAll(() => {
    // Elegant hack to force browserEngine to gracefully fallback to mocked HtmlEngine/Axios
    process.env.VERCEL = 'true';
  });

  afterAll(() => {
    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies match logic correctly identifies NOT_FOUND profiles for every platform rule', async () => {
    for (const platform of allPlatforms) {
      jest.clearAllMocks();

      if (platform.envCookieKey && !process.env[platform.envCookieKey]) {
        process.env[platform.envCookieKey] = 'mock_cookie';
      }

      // 1. Simulate NOT_FOUND page response depending on the checkType
      if (platform.checkType === 'status') {
        global.fetch.mockResolvedValue({
          status: platform.checkValue,
          text: async () => '<html><body>General Page Content</body></html>',
          json: async () => ({})
        });
      } else if (platform.checkType === 'text') {
        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => `<html><body>Profile Page: ${platform.checkValue}</body></html>`,
          json: async () => ({})
        });
      } else if (platform.checkType === 'selector') {
        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => '<html><body><div>No elements matching selector</div></body></html>',
          json: async () => ({})
        });
      } else if (platform.checkType === 'api') {
        if (platform.name === 'GitHub' || platform.name === 'Chess.com' || platform.name === 'NPM') {
          global.fetch.mockResolvedValue({
            status: 404,
            text: async () => '{}',
            json: async () => ({})
          });
        } else if (platform.name === 'Reddit') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ error: 404, message: 'Not Found' }),
            json: async () => ({ error: 404, message: 'Not Found' })
          });
        } else if (platform.name === 'HackerNews') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => 'null',
            json: async () => null
          });
        } else {
          global.fetch.mockResolvedValue({
            status: 404,
            text: async () => '{}',
            json: async () => ({})
          });
        }
      } else if (platform.checkType === 'browser') {
        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => `<html><body>Mock Profile Not Found Content: ${platform.checkValue}</body></html>`,
          json: async () => ({})
        });
      }

      const result = await scanPlatform('dummyuser', platform);
      expect(result.status).toBe('NOT_FOUND');
      
      if (platform.envCookieKey) {
        delete process.env[platform.envCookieKey];
      }
    }
  });

  it('verifies match logic correctly identifies FOUND profiles for every platform rule', async () => {
    for (const platform of allPlatforms) {
      jest.clearAllMocks();

      if (platform.envCookieKey && !process.env[platform.envCookieKey]) {
        process.env[platform.envCookieKey] = 'mock_cookie';
      }

      // 1. Simulate FOUND page response
      if (platform.checkType === 'status') {
        const successStatus = platform.checkValue === 200 ? 404 : 200;
        global.fetch.mockResolvedValue({
          status: successStatus,
          text: async () => '<html><body>Valid active profile content!</body></html>',
          json: async () => ({})
        });
      } else if (platform.checkType === 'text') {
        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => '<html><body>Welcome to activeuser profile page! All fine.</body></html>',
          json: async () => ({})
        });
      } else if (platform.checkType === 'selector') {
        let htmlContent = '<html><body>';
        if (platform.checkValue.includes('[')) {
          const tag = platform.checkValue.split('[')[0];
          const attrParts = platform.checkValue.split('[')[1].replace(']', '').split('=');
          const attrName = attrParts[0];
          const attrVal = attrParts[1].replace(/"/g, '');
          htmlContent += `<${tag} ${attrName}="${attrVal}">Found Element</${tag}>`;
        } else if (platform.checkValue.includes('.')) {
          const parts = platform.checkValue.split('.');
          const tag = parts[0] || 'div';
          const className = parts[1];
          htmlContent += `<${tag} class="${className}">Found Element</${tag}>`;
        } else if (platform.checkValue.startsWith('#')) {
          htmlContent += `<div id="${platform.checkValue.replace('#', '')}">Found Element</div>`;
        } else {
          htmlContent += `<${platform.checkValue}>Found Element</${platform.checkValue}>`;
        }
        htmlContent += '</body></html>';

        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => htmlContent,
          json: async () => ({})
        });
      } else if (platform.checkType === 'api') {
        if (platform.name === 'GitHub') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ login: 'activeuser', bio: 'Expert Developer' }),
            json: async () => ({ login: 'activeuser', bio: 'Expert Developer' })
          });
        } else if (platform.name === 'Reddit') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ kind: 't2', data: { name: 'activeuser', icon_img: 'avatar.png' } }),
            json: async () => ({ kind: 't2', data: { name: 'activeuser', icon_img: 'avatar.png' } })
          });
        } else if (platform.name === 'Chess.com') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ username: 'activeuser', avatar: 'avatar.png' }),
            json: async () => ({ username: 'activeuser', avatar: 'avatar.png' })
          });
        } else if (platform.name === 'HackerNews') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ id: 'activeuser', about: 'Active HN' }),
            json: async () => ({ id: 'activeuser', about: 'Active HN' })
          });
        } else if (platform.name === 'NPM') {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ name: 'activeuser', fullname: 'Active NPM' }),
            json: async () => ({ name: 'activeuser', fullname: 'Active NPM' })
          });
        } else {
          global.fetch.mockResolvedValue({
            status: 200,
            text: async () => JSON.stringify({ status: 'ok' }),
            json: async () => ({ status: 'ok' })
          });
        }
      } else if (platform.checkType === 'browser') {
        let htmlContent = '<html><body>';
        if (typeof platform.checkValue === 'string') {
          const isSelector = platform.checkValue.includes('[') || 
                             platform.checkValue.startsWith('.') || 
                             platform.checkValue.startsWith('#') || 
                             platform.checkValue.startsWith('code.');
          if (isSelector) {
            if (platform.checkValue.includes('[')) {
              const tag = platform.checkValue.split('[')[0];
              const attrParts = platform.checkValue.split('[')[1].replace(']', '').split('=');
              const attrName = attrParts[0];
              const attrVal = attrParts[1].replace(/"/g, '');
              htmlContent += `<${tag} ${attrName}="${attrVal}">Found Element</${tag}>`;
            } else if (platform.checkValue.includes('.')) {
              const parts = platform.checkValue.split('.');
              const tag = parts[0] || 'div';
              const className = parts[1];
              htmlContent += `<${tag} class="${className}">Found Element</${tag}>`;
            } else if (platform.checkValue.startsWith('#')) {
              htmlContent += `<div id="${platform.checkValue.replace('#', '')}">Found Element</div>`;
            }
          } else {
            htmlContent += '<div>Active User Profile Page</div>';
          }
        } else {
          htmlContent += '<div>Active User Profile Page</div>';
        }
        htmlContent += '</body></html>';

        global.fetch.mockResolvedValue({
          status: 200,
          text: async () => htmlContent,
          json: async () => ({})
        });
      }

      const result = await scanPlatform('activeuser', platform);
      try {
        expect(result.status).toBe('FOUND');
      } catch (err) {
        console.error(`Failing platform FOUND verification check: ${platform.name} (${platform.checkType} with rule: ${platform.checkValue}). Received result:`, result);
        throw err;
      }

      if (platform.envCookieKey) {
        delete process.env[platform.envCookieKey];
      }
    }
  });
});
