'use strict';

/**
 * Validates a telephone number and extracts metadata.
 * Handles auto-correction of double prefixes like +840 and converts local formats.
 *
 * @param {string} rawPhone - Raw phone number input
 * @param {string} [fallbackCountryCode='VN'] - Fallback country code if not clear
 * @returns {object} VerificationResult
 */
function validatePhone(rawPhone, fallbackCountryCode = 'VN') {
  const result = {
    valid: false,
    formatted: '',
    countryCode: fallbackCountryCode.toUpperCase(),
    carrier: 'Unknown'
  };

  if (!rawPhone || typeof rawPhone !== 'string') {
    return result;
  }

  // Step 1: Clean spaces, dashes, brackets
  let clean = rawPhone.replace(/[\s\-\(\)]/g, '');

  // Step 2: Auto-correct double prefixes and normalize to E.164
  if (clean.startsWith('+840')) {
    clean = '+84' + clean.slice(4);
  } else if (clean.startsWith('840')) {
    clean = '+84' + clean.slice(3);
  } else if (clean.startsWith('84') && !clean.startsWith('+')) {
    clean = '+' + clean;
  } else if (clean.startsWith('0')) {
    if (fallbackCountryCode.toUpperCase() === 'VN') {
      clean = '+84' + clean.slice(1);
    } else if (fallbackCountryCode.toUpperCase() === 'US') {
      clean = '+1' + clean.slice(1);
    } else if (fallbackCountryCode.toUpperCase() === 'UK') {
      clean = '+44' + clean.slice(1);
    }
  } else if (!clean.startsWith('+')) {
    if (fallbackCountryCode.toUpperCase() === 'VN') {
      clean = '+84' + clean;
    } else if (fallbackCountryCode.toUpperCase() === 'US') {
      clean = '+1' + clean;
    } else if (fallbackCountryCode.toUpperCase() === 'UK') {
      clean = '+44' + clean;
    }
  }

  // Step 3: Verify E.164 boundary (7 to 15 digits)
  const digitsOnly = clean.replace('+', '');
  if (!/^\d+$/.test(digitsOnly) || digitsOnly.length < 7 || digitsOnly.length > 15) {
    return result;
  }

  // Determine Country Code from normalized format
  if (clean.startsWith('+84')) {
    result.countryCode = 'VN';
  } else if (clean.startsWith('+1')) {
    result.countryCode = 'US';
  } else if (clean.startsWith('+44')) {
    result.countryCode = 'UK';
  }

  // Step 4: Carrier Parsing for VN
  if (result.countryCode === 'VN') {
    const localPart = clean.slice(3); // Strips +84
    const prefix2 = localPart.slice(0, 2);

    const viettel = ['86', '96', '97', '98', '32', '33', '34', '35', '36', '37', '38', '39'];
    const mobifone = ['89', '90', '93', '70', '76', '77', '78', '79'];
    const vinaphone = ['88', '91', '94', '81', '82', '83', '84', '85'];
    const vietnamobile = ['92', '56', '58'];
    const gmobile = ['99', '59'];

    if (viettel.includes(prefix2)) {
      result.carrier = 'Viettel';
    } else if (mobifone.includes(prefix2)) {
      result.carrier = 'Mobifone';
    } else if (vinaphone.includes(prefix2)) {
      result.carrier = 'Vinaphone';
    } else if (vietnamobile.includes(prefix2)) {
      result.carrier = 'Vietnamobile';
    } else if (gmobile.includes(prefix2)) {
      result.carrier = 'Gmobile';
    }
  } else if (result.countryCode === 'US') {
    result.carrier = 'US Carrier'; // Simple US mock carrier
  }

  result.valid = true;
  result.formatted = clean;

  return result;
}

module.exports = { validatePhone };
