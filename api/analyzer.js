'use strict';

// --- Constants ---
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
const USERNAME_MIN = 2;
const USERNAME_MAX = 64;

// --- Errors ---
const ERRORS = {
  NOT_A_STRING: 'Input must be a non-empty string',
  EMPTY: 'Input cannot be empty',
  USERNAME_SHORT: 'Username too short (minimum 2 characters)',
  USERNAME_LONG: 'Username too long (maximum 64 characters)',
  INVALID_FORMAT: 'Invalid format: only letters, numbers, _, -, . are allowed',
};

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
 * Checks if the string matches the email regex.
 * @param {string} str 
 * @returns {boolean}
 */
function isEmail(str) {
  return EMAIL_REGEX.test(str);
}

/**
 * Checks if the string matches the username regex.
 * @param {string} str 
 * @returns {boolean}
 */
function isUsername(str) {
  return USERNAME_REGEX.test(str);
}

/**
 * Analyzes and classifies a raw user input string.
 * @param {string} input - Raw string from UI search box
 * @returns {{type: 'EMAIL' | 'USERNAME' | null, valid: boolean, sanitized: string, error?: string}}
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

  // Step 2 & 3: Trim whitespace and check for empty string
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

  // Step 4: Strip leading '@' prefix for username check, but keep a copy of trimmed input for email checking
  // Note: An email should not have its '@' stripped unless it was a leading '@', but leading '@' on email is malformed anyway.
  const sanitized = sanitize(trimmed);

  // If after sanitization it becomes empty (e.g. input was "@")
  if (sanitized === '') {
    return {
      type: null,
      valid: false,
      sanitized: trimmed,
      error: ERRORS.EMPTY
    };
  }

  // Step 5: Email detection on trimmed input (to ensure we don't accidentally strip a leading '@' if someone typed an email starting with '@', though that is invalid anyway)
  // Let's test the trimmed input directly. If it matches EMAIL_REGEX, it's a valid EMAIL.
  if (isEmail(trimmed)) {
    return {
      type: 'EMAIL',
      valid: true,
      sanitized: trimmed.toLowerCase()
    };
  }

  // Also check if the sanitized input itself is an email (though highly unlikely since it stripped leading '@')
  if (isEmail(sanitized)) {
    return {
      type: 'EMAIL',
      valid: true,
      sanitized: sanitized.toLowerCase()
    };
  }

  // Step 6: Username validation regex test on the sanitized string
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

  if (!isUsername(sanitized)) {
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
