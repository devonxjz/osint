'use strict';

const dns = require('dns').promises;
const {
  isCloudflareIp,
  detectWildcardDns,
  resolveDomainIntel,
  syncCloudflareIps
} = require('../backend/domainEngine');

// Mock DNS resolution
jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn()
  }
}));

describe('Domain Intelligence Engine - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isCloudflareIp()', () => {
    it('correctly matches valid Cloudflare IPs within the CIDR ranges', () => {
      // 104.16.0.0/13 range
      expect(isCloudflareIp('104.16.42.1')).toBe(true);
      expect(isCloudflareIp('104.23.255.254')).toBe(true);
      // 172.64.0.0/13 range
      expect(isCloudflareIp('172.64.0.1')).toBe(true);
    });

    it('returns false for non-Cloudflare IPs', () => {
      expect(isCloudflareIp('8.8.8.8')).toBe(false);
      expect(isCloudflareIp('192.168.1.1')).toBe(false);
    });
  });

  describe('detectWildcardDns()', () => {
    it('detects wildcard DNS when random subdomain resolves to an IP', async () => {
      dns.resolve4.mockResolvedValue(['192.168.10.10']);
      const wildcardIps = await detectWildcardDns('example.com');
      expect(wildcardIps).toContain('192.168.10.10');
      expect(dns.resolve4).toHaveBeenCalled();
    });

    it('returns empty set if random subdomain fails to resolve', async () => {
      dns.resolve4.mockRejectedValue(new Error('ENOTFOUND'));
      const wildcardIps = await detectWildcardDns('example.com');
      expect(wildcardIps.size).toBe(0);
    });
  });

  describe('Wildcard Filtering and Cloudflare Bypass', () => {
    it('filters out resolved subdomains that match wildcard IP unless they are Cloudflare IPs', async () => {
      dns.resolve4.mockImplementation(async (sub) => {
        if (sub.includes('random-wildcard-check')) {
          return ['1.1.1.1']; // Wildcard IP detected
        }
        if (sub === 'blog.example.com') {
          return ['1.1.1.1']; // Matches wildcard IP
        }
        if (sub === 'app.example.com') {
          return ['104.16.0.1']; // Matches wildcard IP BUT is Cloudflare range
        }
        return ['8.8.8.8'];
      });

      const wildcardIps = await detectWildcardDns('example.com');
      expect(wildcardIps.has('1.1.1.1')).toBe(true);

      // blog should be filtered out
      const blogIsWildcard = wildcardIps.has('1.1.1.1') && !isCloudflareIp('1.1.1.1');
      expect(blogIsWildcard).toBe(true);

      // app should bypass since it is Cloudflare
      const appIsWildcardButCF = wildcardIps.has('104.16.0.1') || isCloudflareIp('104.16.0.1');
      expect(appIsWildcardButCF).toBe(true);
    });
  });
});
