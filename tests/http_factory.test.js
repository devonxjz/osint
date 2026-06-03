'use strict';

const { HttpFactory } = require('../dist-backend/shared/http_factory');
const { ScanSession } = require('../dist-backend/shared/session_state');
const { evasionClient } = require('../dist-backend/username/engines/evasionClient');
const { proxyClient } = require('../dist-backend/shared/proxy_client');
const { isServerless } = require('../dist-backend/shared/runtime');

jest.mock('../dist-backend/shared/runtime');
jest.mock('../dist-backend/username/engines/evasionClient', () => ({
  evasionClient: {
    request: jest.fn()
  }
}));
jest.mock('../dist-backend/shared/proxy_client', () => ({
  proxyClient: {
    request: jest.fn()
  }
}));

describe('HTTP Factory Connection Dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ZENROWS_API_KEY;
  });

  it('routes directly to proxy in serverless mode if session is already promoted', async () => {
    isServerless.mockReturnValue(true);
    process.env.ZENROWS_API_KEY = 'test-key';

    const session = new ScanSession(1);
    session.recordWAFHit(); // promoted = true

    proxyClient.request.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: 'proxy-response'
    });

    const response = await HttpFactory.fetchWithSession('http://target.com', {}, session);

    expect(response.status).toBe(200);
    expect(response.body).toBe('proxy-response');
    expect(proxyClient.request).toHaveBeenCalledTimes(1);
    expect(evasionClient.request).not.toHaveBeenCalled();
  });

  it('routes to evasion first in serverless mode if session is NOT promoted, and retries with proxy on WAF block', async () => {
    isServerless.mockReturnValue(true);
    process.env.ZENROWS_API_KEY = 'test-key';

    const session = new ScanSession(2);

    // Evasion client gets WAF blocked (403)
    evasionClient.request.mockResolvedValueOnce({
      status: 403,
      headers: {},
      body: 'WAF block'
    });

    // Proxy client succeeds
    proxyClient.request.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: 'proxy-response'
    });

    const response = await HttpFactory.fetchWithSession('http://target.com', {}, session);

    expect(response.status).toBe(200);
    expect(response.body).toBe('proxy-response');
    expect(evasionClient.request).toHaveBeenCalledTimes(1);
    expect(proxyClient.request).toHaveBeenCalledTimes(1);
    expect(session.getWafHits()).toBe(1);
  });

  it('routes to evasion and returns direct response if no WAF block is encountered', async () => {
    isServerless.mockReturnValue(true);

    const session = new ScanSession(2);

    evasionClient.request.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: 'success-data'
    });

    const response = await HttpFactory.fetchWithSession('http://target.com', {}, session);

    expect(response.status).toBe(200);
    expect(response.body).toBe('success-data');
    expect(evasionClient.request).toHaveBeenCalledTimes(1);
    expect(proxyClient.request).not.toHaveBeenCalled();
    expect(session.getWafHits()).toBe(0);
  });
});
