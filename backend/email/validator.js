'use strict';

const dns = require('dns');
const { promisify } = require('util');

const resolveMx = promisify(dns.resolveMx);

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'temp-mail.org', '10minutemail.com',
  'fakeinbox.com', 'mailnesia.com', 'maildrop.cc', 'discard.email',
  'tmpmail.net', 'tmpmail.org', 'bupmail.com', 'getnada.com'
]);

/**
 * Validates an email address and extracts intelligence metadata.
 *
 * @param {string} email - The email address to validate
 * @param {object} [options] - Optional flags
 * @param {boolean} [options.checkMx] - Whether to perform DNS MX lookup
 * @returns {Promise<object>|object} VerificationResult
 */
function validateEmail(email, options = {}) {
  const result = {
    email: typeof email === 'string' ? email.trim() : '',
    syntaxValid: false,
    domainExists: null,
    isDisposable: false,
    suggestedPermutations: [],
  };

  // Step 1: Syntax validation
  if (!email || typeof email !== 'string') {
    return options.checkMx ? Promise.resolve(result) : result;
  }

  const trimmed = email.trim().toLowerCase();
  result.email = trimmed;
  result.syntaxValid = EMAIL_REGEX.test(trimmed);

  if (!result.syntaxValid) {
    return options.checkMx ? Promise.resolve(result) : result;
  }

  // Step 2: Extract parts
  const [localPart, domain] = trimmed.split('@');

  // Step 3: Disposable detection
  result.isDisposable = DISPOSABLE_DOMAINS.has(domain);

  // Step 4: Generate permutations
  result.suggestedPermutations = generatePermutations(localPart, domain);

  // Step 5: MX check if requested
  if (options.checkMx) {
    return checkMxRecord(domain).then((exists) => {
      result.domainExists = exists;
      return result;
    });
  }

  return result;
}

/**
 * Generates email permutations based on the local part pattern.
 * If the local part contains a dot (firstname.lastname), generates work-style variants.
 * Otherwise generates minimal variants.
 */
function generatePermutations(localPart, domain) {
  const permutations = [];

  // Detect firstname.lastname pattern
  if (localPart.includes('.')) {
    const parts = localPart.split('.');
    if (parts.length === 2) {
      const [first, last] = parts;
      // Work email patterns from PRD Module 7.1
      permutations.push(`${first[0]}${last}@${domain}`);        // mbrown
      permutations.push(`${first[0]}.${last}@${domain}`);       // m.brown
      permutations.push(`${first}@${domain}`);                  // mike
      permutations.push(`${first}_${last[0]}@${domain}`);       // mike_b
      permutations.push(`${last}${first[0]}@${domain}`);        // brownm
    }
  } else {
    // Simple username — try stripping trailing numbers and dot/underscore swaps
    const stripped = localPart.replace(/\d+$/, '');
    if (stripped && stripped !== localPart) {
      permutations.push(`${stripped}@${domain}`);
    }
    // Dot/underscore swap
    if (localPart.includes('_')) {
      permutations.push(`${localPart.replace(/_/g, '.')}@${domain}`);
    } else if (localPart.includes('.')) {
      permutations.push(`${localPart.replace(/\./g, '_')}@${domain}`);
    }
  }

  // Deduplicate and exclude the original
  const original = `${localPart}@${domain}`;
  return [...new Set(permutations)].filter(p => p !== original);
}

/**
 * Checks if a domain has MX records.
 */
async function checkMxRecord(domain) {
  try {
    const records = await resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

module.exports = { validateEmail, generatePermutations };
