'use strict';

jest.setTimeout(20000);

const { orchestrateEmailScan } = require('../dist-backend/email');

describe('Email Scan Orchestrator', () => {
  // Behavior 1: Runs all pipelines and returns a consolidated dossier
  test('returns a consolidated dossier with all pipeline results', async () => {
    const dossier = await orchestrateEmailScan('user@gmail.com', {
      onEvent: () => {},
    });

    expect(dossier).toHaveProperty('email');
    expect(dossier).toHaveProperty('validation');
    expect(dossier).toHaveProperty('breaches');
    expect(dossier).toHaveProperty('gravatar');
    expect(dossier).toHaveProperty('identity');
    expect(dossier).toHaveProperty('usernames');
    expect(dossier).toHaveProperty('permutations');
  });

  // Behavior 2: Validation module runs and produces syntaxValid
  test('validates email syntax in the pipeline', async () => {
    const dossier = await orchestrateEmailScan('user@gmail.com', {
      onEvent: () => {},
    });
    expect(dossier.validation.syntaxValid).toBe(true);
  });

  // Behavior 3: Invalid email stops pipeline early
  test('stops pipeline early for invalid email', async () => {
    const dossier = await orchestrateEmailScan('not-an-email', {
      onEvent: () => {},
    });
    expect(dossier.validation.syntaxValid).toBe(false);
    expect(dossier.breaches).toEqual([]);
    expect(dossier.identity.realName).toBeNull();
  });

  // Behavior 4: Fires SSE-like events for each module completion
  test('emits events for each module as they complete', async () => {
    const events = [];
    await orchestrateEmailScan('user@gmail.com', {
      onEvent: (event) => events.push(event),
    });

    const modules = events.map(e => e.module);
    expect(modules).toContain('validation');
    expect(modules).toContain('breach');
    expect(modules).toContain('gravatar');
    expect(modules).toContain('identity');
    expect(modules).toContain('usernames');
  });

  // Behavior 5: Breach results come from the mock engine (no HIBP key)
  test('breach results use mock database when no API key', async () => {
    const dossier = await orchestrateEmailScan('user@gmail.com', {
      onEvent: () => {},
    });
    expect(dossier.breaches.length).toBeGreaterThan(0);
    const names = dossier.breaches.map(b => b.name);
    expect(names).toContain('LinkedIn');
  });

  // Behavior 6: Username extraction produces variants
  test('extracts usernames from email local part', async () => {
    const dossier = await orchestrateEmailScan('mikeb55@yahoo.com', {
      onEvent: () => {},
    });
    expect(dossier.usernames.primary).toBe('mikeb55');
    expect(dossier.usernames.variants.length).toBeGreaterThan(0);
  });
});
