'use strict';

const PERSONAL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

/**
 * Email Permutation & Verification Engine — PRD Module 7
 *
 * Generates candidate email addresses from resolved identity data
 * and username information.
 *
 * @param {object} input
 * @param {string} [input.realName] - Resolved real name (e.g., "Mike Brown")
 * @param {string} [input.domain] - Work domain (e.g., "company.com")
 * @param {string} [input.username] - Primary username extracted from email
 * @returns {{ workEmails: string[], personalEmails: string[] }}
 */
function generateEmailPermutations(input = {}) {
  const { realName, domain, username } = input;
  const workEmails = [];
  const personalEmails = [];

  // ─── Work Email Patterns (PRD 7.1) ───
  if (realName && domain) {
    const parts = realName.trim().toLowerCase().split(/\s+/);
    if (parts.length >= 2) {
      const first = parts[0];
      const last = parts[parts.length - 1];

      workEmails.push(`${first}.${last}@${domain}`);     // mike.brown@company.com
      workEmails.push(`${first[0]}.${last}@${domain}`);   // m.brown@company.com
      workEmails.push(`${first[0]}${last}@${domain}`);    // mbrown@company.com
      workEmails.push(`${first}@${domain}`);               // mike@company.com
      workEmails.push(`${first}_${last[0]}@${domain}`);   // mike_b@company.com
      workEmails.push(`${last}${first[0]}@${domain}`);    // brownm@company.com
    }
  }

  // ─── Personal Email Patterns (PRD 7.2) ───
  if (username) {
    const normalizedUsername = username.trim().toLowerCase();

    for (const personalDomain of PERSONAL_DOMAINS) {
      personalEmails.push(`${normalizedUsername}@${personalDomain}`);
    }

    // Generate dot variant for Gmail (e.g., mike.b55@gmail.com)
    // Insert dot at the boundary between a multi-char alpha prefix and the remaining
    const dotVariant = normalizedUsername.replace(/^([a-zA-Z]{2,})([a-zA-Z]\d.*)$/, '$1.$2');
    if (dotVariant !== normalizedUsername) {
      personalEmails.push(`${dotVariant}@gmail.com`);
    }
  }

  // Deduplicate across both lists
  const seen = new Set();
  const dedup = (arr) => {
    const result = [];
    for (const email of arr) {
      if (!seen.has(email)) {
        seen.add(email);
        result.push(email);
      }
    }
    return result;
  };

  return {
    workEmails: dedup(workEmails),
    personalEmails: dedup(personalEmails),
  };
}

module.exports = { generateEmailPermutations };
