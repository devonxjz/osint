'use strict';

// Mock playwright
const mockPage = {
  goto: jest.fn().mockResolvedValue({
    status: () => 200,
    headers: () => ({ 'Content-Type': 'text/html' })
  }),
  content: jest.fn().mockResolvedValue('<html>stealth-rendered</html>')
};

const mockContext = {
  addInitScript: jest.fn().mockResolvedValue(undefined),
  newPage: jest.fn().mockResolvedValue(mockPage)
};

const mockBrowser = {
  newContext: jest.fn().mockResolvedValue(mockContext),
  close: jest.fn().mockResolvedValue(undefined)
};

jest.doMock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue(mockBrowser)
  }
}));

describe('Playwright Stealth Request Client (Local)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('launches chrome browser, injects stealth scripts, and navigates target url', async () => {
    const { playwrightStealthClient } = require('../dist-backend/shared/playwright_client');
    const response = await playwrightStealthClient.request('http://local-stealth.test');

    const playwright = require('playwright');
    expect(playwright.chromium.launch).toHaveBeenCalledTimes(1);
    expect(mockBrowser.newContext).toHaveBeenCalledTimes(1);
    expect(mockContext.addInitScript).toHaveBeenCalledTimes(1);
    expect(mockContext.newPage).toHaveBeenCalledTimes(1);
    expect(mockPage.goto).toHaveBeenCalledWith('http://local-stealth.test', expect.any(Object));
    expect(response.status).toBe(200);
    expect(response.body).toBe('<html>stealth-rendered</html>');
  });
});

