'use strict';

const axios = require('axios');

// ─── Mock Breach Database ───
// High-fidelity simulated breach records for academic/lab environments.
// Matches PRD Module 3.3 trigger patterns.

const BREACH_POOL = [
  { name: 'LinkedIn', domain: 'linkedin.com', breachDate: '2012-05-05', pwnCount: 164611595, compromisedData: ['Email Addresses', 'Passwords'], description: 'In May 2012, LinkedIn suffered a data breach exposing 164 million email addresses and passwords stored as SHA1 hashes.', isSensitive: false, isVerified: true },
  { name: 'Adobe', domain: 'adobe.com', breachDate: '2013-10-04', pwnCount: 153000000, compromisedData: ['Email Addresses', 'Passwords', 'Usernames', 'Password Hints'], description: 'In October 2013, 153 million Adobe accounts were breached with encrypted passwords and plaintext password hints.', isSensitive: false, isVerified: true },
  { name: 'Yahoo', domain: 'yahoo.com', breachDate: '2013-08-01', pwnCount: 3000000000, compromisedData: ['Email Addresses', 'Passwords', 'Names', 'Phone Numbers', 'Security Questions'], description: 'Yahoo disclosed that all 3 billion user accounts were affected in an August 2013 breach.', isSensitive: false, isVerified: true },
  { name: 'Zing ID', domain: 'zing.vn', breachDate: '2018-11-15', pwnCount: 26700000, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'Vietnamese gaming platform Zing suffered a breach exposing 26.7 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Canva', domain: 'canva.com', breachDate: '2019-05-24', pwnCount: 137000000, compromisedData: ['Email Addresses', 'Passwords', 'Usernames', 'Geographical Locations'], description: 'Canva suffered a cyber attack in May 2019 impacting 137 million users.', isSensitive: false, isVerified: true },
  { name: 'MyFitnessPal', domain: 'myfitnesspal.com', breachDate: '2018-02-01', pwnCount: 143606147, compromisedData: ['Email Addresses', 'Passwords', 'Usernames', 'IP Addresses'], description: 'Under Armour reported that 150 million MyFitnessPal accounts were breached.', isSensitive: false, isVerified: true },
  { name: 'RockYou', domain: 'rockyou.com', breachDate: '2009-12-14', pwnCount: 32603388, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'RockYou stored passwords in plaintext. 32 million accounts were exposed.', isSensitive: false, isVerified: true },
  { name: 'Collection #1', domain: 'N/A', breachDate: '2019-01-07', pwnCount: 772904991, compromisedData: ['Email Addresses', 'Passwords'], description: 'Collection #1 was a large compilation of credential stuffing lists posted to a hacking forum.', isSensitive: false, isVerified: true },
  { name: 'Dropbox', domain: 'dropbox.com', breachDate: '2012-07-01', pwnCount: 68648009, compromisedData: ['Email Addresses', 'Passwords'], description: 'Dropbox disclosed a 2012 breach affecting 68 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Tumblr', domain: 'tumblr.com', breachDate: '2013-02-01', pwnCount: 65469298, compromisedData: ['Email Addresses', 'Passwords'], description: 'Tumblr was breached in 2013 exposing 65 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Zynga', domain: 'zynga.com', breachDate: '2019-09-01', pwnCount: 172869660, compromisedData: ['Email Addresses', 'Passwords', 'Usernames', 'Phone Numbers'], description: 'Zynga (Words With Friends) breach exposed 172 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Dubsmash', domain: 'dubsmash.com', breachDate: '2018-12-01', pwnCount: 161749950, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'Dubsmash breach exposed 161 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Wattpad', domain: 'wattpad.com', breachDate: '2020-06-01', pwnCount: 270000000, compromisedData: ['Email Addresses', 'Passwords', 'Usernames', 'IP Addresses'], description: 'Wattpad breach in mid-2020 exposed 270 million records.', isSensitive: false, isVerified: true },
  { name: 'Mashable', domain: 'mashable.com', breachDate: '2020-11-01', pwnCount: 5500000, compromisedData: ['Email Addresses', 'Names', 'IP Addresses'], description: 'Mashable database appeared on a dark web marketplace.', isSensitive: false, isVerified: true },
  { name: 'Gravatar', domain: 'gravatar.com', breachDate: '2020-10-01', pwnCount: 113990759, compromisedData: ['Email Addresses', 'Usernames', 'Names', 'MD5 Hashes'], description: 'Gravatar data was scraped and published with 114 million records.', isSensitive: false, isVerified: true },
  { name: 'Verifications.io', domain: 'verifications.io', breachDate: '2019-02-01', pwnCount: 763117241, compromisedData: ['Email Addresses', 'Names', 'Phone Numbers', 'IP Addresses', 'Dates of Birth'], description: 'Email validation service leaked 763 million records.', isSensitive: false, isVerified: true },
  { name: 'Exactis', domain: 'exactis.com', breachDate: '2018-06-01', pwnCount: 340000000, compromisedData: ['Email Addresses', 'Names', 'Phone Numbers', 'Physical Addresses'], description: 'Exactis exposed a database of 340 million business and consumer records.', isSensitive: false, isVerified: true },
  { name: 'Disqus', domain: 'disqus.com', breachDate: '2012-07-01', pwnCount: 17551044, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'Disqus confirmed a 2012 breach of 17.5 million accounts.', isSensitive: false, isVerified: true },
  { name: 'Last.fm', domain: 'last.fm', breachDate: '2012-03-01', pwnCount: 43570999, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'Last.fm was breached in March 2012. 43 million accounts were exposed.', isSensitive: false, isVerified: true },
  { name: 'Bitly', domain: 'bitly.com', breachDate: '2014-05-01', pwnCount: 9300000, compromisedData: ['Email Addresses', 'Passwords', 'Usernames'], description: 'Bitly disclosed a breach affecting 9.3 million accounts.', isSensitive: false, isVerified: true },
];

// PRD Module 3.3 — Pattern-based mock breach triggers
const PATTERN_RULES = [
  { match: (email) => email.endsWith('@gmail.com'), breachNames: ['LinkedIn', 'Adobe'] },
  { match: (email) => email.endsWith('@yahoo.com'), breachNames: ['Yahoo', 'Zing ID'] },
  { match: (email) => email.startsWith('test@'),    breachNames: ['Canva', 'MyFitnessPal'] },
  { match: (email) => email.startsWith('admin@'),   breachNames: ['RockYou', 'Collection #1'] },
];

/**
 * Looks up breaches for a given email.
 * If HIBP API key is present, queries the live API.
 * Otherwise falls back to the mock breach database.
 *
 * @param {string} email
 * @param {object} [options]
 * @param {string|null} [options.hibpApiKey] - HaveIBeenPwned API key
 * @returns {Promise<{ source: string, breaches: object[] }>}
 */
async function lookupBreaches(email, options = {}) {
  const apiKey = options.hibpApiKey || process.env.HIBP_API_KEY || null;

  if (apiKey) {
    return queryHIBP(email, apiKey);
  }

  return queryMockDatabase(email);
}

/**
 * Live HIBP API query with 1500ms rate-limit sleep.
 */
async function queryHIBP(email, apiKey) {
  // Enforce rate limit — 1 req / 1500ms per PRD
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    const response = await axios.get(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}`,
      {
        headers: {
          'hibp-api-key': apiKey,
          'User-Agent': 'OSINT-Intelligence-Suite',
        },
        validateStatus: () => true,
        timeout: 10000,
      }
    );

    if (response.status === 200 && Array.isArray(response.data)) {
      return {
        source: 'hibp',
        breaches: response.data.map(b => ({
          name: b.Name,
          domain: b.Domain,
          breachDate: b.BreachDate,
          pwnCount: b.PwnCount,
          compromisedData: b.DataClasses || [],
          description: b.Description || '',
          isSensitive: b.IsSensitive || false,
          isVerified: b.IsVerified || false,
        })),
      };
    }

    // 404 = no breaches found, anything else = treat as empty
    return { source: 'hibp', breaches: [] };

  } catch (err) {
    // Fallback to mock on network failure
    return queryMockDatabase(email);
  }
}

/**
 * Mock breach database lookup using pattern matching and deterministic seed heuristics.
 * Domain-based sensitivity: privacy-focused providers (protonmail, tutanota) have
 * lower breach exposure rates than consumer providers (hotmail, aol).
 */
function queryMockDatabase(email) {
  const normalized = email.trim().toLowerCase();

  // Check pattern rules first (exact matches for known domains/prefixes)
  for (const rule of PATTERN_RULES) {
    if (rule.match(normalized)) {
      const matched = BREACH_POOL.filter(b => rule.breachNames.includes(b.name));
      return Promise.resolve({ source: 'mock', breaches: matched });
    }
  }

  // Deterministic seed from email string
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  const seed = Math.abs(hash);

  // Domain-based breach rate heuristic
  const domain = normalized.split('@')[1] || '';
  const PRIVACY_DOMAINS = new Set(['protonmail.com', 'tutanota.com', 'pm.me', 'tuta.io']);
  const HIGH_RISK_DOMAINS = new Set(['hotmail.com', 'aol.com', 'mail.ru', 'yandex.ru']);

  let cleanThreshold;
  if (PRIVACY_DOMAINS.has(domain)) {
    cleanThreshold = 7; // 70% chance of being clean
  } else if (HIGH_RISK_DOMAINS.has(domain)) {
    cleanThreshold = 2; // 20% chance of being clean
  } else {
    cleanThreshold = 4; // 40% chance of being clean (default)
  }

  if (seed % 10 < cleanThreshold) {
    return Promise.resolve({ source: 'mock', breaches: [] });
  }

  // Deterministic selection: 1-4 breaches based on seed
  const count = (seed % 4) + 1;
  const startIndex = seed % BREACH_POOL.length;
  const selected = [];
  for (let i = 0; i < count; i++) {
    selected.push(BREACH_POOL[(startIndex + i) % BREACH_POOL.length]);
  }
  return Promise.resolve({ source: 'mock', breaches: selected });
}

module.exports = { lookupBreaches, BREACH_POOL };

