'use strict';

// --- Constants ---
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
const USERNAME_MIN = 2;
const USERNAME_MAX = 64;

const RECOGNIZED_TLDS = new Set([
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'biz', 'info', 'name', 'pro', 'coop', 'aero', 'museum', 'mobi', 'travel', 'asia', 'cat', 'jobs', 'tel', 'post', 'app', 'dev', 'io', 'me', 'co', 'xyz', 'tv', 'vn', 'us', 'uk', 'ru', 'cn', 'fr', 'de', 'jp', 'ca', 'au', 'in', 'br', 'za', 'ch', 'se', 'nl', 'it', 'es', 'pl', 'sg', 'hk', 'th'
]);

// --- Errors ---
const ERRORS = {
  NOT_A_STRING: 'Input must be a non-empty string',
  EMPTY: 'Input cannot be empty',
  USERNAME_SHORT: 'Username too short (minimum 2 characters)',
  USERNAME_LONG: 'Username too long (maximum 64 characters)',
  INVALID_FORMAT: 'Invalid format: only letters, numbers, _, -, . are allowed',
};

/**
 * Strips Vietnamese diacritics and converts to base ASCII.
 * Also maps đ/Đ to d/D.
 * @param {string} str
 * @returns {string}
 */
function stripVietnameseDiacritics(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D');
}

/**
 * Helper to capitalize the first letter of each word and lowercase the rest.
 * @param {string} str
 * @returns {string}
 */
function capitalizeWords(str) {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Strips leading '@' and trims whitespace.
 * @param {string} input 
 * @returns {string}
 */
function sanitize(input) {
  if (typeof input !== 'string') return '';
  let cleaned = input.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Clean domains by stripping protocol, trailing slashes, and parameters.
 * @param {string} str
 * @returns {string}
 */
function cleanDomainString(str) {
  let cleaned = str.trim().toLowerCase();
  cleaned = cleaned.replace(/^(https?:\/\/)?(www\.)?/, '');
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  return cleaned;
}

/**
 * Analyzes and classifies a raw user input string.
 * @param {string} input - Raw string from UI search box
 * @returns {{type: 'EMAIL' | 'USERNAME' | 'REAL_NAME' | 'PHONE' | 'DOMAIN' | null, valid: boolean, sanitized: string, error?: string}}
 */
function analyzeInput(input) {
  // Step 1: Guard null/undefined/non-string check
  if (input === null || input === undefined || typeof input !== 'string') {
    return {
      type: null,
      valid: false,
      sanitized: '',
      error: ERRORS.NOT_A_STRING
    };
  }

  // Step 2: Trim whitespace and check for empty string
  const trimmed = input.trim();
  if (trimmed === '') {
    return {
      type: null,
      valid: false,
      sanitized: '',
      error: ERRORS.EMPTY
    };
  }

  // Guard against malformed email starting with '@' mimicking a domain
  const MALFORMED_EMAIL_REGEX = /^@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (MALFORMED_EMAIL_REGEX.test(trimmed)) {
    return {
      type: null,
      valid: false,
      sanitized: trimmed,
      error: ERRORS.INVALID_FORMAT
    };
  }

  // ─── 1. EMAIL DETECTION ───
  if (EMAIL_REGEX.test(trimmed)) {
    return {
      type: 'EMAIL',
      valid: true,
      sanitized: trimmed.toLowerCase()
    };
  }

  // ─── 2. DOMAIN DETECTION (Pre-emptive) ───
  const domainCandidate = cleanDomainString(trimmed);
  const domainParts = domainCandidate.split('.');
  if (domainParts.length >= 2) {
    const tld = domainParts[domainParts.length - 1];
    if (RECOGNIZED_TLDS.has(tld)) {
      // Validate structure
      const DOMAIN_STRUCT_REGEX = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,6}$/;
      if (DOMAIN_STRUCT_REGEX.test(domainCandidate)) {
        return {
          type: 'DOMAIN',
          valid: true,
          sanitized: domainCandidate
        };
      }
    }
  }

  // ─── 3. PHONE DETECTION ───
  const digitsOnly = trimmed.replace(/[\s\-\(\)\.]/g, '').replace('+', '');
  if (/^\d+$/.test(digitsOnly)) {
    let rawClean = trimmed.replace(/[\s\-\(\)\.]/g, '');
    // Check if it is a phone format
    // A phone is E.164 (starts with + or 00 and length is 7-15) OR local (starts with 0 and length 9-11)
    const isE164 = (rawClean.startsWith('+') || rawClean.startsWith('00')) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
    const isLocal = rawClean.startsWith('0') && rawClean.length >= 9 && rawClean.length <= 11;

    if (isE164 || isLocal) {
      let formatted = rawClean;
      if (formatted.startsWith('00')) {
        formatted = '+' + formatted.slice(2);
      } else if (formatted.startsWith('0')) {
        formatted = '+84' + formatted.slice(1); // Default to VN prefix for local
      } else if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
      }
      formatted = formatted.replace(/^\+840/, '+84');
      return {
        type: 'PHONE',
        valid: true,
        sanitized: formatted
      };
    }
  }

  // ─── 4. REAL_NAME DETECTION ───
  const rawStrippedDiacritics = stripVietnameseDiacritics(trimmed);
  // Match 2-5 space-separated alphabetic tokens
  const nameWords = rawStrippedDiacritics.trim().split(/\s+/).filter(Boolean);
  if (nameWords.length >= 2 && nameWords.length <= 5) {
    const allAlphabetic = nameWords.every(w => /^[a-zA-Z]+$/.test(w));
    if (allAlphabetic) {
      const sanitizedName = capitalizeWords(rawStrippedDiacritics);
      return {
        type: 'REAL_NAME',
        valid: true,
        sanitized: sanitizedName
      };
    }
  }

  // ─── 5. USERNAME DETECTION (Fallback) ───
  const sanitized = sanitize(trimmed);

  if (sanitized === '') {
    return {
      type: null,
      valid: false,
      sanitized: trimmed,
      error: ERRORS.EMPTY
    };
  }

  if (sanitized.length < USERNAME_MIN) {
    return {
      type: null,
      valid: false,
      sanitized: sanitized,
      error: ERRORS.USERNAME_SHORT
    };
  }

  if (sanitized.length > USERNAME_MAX) {
    return {
      type: null,
      valid: false,
      sanitized: sanitized,
      error: ERRORS.USERNAME_LONG
    };
  }

  if (!USERNAME_REGEX.test(sanitized)) {
    return {
      type: null,
      valid: false,
      sanitized: sanitized,
      error: ERRORS.INVALID_FORMAT
    };
  }

  return {
    type: 'USERNAME',
    valid: true,
    sanitized: sanitized
  };
}

module.exports = { analyzeInput, ERRORS };
