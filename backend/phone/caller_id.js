'use strict';

const axios = require('axios');
const { validatePhone } = require('./validator');

/**
 * Generates consistent, deterministic mock profiles based on a seed hash of the phone number.
 * Used to avoid profile mismatching between parallel lanes.
 *
 * @param {string} phone - Normalized E.164 phone number
 * @returns {object} MockProfile
 */
function getDeterministicProfile(phone) {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) {
    hash = phone.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absHash = Math.abs(hash);
  const isVN = phone.startsWith('+84');

  const vnNames = ['Nguyễn Văn An', 'Trần Thị Bình', 'Phạm Minh Hải', 'Lê Hoàng Nam', 'Vũ Thị Mai'];
  const vnLocations = ['Hanoi, Vietnam', 'Ho Chi Minh City, Vietnam', 'Da Nang, Vietnam', 'Hai Phong, Vietnam'];
  const usNames = ['John Carter', 'Sarah Jenkins', 'Robert Miller', 'Emily Davis', 'Michael Brown'];
  const usLocations = ['New York, USA', 'California, USA', 'Texas, USA', 'Washington, USA'];

  const nameList = isVN ? vnNames : usNames;
  const locList = isVN ? vnLocations : usLocations;

  return {
    realName: nameList[absHash % nameList.length],
    location: locList[absHash % locList.length]
  };
}

/**
 * Reverse Caller ID Lookup Engine.
 * Optionally connects to Twilio Lookup v2 or falls back gracefully to deterministic mocks.
 *
 * @param {string} phone - Target phone number
 * @param {object} [options] - Options dictionary
 * @returns {Promise<object>} CallerIdResult
 */
async function lookupCallerID(phone, options = {}) {
  // Validate and normalize phone format first
  const validation = validatePhone(phone);
  const cleanPhone = validation.valid ? validation.formatted : phone;

  const result = {
    realName: '',
    location: '',
    carrier: validation.carrier || 'Unknown',
    sources: []
  };

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  // Scenario A: Live Twilio lookup if credentials exist
  if (sid && token) {
    try {
      const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(cleanPhone)}?Fields=line_type_intelligence,caller_name`;
      const response = await axios.get(url, {
        auth: {
          username: sid,
          password: token
        }
      });

      const data = response.data || {};
      const twilioName = data.caller_name ? data.caller_name.caller_name : null;
      
      // Handle carrier intelligence
      if (data.line_type_intelligence && data.line_type_intelligence.carrier_name) {
        result.carrier = data.line_type_intelligence.carrier_name;
      }

      // Explicit Twilio VN / non-US fallback logic:
      // If Twilio returned null caller_name, use deterministic fallback
      if (twilioName) {
        result.realName = twilioName;
        result.location = cleanPhone.startsWith('+84') ? 'Vietnam' : 'US/CA';
        result.sources.push('Twilio Lookup API');
      } else {
        const mockProfile = getDeterministicProfile(cleanPhone);
        result.realName = mockProfile.realName;
        result.location = mockProfile.location;
        result.sources.push('Twilio Lookup API', 'Deterministic Fallback');
      }

      return result;
    } catch (err) {
      // Fallback gracefully on API errors
      const mockProfile = getDeterministicProfile(cleanPhone);
      result.realName = mockProfile.realName;
      result.location = mockProfile.location;
      result.sources.push('Deterministic Mock');
      return result;
    }
  }

  // Scenario B: Default offline deterministic mock
  const mockProfile = getDeterministicProfile(cleanPhone);
  result.realName = mockProfile.realName;
  result.location = mockProfile.location;
  result.sources.push('Deterministic Mock');

  return result;
}

module.exports = { lookupCallerID, getDeterministicProfile };
