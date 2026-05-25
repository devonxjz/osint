// tests/evasion_client_h2.test.js
'use strict';

// Mock undici Agent constructor to spy on its arguments
const undici = require('undici');
jest.mock('undici', () => {
  const original = jest.requireActual('undici');
  return {
    ...original,
    Agent: jest.fn().mockImplementation((options) => {
      return new original.Agent(options);
    })
  };
});

const { EvasionClient } = require('../dist-backend/username/engines/evasionClient');

describe('EvasionClient - HTTP/2 Force Negotiation', () => {
  it('instantiates undici Agent with allowH2 and pipelining enabled', () => {
    // The defaultAgent is instantiated when evasionClient.ts is loaded.
    // So loading the EvasionClient should have triggered the mocked Agent constructor.
    expect(undici.Agent).toHaveBeenCalled();
    const mockCall = undici.Agent.mock.calls[0];
    expect(mockCall).toBeDefined();
    expect(mockCall[0]).toEqual(
      expect.objectContaining({
        allowH2: true,
        pipelining: 10
      })
    );
  });
});
