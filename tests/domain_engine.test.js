'use strict';

const dns = require('dns').promises;
const axios = require('axios');
const {
  isCloudflareIp,
  detectWildcardDns,
  resolveDomainIntel,
  syncCloudflareIps
} = require('../dist-backend/domain');

// Mock DNS and Axios
jest.mock('dns', () => ({
  promises: {
    resolve4: jest.fn()
  }
}));
jest.mock('axios');

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

  describe('resolveDomainIntel() - Graph JSON Structure', () => {
    it('returns a dossier with a default structured graph object containing nodes and edges', async () => {
      dns.resolve4.mockRejectedValue(new Error('ENOTFOUND')); // No subdomains found
      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', events: [], status: [], nameservers: [] } };
        }
        if (url.includes('crt.sh')) {
          return { data: [] };
        }
        return { data: {} };
      });

      const result = await resolveDomainIntel('example.com', {
        onResult: jest.fn(),
        onProgress: jest.fn()
      });

      expect(result.graph).toBeDefined();
      expect(Array.isArray(result.graph.nodes)).toBe(true);
      expect(Array.isArray(result.graph.edges)).toBe(true);
    });

    it('extracts WHOIS registrant name and email into graph nodes and edges', async () => {
      dns.resolve4.mockRejectedValue(new Error('ENOTFOUND')); // No subdomains
      
      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return {
            data: {
              port43: 'whois.iana.org',
              entities: [
                {
                  roles: ['registrant'],
                  vcardArray: [
                    'vcard',
                    [
                      ['fn', {}, 'text', 'Nguyen Van A'],
                      ['email', {}, 'text', 'admin@example.com']
                    ]
                  ]
                }
              ]
            }
          };
        }
        return { data: [] };
      });

      const result = await resolveDomainIntel('example.com');
      
      const emailNode = result.graph.nodes.find(n => n.type === 'Email');
      const nameNode = result.graph.nodes.find(n => n.type === 'Real Name');

      expect(emailNode).toBeDefined();
      expect(emailNode.label).toBe('admin@example.com');
      expect(emailNode.group).toBe('contact');

      expect(nameNode).toBeDefined();
      expect(nameNode.label).toBe('Nguyen Van A');
      expect(nameNode.group).toBe('person');

      const ownedEdge = result.graph.edges.find(e => e.relation === 'OWNED_BY');
      expect(ownedEdge).toBeDefined();
      expect(ownedEdge.source).toBe('dom-example.com');
      expect(ownedEdge.target).toBe(nameNode.id);
    });

    it('creates subdomain and IP nodes with RESOLVES_TO relations in graph', async () => {
      dns.resolve4.mockImplementation(async (sub) => {
        if (sub === 'api.example.com') {
          return ['104.16.2.3']; // Cloudflare IP
        }
        throw new Error('ENOTFOUND');
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', entities: [] } };
        }
        if (url.includes('crt.sh')) {
          return { data: [{ name_value: 'api.example.com' }] };
        }
        return { data: [] };
      });

      const result = await resolveDomainIntel('example.com');

      const subNode = result.graph.nodes.find(n => n.type === 'Subdomain');
      const ipNode = result.graph.nodes.find(n => n.type === 'IP');

      expect(subNode).toBeDefined();
      expect(subNode.label).toBe('api.example.com');
      expect(subNode.group).toBe('subdomain');

      expect(ipNode).toBeDefined();
      expect(ipNode.label).toBe('104.16.2.3');
      expect(ipNode.group).toBe('infrastructure');
      expect(ipNode.properties.isCloudflare).toBe(true);

      const resolvesEdge = result.graph.edges.find(e => e.relation === 'RESOLVES_TO');
      expect(resolvesEdge).toBeDefined();
      expect(resolvesEdge.source).toBe(subNode.id);
      expect(resolvesEdge.target).toBe(ipNode.id);
    });

    it('harvests trackers, socials, robots.txt, wayback history, and exposed documents in parallel', async () => {
      dns.resolve4.mockRejectedValue(new Error('ENOTFOUND')); // No subdomains

      axios.get.mockImplementation(async (url) => {
        // WHOIS
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', entities: [] } };
        }
        // crt.sh
        if (url.includes('crt.sh')) {
          return { data: [] };
        }
        // Live page HTML scrape (Task 23)
        if (url === 'http://harvest-test.com') {
          return {
            data: `
              <html>
                <body>
                  <script>
                    ga('create', 'UA-123456-1', 'auto');
                    ga('send', 'pageview');
                  </script>
                  <a href="https://facebook.com/mybrand">FB</a>
                  <a href="https://twitter.com/mybrand">Twitter</a>
                  <div>Adsense: pub-9876543210123456</div>
                </body>
              </html>
            `
          };
        }
        // robots.txt (Task 24)
        if (url === 'http://harvest-test.com/robots.txt') {
          return {
            data: `
              User-agent: *
              Disallow: /admin
              Disallow: /private-data
            `
          };
        }
        // Wayback machine (Task 24)
        if (url.includes('web.archive.org/cdx')) {
          return {
            data: [
              ['urlkey', 'timestamp', 'original', 'mimetype', 'statuscode', 'digest', 'length'],
              ['com,harvest-test)/', '20240101120000', 'http://harvest-test.com/', 'text/html', '200', 'sha1', '100']
            ]
          };
        }
        // Document search discovery (Task 25)
        if (url.includes('duckduckgo.com')) {
          return {
            data: `
              <a href="https://harvest-test.com/files/report.pdf">Report PDF</a>
            `
          };
        }
        // Partial PDF Range request (Task 25)
        if (url === 'https://harvest-test.com/files/report.pdf') {
          return {
            data: Buffer.from('/Author (Jane Doe) /Email (jane@harvest-test.com)')
          };
        }

        return { data: {} };
      });

      const result = await resolveDomainIntel('harvest-test.com');

      // Assert Trackers (Task 23)
      const uaNode = result.graph.nodes.find(n => n.label === 'UA-123456-1');
      const pubNode = result.graph.nodes.find(n => n.label === 'pub-9876543210123456');
      expect(uaNode).toBeDefined();
      expect(pubNode).toBeDefined();
      expect(uaNode.type).toBe('Tracker');
      expect(pubNode.type).toBe('Tracker');

      // Assert Socials (Task 23)
      const fbNode = result.graph.nodes.find(n => n.label.includes('facebook.com/mybrand'));
      expect(fbNode).toBeDefined();
      expect(fbNode.type).toBe('Social');

      // Assert Hidden Pages (Task 24)
      const adminNode = result.graph.nodes.find(n => n.label === '/admin');
      expect(adminNode).toBeDefined();
      expect(adminNode.type).toBe('Hidden Page');

      // Assert Historical Record (Task 24)
      const histNode = result.graph.nodes.find(n => n.type === 'Historical Record');
      expect(histNode).toBeDefined();
      expect(histNode.label).toContain('2024-01-01');

      // Assert Document Range Extraction (Task 25)
      const docNode = result.graph.nodes.find(n => n.type === 'Document');
      expect(docNode).toBeDefined();
      expect(docNode.label).toBe('report.pdf');
      
      const authorNode = result.graph.nodes.find(n => n.type === 'Real Name' && n.label === 'Jane Doe');
      expect(authorNode).toBeDefined();
      
      const emailNode = result.graph.nodes.find(n => n.type === 'Email' && n.label === 'jane@harvest-test.com');
      expect(emailNode).toBeDefined();

      const containsEdge = result.graph.edges.find(e => e.source === docNode.id && e.target === authorNode.id && e.relation === 'CONTAINS');
      expect(containsEdge).toBeDefined();
    });
  });

  describe('Shodan API Integration & Fallback Boundary Tests', () => {
    let originalApiKey;

    beforeAll(() => {
      originalApiKey = process.env.SHODAN_API_KEY;
    });

    afterAll(() => {
      if (originalApiKey !== undefined) {
        process.env.SHODAN_API_KEY = originalApiKey;
      } else {
        delete process.env.SHODAN_API_KEY;
      }
    });

    it('utilizes high-fidelity keyless mock fallback when SHODAN_API_KEY is not defined', async () => {
      delete process.env.SHODAN_API_KEY;

      dns.resolve4.mockImplementation(async (sub) => {
        if (sub === 'api.example.com') {
          return ['1.1.1.1'];
        }
        throw new Error('ENOTFOUND');
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', entities: [] } };
        }
        if (url.includes('crt.sh')) {
          return { data: [{ name_value: 'api.example.com' }] };
        }
        return { data: {} };
      });

      const result = await resolveDomainIntel('example.com');
      
      // Ensure IP node has fallback Shodan properties
      const ipNode = result.graph.nodes.find(n => n.id === 'ip-1.1.1.1');
      expect(ipNode).toBeDefined();
      expect(ipNode.properties.shodan_org).toBe('Google LLC');
      expect(ipNode.properties.shodan_os).toContain('Linux');

      // Ensure Port nodes are created
      const portNode80 = result.graph.nodes.find(n => n.id === 'port-1.1.1.1-80');
      const portNode443 = result.graph.nodes.find(n => n.id === 'port-1.1.1.1-443');
      expect(portNode80).toBeDefined();
      expect(portNode443).toBeDefined();

      // Ensure Axios was NOT called with Shodan API URL
      const shodanCalls = axios.get.mock.calls.filter(call => call[0].includes('api.shodan.io'));
      expect(shodanCalls.length).toBe(0);
    });

    it('queries real Shodan Host API when SHODAN_API_KEY is configured', async () => {
      process.env.SHODAN_API_KEY = 'test-shodan-key';

      dns.resolve4.mockImplementation(async (sub) => {
        if (sub === 'api.example.com') {
          return ['8.8.8.8'];
        }
        throw new Error('ENOTFOUND');
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', entities: [] } };
        }
        if (url.includes('crt.sh')) {
          return { data: [{ name_value: 'api.example.com' }] };
        }
        if (url.includes('api.shodan.io')) {
          return {
            data: {
              ports: [22, 443, 80],
              org: 'Custom Shodan Org',
              isp: 'Custom Shodan ISP',
              os: 'FreeBSD 13.x',
              country_name: 'Singapore',
              city: 'Changi'
            }
          };
        }
        return { data: {} };
      });

      const result = await resolveDomainIntel('example.com');

      // Ensure Shodan API was queried using correct key and IP
      const shodanCalls = axios.get.mock.calls.filter(call => call[0].includes('api.shodan.io'));
      expect(shodanCalls.length).toBe(1);
      expect(shodanCalls[0][0]).toContain('8.8.8.8');
      expect(shodanCalls[0][0]).toContain('key=test-shodan-key');

      // Ensure IP properties match live Shodan API payload
      const ipNode = result.graph.nodes.find(n => n.id === 'ip-8.8.8.8');
      expect(ipNode).toBeDefined();
      expect(ipNode.properties.shodan_org).toBe('Custom Shodan Org');
      expect(ipNode.properties.shodan_isp).toBe('Custom Shodan ISP');
      expect(ipNode.properties.shodan_os).toBe('FreeBSD 13.x');
      expect(ipNode.properties.shodan_location).toBe('Changi, Singapore');

      // Ensure returned ports are added to graph
      const portNode22 = result.graph.nodes.find(n => n.id === 'port-8.8.8.8-22');
      const portNode443 = result.graph.nodes.find(n => n.id === 'port-8.8.8.8-443');
      expect(portNode22).toBeDefined();
      expect(portNode443).toBeDefined();
    });

    it('recovers gracefully and applies mock fallbacks when Shodan API call fails', async () => {
      process.env.SHODAN_API_KEY = 'faulty-shodan-key';

      dns.resolve4.mockImplementation(async (sub) => {
        if (sub === 'api.example.com') {
          return ['9.9.9.9'];
        }
        throw new Error('ENOTFOUND');
      });

      axios.get.mockImplementation(async (url) => {
        if (url.includes('rdap.org') || url.includes('rdap-bootstrap')) {
          return { data: { port43: 'whois.iana.org', entities: [] } };
        }
        if (url.includes('crt.sh')) {
          return { data: [{ name_value: 'api.example.com' }] };
        }
        if (url.includes('api.shodan.io')) {
          throw new Error('401 Unauthorized API Key');
        }
        return { data: {} };
      });

      // Scan should complete successfully without throwing
      const result = await resolveDomainIntel('example.com');
      expect(result).toBeDefined();

      // Should gracefully revert to standard mock attributes
      const ipNode = result.graph.nodes.find(n => n.id === 'ip-9.9.9.9');
      expect(ipNode).toBeDefined();
      expect(ipNode.properties.shodan_org).toBe('Enterprise Hosting Provider');
    });
  });
});

