// backend/index.ts

'use strict';

import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import { analyzeInput, SSEStreamManager, ResultCache, ScanSession } from './shared';
import { orchestrateScan, getAllPlatforms, getPlatforms, getCategories } from './username';
import { orchestrateEmailScan, generateDossierPDF } from './email';
import { orchestratePhoneScan } from './phone';
import { scanIdentity } from './realname';
import { resolveDomainIntel } from './domain';

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
app.get('/api/platforms', (req: Request, res: Response) => {
  res.json(getAllPlatforms());
});

/**
 * GET /api/categories
 * Exposes all active registry categories dynamically
 */
app.get('/api/categories', (req: Request, res: Response) => {
  res.json(getCategories());
});

/**
 * GET /api/session-status
 * Returns a secure boolean mapping indicating which session cookie keys are configured
 */
app.get('/api/session-status', (req: Request, res: Response) => {
  const keys = ['FACEBOOK_COOKIE_KEY', 'INSTAGRAM_COOKIE_KEY', 'LINKEDIN_COOKIE_KEY', 'DOUYIN_COOKIE_KEY'];
  const status: Record<string, boolean> = {};
  keys.forEach(k => {
    status[k] = !!process.env[k];
  });
  res.json(status);
});

/**
 * Server-Sent Events (SSE) endpoint for real-time username scraping.
 * GET /api/scan?target=john_doe&categories=Tech,Social
 */
app.get('/api/scan', async (req: Request, res: Response): Promise<void> => {
  const target = req.query.target as string;
  const categories = req.query.categories as string;
  const cookies = req.query.cookies as string;

  let cookieOverrides: Record<string, string> = {};
  if (cookies) {
    try {
      cookieOverrides = JSON.parse(cookies);
    } catch (e) {
      // Ignore parsing errors gracefully
    }
  }

  const analysis = analyzeInput(target);

  // Raw Scanner Mode: Return browser-like JSON responses directly without Svelte/SSE
  if (analysis.valid && analysis.type === 'SCANNER') {
    const innerAnalysis = analyzeInput(analysis.sanitized);
    if (!innerAnalysis.valid) {
      res.status(400).json({ error: innerAnalysis.error });
      return;
    }

    const abortController = new AbortController();
    req.on('close', () => {
      abortController.abort();
    });

    // Secure browser-mimicking headers
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    try {
      const session = new ScanSession();
      if (innerAnalysis.type === 'EMAIL') {
        const dossier = await orchestrateEmailScan(innerAnalysis.sanitized, {
          onEvent: () => {},
          hibpApiKey: process.env.HIBP_API_KEY || null,
          session,
        });
        res.json({ type: 'EMAIL', target: innerAnalysis.sanitized, dossier });
        return;
      }

      if (innerAnalysis.type === 'PHONE') {
        const dossier = await orchestratePhoneScan(innerAnalysis.sanitized, {
          onEvent: () => {},
          session,
        });
        res.json({ type: 'PHONE', target: innerAnalysis.sanitized, dossier });
        return;
      }

      if (innerAnalysis.type === 'REAL_NAME') {
        const results: any[] = [];
        const dossier = await scanIdentity(
          innerAnalysis.sanitized,
          {
            deepScan: req.query.deep_scan === 'true',
            cookies: cookieOverrides,
            onResult: (resVal: any) => { results.push(resVal); },
            onProgress: () => {},
            session,
          },
          abortController.signal
        );
        res.json({ type: 'REAL_NAME', target: innerAnalysis.sanitized, dossier, results });
        return;
      }

      if (innerAnalysis.type === 'DOMAIN') {
        const results: any[] = [];
        const dossier = await resolveDomainIntel(
          innerAnalysis.sanitized,
          {
            onResult: (resVal: any) => { results.push(resVal); },
            onProgress: () => {},
            session,
          },
          abortController.signal
        );
        res.json({ type: 'DOMAIN', target: innerAnalysis.sanitized, dossier, results });
        return;
      }

      // Default: USERNAME
      const resolvedCats = categories ? categories.split(',').map(c => c.trim()) : [];
      const platforms = getPlatforms(resolvedCats);
      const results: any[] = [];
      const summary = await orchestrateScan(
        innerAnalysis.sanitized,
        platforms as any,
        {
          onResult: (resVal: any) => { results.push(resVal); },
          onProgress: () => {},
          onError: (platformName: string, errMsg: string) => {
            results.push({
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
          signal: abortController.signal,
          cookies: cookieOverrides,
          session
        }
      );
      res.json({ type: 'USERNAME', target: innerAnalysis.sanitized, summary, results });
      return;

    } catch (err: any) {
      res.status(500).json({ error: err.message });
      return;
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
  if (!analysis.valid) {
    sse.send('error', { message: (analysis as any).error || 'Invalid target format' });
    sse.end();
    return;
  }

  const session = new ScanSession();

  // ─── Unified Routing Map ───

  // A. EMAIL Target Scan
  if (analysis.type === 'EMAIL') {
    try {
      const dossier = await orchestrateEmailScan(analysis.sanitized, {
        onEvent: (event: any) => {
          if (!abortController.signal.aborted) {
            sse.send('result', event);
          }
        },
        hibpApiKey: process.env.HIBP_API_KEY || null,
        session,
      });

      if (!abortController.signal.aborted) {
        sse.send('end', { dossier });
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        sse.send('error', { message: err.message });
      }
    } finally {
      sse.end();
    }
    return;
  }

  // B. PHONE Target Scan
  if (analysis.type === 'PHONE') {
    try {
      const dossier = await orchestratePhoneScan(analysis.sanitized, {
        onEvent: (event: any) => {
          if (!abortController.signal.aborted) {
            sse.send('result', event);
          }
        },
        session,
      });

      if (!abortController.signal.aborted) {
        sse.send('end', { dossier });
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        sse.send('error', { message: err.message });
      }
    } finally {
      sse.end();
    }
    return;
  }

  // C. REAL_NAME Target Scan
  if (analysis.type === 'REAL_NAME') {
    try {
      const dossier = await scanIdentity(
        analysis.sanitized,
        {
          deepScan: req.query.deep_scan === 'true',
          cookies: cookieOverrides,
          onResult: (result: any) => {
            if (!abortController.signal.aborted) {
              sse.send('result', result);
            }
          },
          onProgress: (progress: any) => {
            if (!abortController.signal.aborted) {
              sse.send('progress', progress);
            }
          },
          onVerified: (verified: any[]) => {
            if (!abortController.signal.aborted) {
              sse.send('verified', verified);
            }
          },
          session,
        },
        abortController.signal
      );

      if (!abortController.signal.aborted) {
        sse.send('end', { dossier });
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        sse.send('error', { message: err.message });
      }
    } finally {
      sse.end();
    }
    return;
  }

  // D. DOMAIN Target Scan
  if (analysis.type === 'DOMAIN') {
    try {
      const dossier = await resolveDomainIntel(
        analysis.sanitized,
        {
          onResult: (result: any) => {
            if (!abortController.signal.aborted) {
              sse.send('result', result);
            }
          },
          onProgress: (progress: any) => {
            if (!abortController.signal.aborted) {
              sse.send('progress', progress);
            }
          },
          session,
        },
        abortController.signal
      );

      if (!abortController.signal.aborted) {
        sse.send('end', { dossier });
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        sse.send('error', { message: err.message });
      }
    } finally {
      sse.end();
    }
    return;
  }

  // E. USERNAME Target Scan (Default Fallback)
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
      platforms as any,
      {
        onResult: (result: any) => {
          sse.send('result', result);
        },
        onProgress: (progress: any) => {
          sse.send('progress', progress);
        },
        onError: (platformName: string, errMsg: string) => {
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
        signal: abortController.signal,
        cookies: cookieOverrides,
        session
      }
    );

    if (!abortController.signal.aborted) {
      sse.send('end', { summary });
    }
  } catch (err: any) {
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
app.get('/api/scan-email', async (req: Request, res: Response): Promise<void> => {
  const target = req.query.target as string;
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
    const session = new ScanSession();
    const dossier = await orchestrateEmailScan(target.trim(), {
      onEvent: (event: any) => {
        if (!abortController.signal.aborted) {
          sse.send('result', event);
        }
      },
      hibpApiKey: process.env.HIBP_API_KEY || null,
      session,
    });

    if (!abortController.signal.aborted) {
      sse.send('end', { dossier });
    }
  } catch (err: any) {
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
app.get('/api/scan-phone', async (req: Request, res: Response): Promise<void> => {
  const target = req.query.target as string;
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
    const session = new ScanSession();
    const dossier = await orchestratePhoneScan(target.trim(), {
      onEvent: (event: any) => {
        if (!abortController.signal.aborted) {
          sse.send('result', event);
        }
      },
      session,
    });

    if (!abortController.signal.aborted) {
      sse.send('end', { dossier });
    }
  } catch (err: any) {
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
app.post('/api/dossier', async (req: Request, res: Response): Promise<any> => {
  try {
    const dossier = req.body;
    if (!dossier || (!dossier.email && !dossier.phone)) {
      return res.status(400).json({ error: 'Missing dossier data' });
    }

    const pdfBuffer = await generateDossierPDF(dossier);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dossier_${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Listener only when run directly
if ((require as any).main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`[OSINT Backend] Server listening on port ${PORT}`);
  });
}

export default app;
