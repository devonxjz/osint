const app = require('../dist-backend/index').default;
const axios = require('axios');

// Mock scanner to avoid live outbound API calls in routing tests
jest.mock('../dist-backend/username/scanner', () => ({
  scanPlatform: jest.fn().mockResolvedValue({
    status: 'NOT_FOUND',
    platform: 'MockPlatform',
    url: 'http://mock'
  })
}));

// Mock domainEngine to avoid live crt.sh/dns outbound calls in routing tests
jest.mock('../dist-backend/domain/domain_orchestrator', () => ({
  resolveDomainIntel: jest.fn().mockResolvedValue({
    domain: 'mock.com',
    whois: { registrar: 'Mock Registrar', created: '2020-01-01', status: [], nameservers: [] },
    subdomains: [],
    certificates: [],
    wildcardDetected: false,
    timeTakenMs: 10
  })
}));

describe('SSE API Routing', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    // Start temporary server on a dynamic free port
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should respond with SSE headers and bad request error for short username', async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/scan?target=j&categories=Tech`, {
        responseType: 'text'
      });

      // Assert correct SSE headers
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['connection']).toContain('keep-alive');

      // Assert error structure is streamed in SSE format
      expect(response.data).toContain('event: error');
      expect(response.data).toContain('Username too short');
    } catch (err) {
      // Should not throw since it returns 200 with SSE stream even on logical error
      fail(err);
    }
  });

  it('should stream progress, results, and end summary for a valid target query', async () => {
    // To keep it fast, we filter to a small subset or unknown categories
    const response = await axios.get(`${baseUrl}/api/scan?target=johndoe&categories=UnknownCategory`, {
      responseType: 'text'
    });

    // Should return 200 and SSE content type
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');

    // Should return no target platforms matched the selected categories message
    expect(response.data).toContain('event: error');
    expect(response.data).toContain('No target platforms matched the selected categories.');
  });

  it('should return the full list of platforms dynamically via /api/platforms', async () => {
    const response = await axios.get(`${baseUrl}/api/platforms`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeGreaterThan(85);

    const github = response.data.find(p => p.name === 'GitHub');
    expect(github).toBeDefined();
    expect(github.category).toBe('Tech');

    const facebook = response.data.find(p => p.name === 'Facebook');
    expect(facebook).toBeDefined();
    expect(facebook.requiresProxy).toBe(true);
    expect(facebook.envCookieKey).toBe('FACEBOOK_COOKIE_KEY');
  });

  it('should return unique categories list dynamically via /api/categories', async () => {
    const response = await axios.get(`${baseUrl}/api/categories`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.sort()).toEqual([
      'DarkWeb',
      'Gaming',
      'Media',
      'Privacy',
      'Regional',
      'Social',
      'Tech'
    ]);
  });

  it('should return secure boolean mappings for session credentials via /api/session-status', async () => {
    process.env.FACEBOOK_COOKIE_KEY = 'li_at=session123';
    delete process.env.LINKEDIN_COOKIE_KEY;

    const response = await axios.get(`${baseUrl}/api/session-status`);
    expect(response.status).toBe(200);
    expect(response.data).toHaveProperty('FACEBOOK_COOKIE_KEY', true);
    expect(response.data).toHaveProperty('LINKEDIN_COOKIE_KEY', false);
  });

  it('should route a REAL_NAME query through the unified scan endpoint and stream progress/results', async () => {
    const response = await axios.get(`${baseUrl}/api/scan?target=John+Doe`, {
      responseType: 'text'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.data).toContain('event: progress');
    expect(response.data).toContain('event: end');
  });

  it('should route a DOMAIN query through the unified scan endpoint and stream progress/results', async () => {
    const response = await axios.get(`${baseUrl}/api/scan?target=google.com`, {
      responseType: 'text'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.data).toContain('event: end');
  });
});
