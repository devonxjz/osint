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
                while (attempt <= retryAttempts && !success && !isAborted()) {
                    try {
                        result = await (0, scanner_1.scanPlatform)(target, platform, {}, signal);
                        // Check for permanent vs transient failure inside resolved result
                        if (result.error === 'MISSING_SESSION_CREDENTIALS' || result.status === 'FOUND' || !result.error) {
                            success = true;
                        }
                        else {
                            attempt++;
                            if (attempt <= retryAttempts && !isAborted()) {
                                await delay(retryBaseDelayMs * Math.pow(2, attempt - 1));
                            }
                        }
                    }
                    catch (err) {
                        if (isAborted())
                            break;
                        attempt++;
                        if (attempt <= retryAttempts && !isAborted()) {
                            await delay(retryBaseDelayMs * Math.pow(2, attempt - 1));
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
    await Promise.all([
        runLane(apiPlatforms, apiConcurrency),
        runLane(standardHtmlPlatforms, htmlConcurrency),
        runLane(highRiskHtmlPlatforms, highRiskConcurrency),
        runLane(browserPlatforms, browserConcurrency)
    ]);
    return {
        foundCount,
        timeTakenMs: Date.now() - startTime
    };
}
