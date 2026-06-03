'use strict';

jest.setTimeout(20000);

const http = require('http');
const { EvasionClient } = require('../dist-backend/username/engines/evasionClient');

describe('EvasionClient - Header Ordering (Tracer Bullet)', () => {
  let server;
  let port;
  let lastRequestHeaders = null;

  beforeAll((done) => {
    server = http.createServer((req, res) => {
      lastRequestHeaders = req.rawHeaders;
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  test('sends headers in the exact Chrome-compliant order', async () => {
    const client = new EvasionClient();
    const chromeHeaders = {
      'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121"',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'accept': 'text/html,application/xhtml+xml',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9',
    };

    await client.request(`http://127.0.0.1:${port}`, { headers: chromeHeaders });

    expect(lastRequestHeaders).not.toBeNull();
    
    // Check order of keys in req.rawHeaders (even indices are keys, odd indices are values)
    const keys = [];
    for (let i = 0; i < lastRequestHeaders.length; i += 2) {
      keys.push(lastRequestHeaders[i].toLowerCase());
    }

    // Filter to only the keys we sent to verify ordering
    const targetKeys = Object.keys(chromeHeaders).map(k => k.toLowerCase());
    const relevantKeys = keys.filter(k => targetKeys.includes(k));
    
    expect(relevantKeys).toEqual(targetKeys);
  });
});
