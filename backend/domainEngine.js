'use strict';

const dns = require('dns').promises;
const axios = require('axios');

// Pre-seeded static Cloudflare IP ranges to use as a robust fallback
let CLOUDFLARE_IP_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22'
];

/**
 * Dynamically fetches Cloudflare IPv4 ranges from their official list.
 * Falls back to static pre-seeded values if the network call fails.
 */
async function syncCloudflareIps() {
  try {
    const response = await axios.get('https://www.cloudflare.com/ips-v4', { timeout: 3000 });
    if (response.data && typeof response.data === 'string') {
      const ranges = response.data
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.includes('/'));
      if (ranges.length > 0) {
        CLOUDFLARE_IP_RANGES = ranges;
      }
    }
  } catch (err) {
    // Fail silently, preserving static fallback
  }
}

// Automatically sync Cloudflare IP ranges on startup
syncCloudflareIps();

/**
 * Helper to convert IP string to integer value.
 */
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Checks if a given IP resides within a specified CIDR range.
 */
function ipInCidr(ip, cidr) {
  try {
    const [range, bitsStr] = cidr.split('/');
    const bits = parseInt(bitsStr, 10);
    const ipIntVal = ipToInt(ip);
    const rangeIntVal = ipToInt(range);
    const mask = (bits === 0) ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipIntVal & mask) === (rangeIntVal & mask);
  } catch (e) {
    return false;
  }
}

/**
 * Verifies if the target IP belongs to any Cloudflare proxy networks.
 */
function isCloudflareIp(ip) {
  if (!ip || typeof ip !== 'string' || !ip.includes('.')) return false;
  return CLOUDFLARE_IP_RANGES.some(cidr => ipInCidr(ip, cidr));
}

/**
 * Executes a pre-flight probe on a randomized non-existent subdomain
 * to detect Wildcard DNS resolution.
 */
async function detectWildcardDns(domain) {
  const randomSub = `random-wildcard-check-${Math.floor(Math.random() * 1000000)}.${domain}`;
  try {
    const ips = await dns.resolve4(randomSub);
    return new Set(ips);
  } catch (err) {
    return new Set();
  }
}

/**
 * Performs HTTPS-based WHOIS resolution using bootstrap endpoints (No Port 43 TCP).
 */
async function fetchWhoisRdap(domain, signal) {
  // Primary attempt: RDAP HTTPS
  try {
    const response = await axios.get(`https://rdap.org/domain/${domain}`, {
      timeout: 4000,
      headers: { 'Accept': 'application/json' },
      signal
    });
    if (response.data) {
      return {
        registrar: response.data.port43 || 'Unknown Registrar',
        created: response.data.events?.find(e => e.eventAction === 'registration')?.eventDate || null,
        status: response.data.status || [],
        nameservers: response.data.nameservers?.map(n => n.ldhName) || []
      };
    }
  } catch (err) {
    if (err.name === 'AbortError' || axios.isCancel(err)) throw err;
  }

  // Fallback attempt: Bootstrap or secondary HTTPS endpoint
  try {
    const response = await axios.get(`https://rdap-bootstrap.arin.net/bootstrap/rdap/domain/${domain}`, {
      timeout: 4000,
      headers: { 'Accept': 'application/json' },
      signal
    });
    if (response.data) {
      return {
        registrar: 'Resolved via ARIN Bootstrap',
        created: response.data.events?.find(e => e.eventAction === 'registration')?.eventDate || null,
        status: response.data.status || [],
        nameservers: response.data.nameservers?.map(n => n.ldhName) || []
      };
    }
  } catch (err) {
    if (err.name === 'AbortError' || axios.isCancel(err)) throw err;
  }

  return {
    registrar: 'WHOIS Service Unavailable',
    created: null,
    status: [],
    nameservers: []
  };
}

/**
 * Orchestrates a complete Domain Intelligence Scan.
 */
async function resolveDomainIntel(domain, options = {}, signal = null) {
  const { onResult, onProgress } = options;

  // 1. Wildcard DNS pre-flight probe
  let wildcardIps = new Set();
  try {
    wildcardIps = await detectWildcardDns(domain);
  } catch (e) {
    // Fail silently
  }

  // 2. Fetch WHOIS metadata
  let whois = null;
  try {
    whois = await fetchWhoisRdap(domain, signal);
  } catch (err) {
    if (err.name === 'AbortError' || axios.isCancel(err)) return;
  }

  // 3. Query Certificate Transparency (CT) logs via crt.sh
  let subdomains = [];
  try {
    const response = await axios.get(`https://crt.sh/?q=${domain}&output=json`, {
      timeout: 6000,
      signal
    });
    if (Array.isArray(response.data)) {
      const uniqueSubs = new Set();
      response.data.forEach(item => {
        if (item.name_value) {
          const names = item.name_value.split('\n');
          names.forEach(name => {
            const cleanName = name.trim().toLowerCase();
            if (cleanName.endsWith(domain) && !cleanName.includes('*')) {
              uniqueSubs.add(cleanName);
            }
          });
        }
      });
      subdomains = Array.from(uniqueSubs);
    }
  } catch (err) {
    if (err.name === 'AbortError' || axios.isCancel(err)) return;
    // Emit dynamic rate limit / 429 indicator gracefully without breaking scan
    if (onResult) {
      onResult({
        platform: 'Certificate Logs',
        status: 'INFO',
        message: 'Rate limit encountered; domain intelligence records for this platform are temporarily unavailable.'
      });
    }
  }

  // 4. Resolve subdomains and filter out wildcards (except Cloudflare proxies)
  const resolvedSubdomains = [];
  const total = subdomains.length;

  for (let i = 0; i < total; i++) {
    if (signal && signal.aborted) return;
    const sub = subdomains[i];

    try {
      const ips = await dns.resolve4(sub);
      const ip = ips[0];

      // Wildcard check with Cloudflare bypass rule
      const isWildcardMatch = wildcardIps.has(ip);
      const isCf = isCloudflareIp(ip);

      if (!isWildcardMatch || isCf) {
        resolvedSubdomains.push({
          subdomain: sub,
          ip,
          isCloudflare: isCf
        });

        if (onResult) {
          onResult({
            platform: 'Subdomain Discovery',
            status: 'FOUND',
            url: `http://${sub}`,
            ip,
            isCloudflare: isCf
          });
        }
      }
    } catch (err) {
      // Not found or failed to resolve DNS, skip silently
    }

    if (onProgress) {
      onProgress({
        completed: i + 1,
        total,
        percentage: parseFloat((((i + 1) / total) * 100).toFixed(1))
      });
    }
  }

  // Deduplicate and cap values strictly for PDF Dossier compatibility
  const cappedCerts = resolvedSubdomains.slice(0, 15);
  const cappedDomains = resolvedSubdomains.slice(0, 10);

  return {
    domain,
    whois,
    subdomains: cappedDomains,
    certificates: cappedCerts,
    wildcardDetected: wildcardIps.size > 0,
    timeTakenMs: Date.now()
  };
}

module.exports = {
  isCloudflareIp,
  detectWildcardDns,
  resolveDomainIntel,
  syncCloudflareIps
};
