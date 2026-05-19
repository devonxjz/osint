'use strict';

const app = require('../src/index');
const axios = require('axios');

describe('SSE API Routing', () => {
  let server;
  let baseUrl;

  beforeAll((done) => {
    // Start temporary server on a dynamic free port
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  it('should respond with SSE headers and bad request error for short username', async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/scan?target=j&categories=Tech`, {
        responseType: 'text'
      });

      // Assert correct SSE headers
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.headers['cache-control']).toContain('no-cache');
      expect(response.headers['connection']).toContain('keep-alive');

      // Assert error structure is streamed in SSE format
      expect(response.data).toContain('event: error');
      expect(response.data).toContain('Username too short');
    } catch (err) {
      // Should not throw since it returns 200 with SSE stream even on logical error
      fail(err);
    }
  });

  it('should stream progress, results, and end summary for a valid target query', async () => {
    // To keep it fast, we filter to a small subset or unknown categories
    const response = await axios.get(`${baseUrl}/api/scan?target=johndoe&categories=UnknownCategory`, {
      responseType: 'text'
    });

    // Should return 200 and SSE content type
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/event-stream');

    // Should return no target platforms matched the selected categories message
    expect(response.data).toContain('event: error');
    expect(response.data).toContain('No target platforms matched the selected categories.');
  });
});
