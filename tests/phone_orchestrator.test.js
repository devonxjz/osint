'use strict';

const axios = require('axios');
const app = require('../backend/index');
const { orchestratePhoneScan } = require('../backend/phone/phone_orchestrator');

describe('Phone Scan Orchestrator Module', () => {
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

  // Behavior 1: Executes all lanes in parallel and returns consolidated dossier
  test('orchestrates all lanes in parallel for a valid phone number', async () => {
    const result = await orchestratePhoneScan('+84987654321');

    expect(result).toBeDefined();
    expect(result.phone).toBe('+84987654321');
    expect(result.validation.valid).toBe(true);
    expect(result.callerId.realName).toBeDefined();
    expect(result.peopleSearch.realAddress).toBeDefined();
    expect(result.socialSync.ottProfiles).toBeDefined();
    expect(result.timeTakenMs).toBeDefined();
  });

  // Behavior 2: Early gating termination on invalid input
  test('aborts early and skips concurrent lanes if validation fails', async () => {
    const events = [];
    const result = await orchestratePhoneScan('invalid-phone', {
      onEvent: (e) => events.push(e)
    });

    expect(result.validation.valid).toBe(false);
    expect(result.callerId).toBeUndefined();
    expect(events.length).toBe(1);
    expect(events[0].status).toBe('INVALID');
  });

  // Behavior 3: SSE event streams dispatch correctly
  test('dispatches correct sequential events during orchestration', async () => {
    const events = [];
    await orchestratePhoneScan('+84987654321', {
      onEvent: (e) => events.push(e)
    });

    // Check SSE event modules triggered
    const modules = events.map(e => e.module);
    expect(modules).toContain('validation');
    expect(modules).toContain('caller_id');
    expect(modules).toContain('contact_sync');
    expect(modules).toContain('facebook');
    expect(modules).toContain('people_search');
  });

  // Behavior 4: Express Endpoint integration returns a text/event-stream
  test('GET /api/scan-phone returns SSE text/event-stream', async () => {
    const response = await axios.get(`${baseUrl}/api/scan-phone?target=%2B84987654321`, {
      responseType: 'text'
    });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');
    expect(response.data).toContain('event: result');
    expect(response.data).toContain('validation');
    expect(response.data).toContain('caller_id');
    expect(response.data).toContain('event: end');
  });

  // Behavior 5: Per-lane error isolation — one lane crash should not kill the entire scan
  test('if one lane throws, orchestrator still returns partial results from other lanes', async () => {
    // Monkey-patch caller_id to simulate a crash
    const callerIdModule = require('../backend/phone/caller_id');
    const originalLookup = callerIdModule.lookupCallerID;
    callerIdModule.lookupCallerID = async () => { throw new Error('Simulated Twilio timeout'); };

    const events = [];
    const result = await orchestratePhoneScan('+84987654321', {
      onEvent: (e) => events.push(e)
    });

    // Restore
    callerIdModule.lookupCallerID = originalLookup;

    // Validation should still work
    expect(result.validation.valid).toBe(true);
    // People search and social sync should still return data
    expect(result.peopleSearch).toBeDefined();
    expect(result.socialSync).toBeDefined();
    // Caller ID should be a graceful error object, not undefined crash
    expect(result.callerId).toBeDefined();
    // Should have an error event for the failed lane
    const errorModules = events.filter(e => e.status === 'ERROR');
    expect(errorModules.length).toBeGreaterThanOrEqual(1);
  });
});

