'use strict';

const { isServerless } = require('../dist-backend/shared/runtime');
const { ScanSession } = require('../dist-backend/shared/session_state');

describe('Runtime Detection Helper', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects standard local environment', () => {
    delete process.env.VERCEL;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    expect(isServerless()).toBe(false);
  });

  it('detects Vercel serverless environment', () => {
    process.env.VERCEL = '1';
    expect(isServerless()).toBe(true);
  });

  it('detects AWS Lambda serverless environment', () => {
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'my-function';
    expect(isServerless()).toBe(true);
  });
});

describe('ScanSession State Container', () => {
  it('initializes with default values and is not promoted', () => {
    const session = new ScanSession();
    expect(session.getWafHits()).toBe(0);
    expect(session.shouldUseProxy()).toBe(false);
  });

  it('allows configuring custom threshold', () => {
    const session = new ScanSession(3);
    session.recordWAFHit();
    session.recordWAFHit();
    expect(session.shouldUseProxy()).toBe(false);
    session.recordWAFHit();
    expect(session.shouldUseProxy()).toBe(true);
  });

  it('promotes automatically at default threshold of 2', () => {
    const session = new ScanSession();
    session.recordWAFHit();
    expect(session.shouldUseProxy()).toBe(false);
    session.recordWAFHit();
    expect(session.shouldUseProxy()).toBe(true);
  });

  it('isolates state across different instances', () => {
    const sessionA = new ScanSession(2);
    const sessionB = new ScanSession(2);
    sessionA.recordWAFHit();
    sessionA.recordWAFHit();
    expect(sessionA.shouldUseProxy()).toBe(true);
    expect(sessionB.shouldUseProxy()).toBe(false);
  });
});
