// backend/index.ts
'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const shared_1 = require("./shared");
const username_1 = require("./username");
const email_1 = require("./email");
const phone_1 = require("./phone");
const realname_1 = require("./realname");
const domain_1 = require("./domain");
const scanCache = new shared_1.ResultCache({
    maxSize: 1000,
    defaultTtlMs: 3600000 // 1 hour TTL
});
const app = (0, express_1.default)();
// Standard middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
/**
 * GET /api/platforms
 * Exposes all platforms configurations dynamically
 */
app.get('/api/platforms', (req, res) => {
    res.json((0, username_1.getAllPlatforms)());
});
/**
 * GET /api/categories
 * Exposes all active registry categories dynamically
 */
app.get('/api/categories', (req, res) => {
    res.json((0, username_1.getCategories)());
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
    const target = req.query.target;
    const categories = req.query.categories;
    const cookies = req.query.cookies;
    let cookieOverrides = {};
    if (cookies) {
        try {
            cookieOverrides = JSON.parse(cookies);
        }
        catch (e) {
            // Ignore parsing errors gracefully
        }
    }
    const analysis = (0, shared_1.analyzeInput)(target);
    // Raw Scanner Mode: Return browser-like JSON responses directly without Svelte/SSE
    if (analysis.valid && analysis.type === 'SCANNER') {
        const innerAnalysis = (0, shared_1.analyzeInput)(analysis.sanitized);
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
            const session = new shared_1.ScanSession();
            if (innerAnalysis.type === 'EMAIL') {
                const dossier = await (0, email_1.orchestrateEmailScan)(innerAnalysis.sanitized, {
                    onEvent: () => { },
                    hibpApiKey: process.env.HIBP_API_KEY || null,
                    session,
                });
                res.json({ type: 'EMAIL', target: innerAnalysis.sanitized, dossier });
                return;
            }
            if (innerAnalysis.type === 'PHONE') {
                const dossier = await (0, phone_1.orchestratePhoneScan)(innerAnalysis.sanitized, {
                    onEvent: () => { },
                    session,
                });
                res.json({ type: 'PHONE', target: innerAnalysis.sanitized, dossier });
                return;
            }
            if (innerAnalysis.type === 'REAL_NAME') {
                const results = [];
                const dossier = await (0, realname_1.scanIdentity)(innerAnalysis.sanitized, {
                    deepScan: req.query.deep_scan === 'true',
                    cookies: cookieOverrides,
                    onResult: (resVal) => { results.push(resVal); },
                    onProgress: () => { },
                    session,
                }, abortController.signal);
                res.json({ type: 'REAL_NAME', target: innerAnalysis.sanitized, dossier, results });
                return;
            }
            if (innerAnalysis.type === 'DOMAIN') {
                const results = [];
                const dossier = await (0, domain_1.resolveDomainIntel)(innerAnalysis.sanitized, {
                    onResult: (resVal) => { results.push(resVal); },
                    onProgress: () => { },
                    session,
                }, abortController.signal);
                res.json({ type: 'DOMAIN', target: innerAnalysis.sanitized, dossier, results });
                return;
            }
            // Default: USERNAME
            const resolvedCats = categories ? categories.split(',').map(c => c.trim()) : [];
            const platforms = (0, username_1.getPlatforms)(resolvedCats);
            const results = [];
            const summary = await (0, username_1.orchestrateScan)(innerAnalysis.sanitized, platforms, {
                onResult: (resVal) => { results.push(resVal); },
                onProgress: () => { },
                onError: (platformName, errMsg) => {
                    results.push({
                        platform: platformName,
                        status: 'NOT_FOUND',
                        url: '',
                        error: errMsg
                    });
                }
            }, {
                maxConcurrency: 20,
                highRiskConcurrency: 3,
                cache: scanCache,
                signal: abortController.signal,
                cookies: cookieOverrides,
                session
            });
            res.json({ type: 'USERNAME', target: innerAnalysis.sanitized, summary, results });
            return;
        }
        catch (err) {
            res.status(500).json({ error: err.message });
            return;
        }
    }
    const sse = new shared_1.SSEStreamManager(res);
    sse.init();
    const abortController = new AbortController();
    req.on('close', () => {
        abortController.abort();
        sse.cleanup();
        console.log('Client closed connection. Aborting scan process.');
    });
    // 2. Validate and sanitize raw query target parameter
    if (!analysis.valid) {
        sse.send('error', { message: analysis.error || 'Invalid target format' });
        sse.end();
        return;
    }
    const session = new shared_1.ScanSession();
    // ─── Unified Routing Map ───
    // A. EMAIL Target Scan
    if (analysis.type === 'EMAIL') {
        try {
            const dossier = await (0, email_1.orchestrateEmailScan)(analysis.sanitized, {
                onEvent: (event) => {
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
        }
        catch (err) {
            if (!abortController.signal.aborted) {
                sse.send('error', { message: err.message });
            }
        }
        finally {
            sse.end();
        }
        return;
    }
    // B. PHONE Target Scan
    if (analysis.type === 'PHONE') {
        try {
            const dossier = await (0, phone_1.orchestratePhoneScan)(analysis.sanitized, {
                onEvent: (event) => {
                    if (!abortController.signal.aborted) {
                        sse.send('result', event);
                    }
                },
                session,
            });
            if (!abortController.signal.aborted) {
                sse.send('end', { dossier });
            }
        }
        catch (err) {
            if (!abortController.signal.aborted) {
                sse.send('error', { message: err.message });
            }
        }
        finally {
            sse.end();
        }
        return;
    }
    // C. REAL_NAME Target Scan
    if (analysis.type === 'REAL_NAME') {
        try {
            const dossier = await (0, realname_1.scanIdentity)(analysis.sanitized, {
                deepScan: req.query.deep_scan === 'true',
                cookies: cookieOverrides,
                onResult: (result) => {
                    if (!abortController.signal.aborted) {
                        sse.send('result', result);
                    }
                },
                onProgress: (progress) => {
                    if (!abortController.signal.aborted) {
                        sse.send('progress', progress);
                    }
                },
                session,
            }, abortController.signal);
            if (!abortController.signal.aborted) {
                sse.send('end', { dossier });
            }
        }
        catch (err) {
            if (!abortController.signal.aborted) {
                sse.send('error', { message: err.message });
            }
        }
        finally {
            sse.end();
        }
        return;
    }
    // D. DOMAIN Target Scan
    if (analysis.type === 'DOMAIN') {
        try {
            const dossier = await (0, domain_1.resolveDomainIntel)(analysis.sanitized, {
                onResult: (result) => {
                    if (!abortController.signal.aborted) {
                        sse.send('result', result);
                    }
                },
                onProgress: (progress) => {
                    if (!abortController.signal.aborted) {
                        sse.send('progress', progress);
                    }
                },
                session,
            }, abortController.signal);
            if (!abortController.signal.aborted) {
                sse.send('end', { dossier });
            }
        }
        catch (err) {
            if (!abortController.signal.aborted) {
                sse.send('error', { message: err.message });
            }
        }
        finally {
            sse.end();
        }
        return;
    }
    // E. USERNAME Target Scan (Default Fallback)
    const resolvedCats = categories ? categories.split(',').map(c => c.trim()) : [];
    const platforms = (0, username_1.getPlatforms)(resolvedCats);
    if (platforms.length === 0) {
        sse.send('error', { message: 'No target platforms matched the selected categories.' });
        sse.end();
        return;
    }
    const total = platforms.length;
    // Send initial progress
    sse.send('progress', { completed: 0, total, percentage: 0 });
    try {
        const summary = await (0, username_1.orchestrateScan)(analysis.sanitized, platforms, {
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
        }, {
            maxConcurrency: 20,
            highRiskConcurrency: 3,
            cache: scanCache,
            signal: abortController.signal,
            cookies: cookieOverrides,
            session
        });
        if (!abortController.signal.aborted) {
            sse.send('end', { summary });
        }
    }
    catch (err) {
        if (!abortController.signal.aborted) {
            sse.send('error', { message: err.message });
        }
    }
    finally {
        sse.end();
    }
});
/**
 * SSE endpoint for real-time email OSINT scanning.
 * GET /api/scan-email?target=user@example.com
 */
app.get('/api/scan-email', async (req, res) => {
    const target = req.query.target;
    const sse = new shared_1.SSEStreamManager(res);
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
        const session = new shared_1.ScanSession();
        const dossier = await (0, email_1.orchestrateEmailScan)(target.trim(), {
            onEvent: (event) => {
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
    }
    catch (err) {
        if (!abortController.signal.aborted) {
            sse.send('error', { message: err.message });
        }
    }
    finally {
        sse.end();
    }
});
/**
 * SSE endpoint for real-time phone OSINT scanning.
 * GET /api/scan-phone?target=+84987654321
 */
app.get('/api/scan-phone', async (req, res) => {
    const target = req.query.target;
    const sse = new shared_1.SSEStreamManager(res);
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
        const session = new shared_1.ScanSession();
        const dossier = await (0, phone_1.orchestratePhoneScan)(target.trim(), {
            onEvent: (event) => {
                if (!abortController.signal.aborted) {
                    sse.send('result', event);
                }
            },
            session,
        });
        if (!abortController.signal.aborted) {
            sse.send('end', { dossier });
        }
    }
    catch (err) {
        if (!abortController.signal.aborted) {
            sse.send('error', { message: err.message });
        }
    }
    finally {
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
        const pdfBuffer = await (0, email_1.generateDossierPDF)(dossier);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="dossier_${Date.now()}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (err) {
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
exports.default = app;
