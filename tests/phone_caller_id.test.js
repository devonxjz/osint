'use strict';

const axios = require('axios');
const { lookupCallerID } = require('../backend/phone/caller_id');

jest.mock('axios');

describe('Phone Reverse Caller ID Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  // Behavior 1: Deterministic Hashing Mock Fallback
  test('returns consistent mock data based on phone seed when Twilio credentials are missing', async () => {
    const res1 = await lookupCallerID('+84987654321');
    const res2 = await lookupCallerID('+84987654321');

    // Ensure it is deterministic and matches
    expect(res1.realName).toBe(res2.realName);
    expect(res1.location).toBe(res2.location);
    expect(res1.carrier).toBe('Viettel');
    expect(res1.sources).toContain('Deterministic Mock');

    // Ensure Western numbers match Western mock profiles
    const resUS = await lookupCallerID('+12025550143');
    expect(['New York, USA', 'California, USA', 'Texas, USA', 'Washington, USA']).toContain(resUS.location);
  });

  // Behavior 2: Twilio Integration with Axios
  test('calls Twilio API with Basic Auth when credentials are provided', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';

    axios.get.mockResolvedValueOnce({
      data: {
        caller_name: {
          caller_name: 'John Doe'
        },
        line_type_intelligence: {
          carrier_name: 'Verizon Wireless'
        }
      }
    });

    const result = await lookupCallerID('+12025550143');

    expect(axios.get).toHaveBeenCalledWith(
      'https://lookups.twilio.com/v2/PhoneNumbers/%2B12025550143?Fields=line_type_intelligence,caller_name',
      expect.objectContaining({
        auth: {
          username: 'AC_test_sid',
          password: 'test_token'
        }
      })
    );
    expect(result.realName).toBe('John Doe');
    expect(result.carrier).toBe('Verizon Wireless');
    expect(result.sources).toContain('Twilio Lookup API');
  });

  // Behavior 3: Twilio VN callerName: null Fallback
  test('falls back to deterministic mock name if Twilio returns callerName null', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';

    axios.get.mockResolvedValueOnce({
      data: {
        caller_name: null,
        line_type_intelligence: {
          carrier_name: 'Viettel'
        }
      }
    });

    const result = await lookupCallerID('+84987654321');

    // Should NOT be null or empty, must fallback to deterministic mock name
    expect(result.realName).not.toBeNull();
    expect(result.realName).not.toBe('');
    expect(result.carrier).toBe('Viettel');
    expect(result.sources).toContain('Deterministic Fallback');
  });

  // Behavior 4: Graceful Axios errors fallback
  test('falls back gracefully if Twilio API call fails', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    process.env.TWILIO_AUTH_TOKEN = 'test_token';

    axios.get.mockRejectedValueOnce(new Error('API Timeout'));

    const result = await lookupCallerID('+84987654321');
    expect(result.realName).not.toBeNull();
    expect(result.sources).toContain('Deterministic Mock');
  });
});
