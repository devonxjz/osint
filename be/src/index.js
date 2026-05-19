// backend/src/index.js

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { analyzeInput } = require('./analyzer');
const { getPlatforms } = require('./registry');
const { scanPlatform } = require('./scanner');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

/**
 * Server-Sent Events (SSE) endpoint for real-time username scraping.
 * GET /api/scan?target=john_doe&categories=Tech,Social
 */
app.get('/api/scan', async (req, res) => {
  const { target, categories } = req.query;

  // 1. Configure robust SSE headers to keep persistent downstream channel open
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Prevent Nginx proxy buffering
  });

  // Heartbeat ping interval to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(':\n\n');
  }, 15000);

  let isAborted = false;
  req.on('close', () => {
    isAborted = true;
    clearInterval(heartbeatInterval);
    console.log('Client closed connection. Aborting scan process.');
  });

  // SSE write helper following the standard format: event: [TYPE]\ndata: [JSON]\n\n
  const sendSSE = (event, data) => {
    if (isAborted) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // 2. Validate and sanitize raw query target parameter using Module 1
  const analysis = analyzeInput(target);
  if (!analysis.valid) {
    sendSSE('error', { message: analysis.error || 'Invalid target format' });
    clearInterval(heartbeatInterval);
    res.end();
    return;
  }

  // 3. Resolve target platforms using Module 2 and selected categories
  const resolvedCats = categories ? categories.split(',').map(c => c.trim()) : [];
  const platforms = getPlatforms(resolvedCats);

  if (platforms.length === 0) {
    sendSSE('error', { message: 'No target platforms matched the selected categories.' });
    clearInterval(heartbeatInterval);
    res.end();
    return;
  }

  const total = platforms.length;
  let completed = 0;
  let foundCount = 0;
  const startTime = Date.now();

  // Send initial progress
  sendSSE('progress', { completed: 0, total, percentage: 0 });

  // 4. Batch concurrency chunking loop: 15 queries in parallel with 100ms throttle delay
  const BATCH_SIZE = 15;
  const THROTTLE_DELAY = 100;

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < total; i += BATCH_SIZE) {
    if (isAborted) break;

    const chunk = platforms.slice(i, i + BATCH_SIZE);

    const scanPromises = chunk.map(async (platform) => {
      if (isAborted) return;
      try {
        const result = await scanPlatform(analysis.sanitized, platform);

        if (isAborted) return;
        completed++;
        if (result.status === 'FOUND') {
          foundCount++;
        }

        // Stream completed scan result immediately
        sendSSE('result', result);

        // Stream current progress metrics
        sendSSE('progress', {
          completed,
          total,
          percentage: parseFloat(((completed / total) * 100).toFixed(1))
        });
      } catch (err) {
        if (isAborted) return;
        completed++;
        sendSSE('result', {
          platform: platform.name,
          status: 'NOT_FOUND',
          url: platform.url.replace('{}', encodeURIComponent(analysis.sanitized)),
          error: err.message
        });
        sendSSE('progress', {
          completed,
          total,
          percentage: parseFloat(((completed / total) * 100).toFixed(1))
        });
      }
    });

    // Wait for current batch chunk to finish
    await Promise.all(scanPromises);

    // Apply throttle delay if more platforms are remaining
    if (i + BATCH_SIZE < total && !isAborted) {
      await delay(THROTTLE_DELAY);
    }
  }

  // 5. Send final summary event on complete
  if (!isAborted) {
    sendSSE('end', {
      summary: {
        foundCount,
        timeTakenMs: Date.now() - startTime
      }
    });
  }

  clearInterval(heartbeatInterval);
  res.end();
});

// Start Express Listener only when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[OSINT Backend] Server listening on port ${PORT}`);
  });
}

module.exports = app; // Export for API testing
