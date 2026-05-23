'use strict';

const cheerio = require('cheerio');
const { getAllPlatforms } = require('../dist-backend/registry');
const { scanPlatform } = require('../dist-backend/scanner');

// Mock Axios natively to test our registry matching rule logic
const axios = require('axios');
jest.mock('axios');

describe('Registry Matcher Rule Diagnostics & Dry-Run Health checks', () => {
  const allPlatforms = getAllPlatforms();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies match logic correctly identifies NOT_FOUND profiles for every platform rule', async () => {
    for (const platform of allPlatforms) {
      // Clean up previous mock setups
      jest.clearAllMocks();

      // Skip platforms that are out of scan scope or require active login credential variables that aren't set in dry run
      if (platform.envCookieKey && !process.env[platform.envCookieKey]) {
        // Safe mock injection so we can test matching logic
        process.env[platform.envCookieKey] = 'mock_cookie';
      }

      const targetUrl = platform.url.replace('{}', 'dummyuser');

      // 1. Simulate NOT_FOUND page response depending on the checkType
      if (platform.checkType === 'status') {
        axios.get.mockResolvedValue({
          status: platform.checkValue,
          data: '<html><body>General Page Content</body></html>'
        });
      } else if (platform.checkType === 'text') {
        axios.get.mockResolvedValue({
          status: 200,
          data: `<html><body>Profile Page: ${platform.checkValue}</body></html>`
        });
      } else if (platform.checkType === 'selector') {
        // If it looks for element, make it absent
        axios.get.mockResolvedValue({
          status: 200,
          data: '<html><body><div>No elements matching selector</div></body></html>'
        });
      }

      const result = await scanPlatform('dummyuser', platform);
      expect(result.status).toBe('NOT_FOUND');
      
      // Clean up mock env changes
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

      const targetUrl = platform.url.replace('{}', 'activeuser');

      // 1. Simulate FOUND page response
      if (platform.checkType === 'status') {
        // Status code must NOT match the not found value (e.g. return 200 instead of 404)
        const successStatus = platform.checkValue === 200 ? 404 : 200;
        axios.get.mockResolvedValue({
          status: successStatus,
          data: '<html><body>Valid active profile content!</body></html>'
        });
      } else if (platform.checkType === 'text') {
        // Text must NOT contain the not found text
        axios.get.mockResolvedValue({
          status: 200,
          data: '<html><body>Welcome to activeuser profile page! All fine.</body></html>'
        });
      } else if (platform.checkType === 'selector') {
        let htmlContent = '<html><body>';
        if (platform.checkValue.includes('[')) {
          // Parse attribute selectors like meta[property="og:title"]
          const tag = platform.checkValue.split('[')[0];
          const attrParts = platform.checkValue.split('[')[1].replace(']', '').split('=');
          const attrName = attrParts[0];
          const attrVal = attrParts[1].replace(/"/g, '');
          htmlContent += `<${tag} ${attrName}="${attrVal}">Found Element</${tag}>`;
        } else if (platform.checkValue.includes('.')) {
          // Parse tag-class selectors like code.identity-state or .class
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

        axios.get.mockResolvedValue({
          status: 200,
          data: htmlContent
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
