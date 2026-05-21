// backend/src/index.js

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { analyzeInput } = require('./analyzer');
const { getPlatforms, getAllPlatforms, getCategories } = require('./registry');
const { scanPlatform } = require('./scanner');
const { SSEStreamManager } = require('./sseManager');
const { ResultCache } = require('./cache');
const { orchestrateScan } = require('./orchestrator');
const { orchestrateEmailScan } = require('./email/email_orchestrator');
const { generateDossierPDF } = require('./email/pdf_generator');
const { orchestratePhoneScan } = require('./phone/phone_orchestrator');

const scanCache = new ResultCache({
  maxSize: 1000,
  defaultTtlMs: 3600000 // 1 hour TTL
});

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());

/**
 * GET /api/platforms
 * Exposes all platforms configurations dynamically
 */
app.get('/api/platforms', (req, res) => {
  res.json(getAllPlatforms());
});

/**
 * GET /api/categories
 * Exposes all active registry categories dynamically
 */
app.get('/api/categories', (req, res) => {
  res.json(getCategories());
});

/**
 * GET /api/session-status
 * Returns a secure boolean mapping indicating which session cookie keys are configured
 */
app.get('/api/session-status', (req, res) => {
  const keys = ['FACEBOOK_COOKIE_KEY', 'INSTAGRAM_COOKIE_KEY', 'LINKEDIN_COOKIE_KEY', 'DOUYIN_COOKIE_KEY'];
  const status = {};
  keys.forEach(k => {
    status[k] = !!process.env[k];
  });
  res.json(status);
});

/**
 * Server-Sent Events (SSE) endpoint for real-time username scraping.
 * GET /api/scan?target=john_doe&categories=Tech,Social
 */
app.get('/api/scan', async (req, res) => {
  const { target, categories, cookies } = req.query;
  let cookieOverrides = {};
  if (cookies) {
    try {
      cookieOverrides = JSON.parse(cookies);
    } catch (e) {
      // Ignore parsing errors gracefully
    }
  }

  const sse = new SSEStreamManager(res);
  sse.init();

  const abortController = new AbortController();

  req.on('close', () => {
    abortController.abort();
    sse.cleanup();
    console.log('Client closed connection. Aborting scan process.');
  });

  // 2. Validate and sanitize raw query target parameter
  const analysis = analyzeInput(target);
  if (!analysis.valid) {
    sse.send('error', { message: analysis.error || 'Invalid target format' });
    sse.end();
    return;
  }

  // 3. Resolve target platforms using selected categories
  const resolvedCats = categories ? categories.split(',').map(c => c.trim()) : [];
  const platforms = getPlatforms(resolvedCats);

  if (platforms.length === 0) {
    sse.send('error', { message: 'No target platforms matched the selected categories.' });
    sse.end();
    return;
  }

  const total = platforms.length;

  // Send initial progress
  sse.send('progress', { completed: 0, total, percentage: 0 });

  try {
    const summary = await orchestrateScan(
      analysis.sanitized,
      platforms,
      {
        onResult: (result) => {
          sse.send('result', result);
        },
        onProgress: (progress) => {
          sse.send('progress', progress);
        },
        onError: (platformName, errMsg) => {
          sse.send('result', {
            platform: platformName,
            status: 'NOT_FOUND',
            url: '',
            error: errMsg
          });
        }
      },
      {
        maxConcurrency: 20,
        highRiskConcurrency: 3,
        cache: scanCache,
        signal: abortController.signal
      }
    );

    if (!abortController.signal.aborted) {
      sse.send('end', { summary });
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      sse.send('error', { message: err.message });
    }
  } finally {
    sse.end();
  }
});

/**
 * SSE endpoint for real-time email OSINT scanning.
 * GET /api/scan-email?target=user@example.com
 */
app.get('/api/scan-email', async (req, res) => {
  const { target } = req.query;
  const sse = new SSEStreamManager(res);
  sse.init();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
    sse.cleanup();
  });

  if (!target || typeof target !== 'string' || !target.includes('@')) {
    sse.send('error', { message: 'Invalid email address' });
    sse.end();
    return;
  }

  try {
    const dossier = await orchestrateEmailScan(target.trim(), {
      onEvent: (event) => {
        if (!abortController.signal.aborted) {
          sse.send('result', event);
        }
      },
      hibpApiKey: process.env.HIBP_API_KEY || null,
    });

    if (!abortController.signal.aborted) {
      sse.send('end', { dossier });
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      sse.send('error', { message: err.message });
    }
  } finally {
    sse.end();
  }
});

/**
 * SSE endpoint for real-time phone OSINT scanning.
 * GET /api/scan-phone?target=+84987654321
 */
app.get('/api/scan-phone', async (req, res) => {
  const { target } = req.query;
  const sse = new SSEStreamManager(res);
  sse.init();

  const abortController = new AbortController();
  req.on('close', () => {
    abortController.abort();
    sse.cleanup();
  });

  if (!target || typeof target !== 'string') {
    sse.send('error', { message: 'Invalid phone number target' });
    sse.end();
    return;
  }

  try {
    const dossier = await orchestratePhoneScan(target.trim(), {
      onEvent: (event) => {
        if (!abortController.signal.aborted) {
          sse.send('result', event);
        }
      }
    });

    if (!abortController.signal.aborted) {
      sse.send('end', { dossier });
    }
  } catch (err) {
    if (!abortController.signal.aborted) {
      sse.send('error', { message: err.message });
    }
  } finally {
    sse.end();
  }
});


/**
 * POST /api/dossier — Generate and download PDF dossier.
 * Accepts the consolidated dossier JSON in request body.
 */
app.post('/api/dossier', async (req, res) => {
  try {
    const dossier = req.body;
    if (!dossier || (!dossier.email && !dossier.phone)) {
      return res.status(400).json({ error: 'Missing dossier data' });
    }

    const pdfBuffer = await generateDossierPDF(dossier);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dossier_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Listener only when run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[OSINT Backend] Server listening on port ${PORT}`);
  });
}

module.exports = app; // Export for API testing
