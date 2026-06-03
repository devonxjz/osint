// backend/username/orchestrator.ts
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakers = void 0;
exports.orchestrateScan = orchestrateScan;
const scanner_1 = require("./scanner");
// Global/Module-level state for circuit breakers
exports.circuitBreakers = {}; // key: platformName -> { consecutiveFailures: number, trippedUntil: number }
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function orchestrateScan(target, platforms, callbacks, options = {}) {
    // Concurrency Lane defaults with backwards compatible fallbacks
    const apiConcurrency = options.apiConcurrency || 30;
    const htmlConcurrency = options.htmlConcurrency || options.maxConcurrency || 15;
    const highRiskConcurrency = options.highRiskConcurrency || 3;
    const browserConcurrency = options.browserConcurrency || 2;
    const retryAttempts = options.retryAttempts !== undefined ? options.retryAttempts : 2;
    const retryBaseDelayMs = options.retryBaseDelayMs !== undefined ? options.retryBaseDelayMs : 500;
    const cache = options.cache;
    const signal = options.signal;
    const startTime = Date.now();
    const total = platforms.length;
    let completed = 0;
    let foundCount = 0;
    const isAborted = () => signal && signal.aborted;
    let sharedBrowser = null;
    let sharedContext = null;
    let sessionProxyOverride = undefined;
    let sessionBlockedCount = 0;
    // 1. Check cache first
    const remainingPlatforms = [];
    for (const platform of platforms) {
        if (isAborted())
            break;
        const cacheKey = `${target}::${platform.name}`;
        if (cache) {
            const cached = cache.get(cacheKey);
            if (cached) {
                completed++;
                if (cached.status === 'FOUND') {
                    foundCount++;
                }
                callbacks.onResult(cached);
                callbacks.onProgress({
                    completed,
                    total,
                    percentage: parseFloat(((completed / total) * 100).toFixed(1))
                });
                continue;
            }
        }
        remainingPlatforms.push(platform);
    }
    if (remainingPlatforms.length === 0 || isAborted()) {
        return {
            foundCount,
            timeTakenMs: Date.now() - startTime
        };
    }
    // 2. Classify platforms into specialized lanes
    const isHighRisk = (p) => {
        const rawP = p;
        return rawP.riskLevel === 'HIGH' || rawP.requiresProxy === true || rawP.category === 'DarkWeb';
    };
    const apiPlatforms = remainingPlatforms.filter(p => p.checkType === 'api');
    const browserPlatforms = remainingPlatforms.filter(p => p.checkType === 'browser');
    // HTML platforms are further split into standard vs high risk for backwards compatibility and safety
    const standardHtmlPlatforms = remainingPlatforms.filter(p => p.checkType !== 'api' && p.checkType !== 'browser' && !isHighRisk(p));
    const highRiskHtmlPlatforms = remainingPlatforms.filter(p => p.checkType !== 'api' && p.checkType !== 'browser' && isHighRisk(p));
    // 3. Execution Lane Engine
    async function runLane(platformList, laneConcurrency) {
        if (platformList.length === 0)
            return;
        let index = 0;
        async function worker() {
            while (index < platformList.length && !isAborted()) {
                const currentIdx = index++;
                const platform = platformList[currentIdx];
                // Introduce randomized request delay (jitter) to prevent burst rate limit triggers
                if (currentIdx > 0 && !isAborted() && process.env.NODE_ENV !== 'test') {
                    const jitterDelay = Math.floor(Math.random() * 250) + 50; // 50ms to 300ms random delay
                    await delay(jitterDelay);
                }
                // Check Circuit Breaker
                const cbState = exports.circuitBreakers[platform.name];
                if (cbState && cbState.trippedUntil && Date.now() < cbState.trippedUntil) {
                    completed++;
                    callbacks.onProgress({
                        completed,
                        total,
                        percentage: parseFloat(((completed / total) * 100).toFixed(1))
                    });
                    callbacks.onError(platform.name, 'CIRCUIT_OPEN');
                    continue;
                }
                let result = null;
                let success = false;
                let attempt = 0;
                const cookies = options.cookies || {};
                while (attempt <= retryAttempts && !success && !isAborted()) {
                    try {
                        if (options.session?.shouldUseProxy() && !sessionProxyOverride) {
                            sessionProxyOverride = process.env.PROXY_POOL_URL;
                        }
                        result = await (0, scanner_1.scanPlatform)(target, platform, cookies, signal, {
                            sharedContext,
                            proxyUrl: sessionProxyOverride,
                            session: options.session
                        });
                        // Check if WAF block is identified
                        const isBlocked = result.error === 'BLOCKED_BY_WAF' ||
                            (result.status === 'NOT_FOUND' && (result.error?.includes('403') ||
                                result.error?.includes('429') ||
                                result.error?.includes('ECONNRESET') ||
                                result.error?.includes('connection reset') ||
                                result.body?.includes('cf-challenge') ||
                                result.body?.includes('Just a moment...')));
                        if (isBlocked && process.env.PROXY_POOL_URL) {
                            sessionBlockedCount++;
                            if (options.session) {
                                options.session.recordWAFHit();
                            }
                            // Perform per-platform instant retry first if session-wide override is not yet active
                            if (!sessionProxyOverride) {
                                console.log(`[orchestrateScan] WAF block detected on ${platform.name}. Retrying this specific platform with proxy...`);
                                try {
                                    result = await (0, scanner_1.scanPlatform)(target, platform, cookies, signal, {
                                        sharedContext,
                                        proxyUrl: process.env.PROXY_POOL_URL,
                                        session: options.session
                                    });
                                }
                                catch (retryErr) {
                                    // ignore, original result remains
                                }
                            }
                            // Only activate session-wide proxy if threshold is met
                            if ((sessionBlockedCount >= 3 || options.session?.shouldUseProxy()) && !sessionProxyOverride) {
                                console.log(`[orchestrateScan] WAF block threshold (>=3) reached. Activating session-wide proxy pool for subsequent requests.`);
                                sessionProxyOverride = process.env.PROXY_POOL_URL;
                            }
                        }
                        // Check for permanent vs transient failure inside resolved result
                        if (result.error === 'MISSING_SESSION_CREDENTIALS' || result.status === 'FOUND' || !result.error) {
                            success = true;
                        }
                        else {
                            attempt++;
                            if (attempt <= retryAttempts && !isAborted()) {
                                const jitter = 100;
                                const backoffDelay = retryBaseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * jitter);
                                await delay(backoffDelay);
                            }
                        }
                    }
                    catch (err) {
                        if (isAborted())
                            break;
                        attempt++;
                        if (attempt <= retryAttempts && !isAborted()) {
                            const jitter = 100;
                            const backoffDelay = retryBaseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * jitter);
                            await delay(backoffDelay);
                        }
                        else {
                            result = {
                                platform: platform.name,
                                status: 'NOT_FOUND',
                                url: platform.url ? platform.url.replace('{}', encodeURIComponent(target)) : '',
                                error: err.message
                            };
                        }
                    }
                }
                if (isAborted())
                    break;
                completed++;
                // Handle Circuit Breaker State based on success
                const hasFailed = !success || (result && result.error && result.error !== 'MISSING_SESSION_CREDENTIALS');
                if (hasFailed) {
                    if (!exports.circuitBreakers[platform.name]) {
                        exports.circuitBreakers[platform.name] = { consecutiveFailures: 0, trippedUntil: 0 };
                    }
                    exports.circuitBreakers[platform.name].consecutiveFailures++;
                    if (exports.circuitBreakers[platform.name].consecutiveFailures >= 3) {
                        // Trip circuit for 60 seconds
                        exports.circuitBreakers[platform.name].trippedUntil = Date.now() + 60000;
                    }
                }
                else {
                    // Reset circuit state on success
                    if (exports.circuitBreakers[platform.name]) {
                        exports.circuitBreakers[platform.name].consecutiveFailures = 0;
                        exports.circuitBreakers[platform.name].trippedUntil = 0;
                    }
                }
                if (result) {
                    if (result.status === 'FOUND') {
                        foundCount++;
                    }
                    if (cache && !hasFailed) {
                        cache.set(`${target}::${platform.name}`, result);
                    }
                    callbacks.onResult(result);
                }
                else {
                    callbacks.onError(platform.name, 'UNKNOWN_ERROR');
                }
                callbacks.onProgress({
                    completed,
                    total,
                    percentage: parseFloat(((completed / total) * 100).toFixed(1))
                });
            }
        }
        const workers = [];
        const workerCount = Math.min(laneConcurrency, platformList.length);
        for (let i = 0; i < workerCount; i++) {
            workers.push(worker());
        }
        await Promise.all(workers);
    }
    // Run all four concurrency lanes in parallel
    // Order of scheduling guarantees standard HTML runs before high-risk for executionOrder testing
    try {
        if (browserPlatforms.length > 0 && !process.env.VERCEL) {
            try {
                const playwright = require('playwright');
                sharedBrowser = await playwright.chromium.launch({
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-blink-features=AutomationControlled'
                    ]
                });
                sharedContext = await sharedBrowser.newContext({
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    locale: 'en-US',
                    viewport: { width: 1280, height: 720 },
                    deviceScaleFactor: 1,
                    isMobile: false,
                    hasTouch: false
                });
                // Inject standard stealth properties inside context before scan starts (navigator.webdriver = false, WebGL, Canvas)
                const sessionSeed = Math.floor(Math.random() * 256);
                await sharedContext.addInitScript((seed) => {
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    // WebGL spoofing
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function (parameter) {
                        if (parameter === 37445)
                            return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                        if (parameter === 37446)
                            return 'Intel(R) Iris(TM) Plus Graphics 640'; // UNMASKED_RENDERER_WEBGL
                        return getParameter.apply(this, [parameter]);
                    };
                    // Canvas math noise spoofing
                    const getImageData = CanvasRenderingContext2D.prototype.getImageData;
                    CanvasRenderingContext2D.prototype.getImageData = function (x, y, w, h) {
                        const imageData = getImageData.apply(this, [x, y, w, h]);
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            const offset = (seed + i + Math.floor(Math.random() * 3)) % 3;
                            imageData.data[i] = (imageData.data[i] + offset) % 256;
                        }
                        return imageData;
                    };
                }, sessionSeed);
            }
            catch (e) {
                console.error('[orchestrateScan] Playwright failed to initialize shared browser context', e);
            }
        }
        await Promise.all([
            runLane(apiPlatforms, apiConcurrency),
            runLane(standardHtmlPlatforms, htmlConcurrency),
            runLane(highRiskHtmlPlatforms, highRiskConcurrency),
            runLane(browserPlatforms, browserConcurrency)
        ]);
    }
    finally {
        if (sharedBrowser) {
            try {
                await sharedBrowser.close();
            }
            catch (e) {
                // ignore
            }
        }
    }
    return {
        foundCount,
        timeTakenMs: Date.now() - startTime
    };
}
