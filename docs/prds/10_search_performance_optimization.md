# PRD 10: Search Performance Optimization — Concurrent Processing & Caching

**Priority:** High  
**Branch:** `performance/optimize_search_engine`  
**Status:** Ready for Agent

---

## Problem Statement

The OSINT search engine currently scans 92+ platforms using a simple batched-sequential loop: chunks of 15 requests fire in parallel, then the system waits for the entire chunk to resolve before starting the next one. This creates several user-facing problems:

1. **Slow scan times.** A single slow or timed-out platform in a chunk blocks the remaining 14 from progressing. With default 5-second timeouts and 7 chunks, worst-case wall time exceeds 35 seconds.
2. **UI loading feels sluggish.** Results arrive in bursts (one chunk at a time) rather than streaming smoothly as individual platforms resolve.
3. **Timeout cascade on large scans.** When all categories are selected (92 platforms), late-responding platforms (DarkWeb: 15s timeout, regional servers) stall the entire pipeline.
4. **No caching.** Repeated searches for the same username re-scan every platform from scratch, wasting time and increasing rate-limit exposure.
5. **No retry resilience.** Transient network failures or WAF `429` responses are treated as permanent `NOT_FOUND`, causing false negatives.
6. **Tight coupling.** The scan orchestration logic, SSE connection management, and HTTP request execution are all interleaved inside a single Express route handler (`api/index.js` lines 51–185), making it impossible to test or tune any layer independently.
7. **Resource underutilization.** The fixed batch size of 15 doesn't adapt to platform risk profiles — low-risk `status:404` checks could safely run at higher concurrency, while high-risk WAF-protected platforms need throttling.

## Solution

Introduce a **concurrent worker pool architecture** with adaptive concurrency, per-platform retry logic, and an in-memory result cache — all hidden behind clean, testable module interfaces. From the user's perspective:

- Scans complete **2–4× faster** because platforms resolve independently without chunk-blocking.
- Results stream to the dashboard **immediately** as each platform resolves, not in batches.
- Repeated searches for the same target return **instantly** from cache.
- Transient failures are **automatically retried** with exponential backoff, reducing false negatives.
- The system **adapts concurrency** based on platform risk level — fast platforms scan aggressively, WAF-protected platforms scan cautiously.

## User Stories

1. As an investigator, I want scan results to appear on my dashboard immediately as each platform resolves, so that I can start analysis before the full scan completes.
2. As an investigator, I want the system to retry failed platform checks automatically, so that transient network errors don't produce false negatives in my report.
3. As a user, I want repeated searches for the same username to return instantly from cache, so that I don't wait for redundant network requests.
4. As a user, I want to see an estimated time remaining (ETA) during scans, so that I know how long to wait.
5. As a power user, I want scans across all 92+ platforms to complete in under 15 seconds on average, so that the tool feels responsive even at full scale.
6. As an investigator, I want the system to automatically reduce concurrency when platforms start rate-limiting, so that my IP doesn't get blocked mid-scan.
7. As a user, I want the progress bar to update smoothly rather than in sudden jumps, so that the UI feels alive and responsive.
8. As a privacy researcher, I want cached results to expire after a configurable TTL, so that I always get fresh data when I need it.
9. As a student, I want to cancel a running scan and have all in-flight requests terminate immediately, so that system resources are freed instantly.
10. As an analyst, I want the scan to prioritize low-risk platforms first, so that I get quick wins early while high-risk platforms are still being checked.
11. As a user, I want the system to distinguish between "platform is down" and "user not found", so that I can decide whether to re-scan later.
12. As an investigator, I want circuit breakers to temporarily skip platforms that are consistently failing, so that one broken platform doesn't slow down every scan.
13. As a user, I want the log console to show retry attempts in real time, so that I understand why a specific platform is taking longer.
14. As a developer, I want the scan orchestration logic to be testable independently of Express and SSE, so that I can write reliable unit tests.
15. As a developer, I want the cache layer to be a standalone module with a simple get/set/invalidate interface, so that I can swap implementations later (e.g., Redis).
16. As a user, I want the system to reuse HTTP connections across requests to the same domain, so that TCP/TLS handshake overhead is eliminated.
17. As an investigator, I want high-risk WAF-protected platforms (Facebook, Instagram, LinkedIn) to be scanned at lower concurrency than open platforms, so that session cookies aren't burned by rate limits.
18. As a user, I want the total scan time displayed in the summary to accurately reflect wall-clock time, so that I can benchmark performance improvements.
19. As a power user scanning the same target with different category filters, I want previously-cached platform results to be reused even when the category selection changes, so that only uncached platforms are re-scanned.
20. As a developer, I want the SSE connection lifecycle (heartbeat, abort detection, event serialization) extracted into its own module, so that the route handler stays focused on business logic.
21. As a user, I want the UI to batch rapid-fire SSE events into animation frames, so that the browser doesn't drop frames during high-frequency result streaming.
22. As an investigator, I want to see per-platform response times in the log console, so that I can identify which platforms are slow and adjust my category filters accordingly.

## Implementation Decisions

### Module 1: Scan Orchestrator (new — deep module)

Replaces the inline `for` loop in the `/api/scan` route handler. Encapsulates all concurrency strategy behind a single function call.

**Interface shape:**

```typescript
interface OrchestratorCallbacks {
  onResult: (result: ScanResult) => void;
  onProgress: (progress: ProgressEvent) => void;
  onError: (platform: string, error: string) => void;
}

interface OrchestratorOptions {
  maxConcurrency?: number;        // default: 20
  highRiskConcurrency?: number;   // default: 3
  retryAttempts?: number;         // default: 2
  retryBaseDelayMs?: number;      // default: 500
  cache?: ResultCache;            // optional cache instance
  signal?: AbortSignal;           // cancellation support
}

function orchestrateScan(
  target: string,
  platforms: Platform[],
  callbacks: OrchestratorCallbacks,
  options?: OrchestratorOptions
): Promise<ScanSummary>
```

**Key design decisions:**

- **Adaptive concurrency pool.** Two concurrency lanes: a fast lane (default 20 slots) for standard `status:404` platforms, and a slow lane (default 3 slots) for platforms with `riskLevel: 'HIGH'` or `requiresProxy: true`. Implemented via a simple semaphore counter — no external queue library needed.
- **Priority scheduling.** Platforms are sorted before execution: low-risk platforms first (quick `status` checks), then `text` checks, then `selector` checks, then high-risk WAF platforms last. This maximizes early result streaming.
- **Circuit breaker per-platform.** If a platform fails 3 consecutive times across different scans (tracked in module-level state), it is automatically skipped for 60 seconds. The orchestrator emits an `onError` callback with reason `CIRCUIT_OPEN` so the UI can display it.
- **Retry with exponential backoff.** Transient errors (network timeouts, HTTP 429, HTTP 503) trigger up to 2 retries with delays of 500ms → 1000ms. Non-retryable errors (HTTP 404, HTTP 403 from WAF) are returned immediately.
- **AbortController integration.** The orchestrator accepts an `AbortSignal` and propagates it to all in-flight Axios requests. When the user cancels, every pending HTTP call is terminated immediately.
- **Cache-aware.** Before making an HTTP request, the orchestrator checks the cache. Cached results are emitted via `onResult` immediately without consuming a concurrency slot.

### Module 2: Result Cache Layer (new — deep module)

In-memory LRU cache with TTL expiry. Designed for easy future replacement with Redis or any external store.

**Interface shape:**

```typescript
interface ResultCache {
  get(key: string): ScanResult | null;
  set(key: string, result: ScanResult, ttlMs?: number): void;
  invalidate(key: string): void;
  clear(): void;
  stats(): { hits: number; misses: number; size: number };
}

function createResultCache(options?: {
  maxSize?: number;        // default: 500
  defaultTtlMs?: number;   // default: 300_000 (5 min)
}): ResultCache
```

**Key design decisions:**

- **Cache key format:** `${username}::${platform.name}` — simple, collision-free.
- **LRU eviction.** When cache exceeds `maxSize`, the least-recently-accessed entry is evicted. Implemented using a `Map` (which preserves insertion order in JS) — delete-and-reinsert on access to maintain LRU ordering. No external dependency needed.
- **Per-entry TTL.** Each entry stores a `createdAt` timestamp. `get()` checks expiry and returns `null` for stale entries (lazy eviction). `NOT_FOUND` results use a shorter TTL (60s) than `FOUND` results (5min) since negative results are more likely to change.
- **Stats tracking.** Hit/miss counters for observability. Exposed via a future `/api/cache-stats` endpoint for debugging.
- **Thread-safe for Node.js.** Since Node.js is single-threaded for JS execution, no mutex is needed. The module is safe for concurrent async access.

### Module 3: Request Pipeline (modification to `api/scanner.js`)

Harden the existing `scanPlatform` function with connection pooling, retry support, and cancellation.

**Changes:**

- **Shared Axios instance with `keepAlive`.** Create a module-level Axios instance configured with `httpAgent: new http.Agent({ keepAlive: true, maxSockets: 30 })`. This reuses TCP connections across requests to the same host, eliminating repeated TLS handshakes.
- **AbortController propagation.** `scanPlatform` accepts an optional `AbortSignal` parameter. If the signal fires, the Axios request is cancelled immediately via Axios's `signal` config.
- **Per-platform timing.** `scanPlatform` now returns a `responseTimeMs` field in its result, measured via `Date.now()` before/after the request. This feeds into the frontend log console (User Story 22).
- **No retry logic here.** Retry is the orchestrator's responsibility (single responsibility). The scanner remains a pure "fire one request, return one result" function.

### Module 4: SSE Stream Manager (refactor — extract from `api/index.js`)

Extract SSE lifecycle management into a standalone utility so the route handler focuses on business logic.

**Responsibilities:**
- Write SSE headers, set up heartbeat interval, handle `req.on('close')`.
- Provide a `send(event, data)` method that no-ops after abort.
- Provide an `end()` method that cleans up the heartbeat and closes the response.
- Expose an `aborted` boolean and an `AbortSignal` that the orchestrator can consume.

The route handler (`/api/scan`) becomes ~20 lines: validate input → create SSE manager → call `orchestrateScan` with manager callbacks → done.

### Module 5: Frontend Scanner State (modification to `src/lib/scanner.svelte.ts`)

Improve the Svelte 5 reactive state to handle high-frequency SSE events without UI jank.

**Changes:**

- **Debounced progress updates.** Buffer incoming `progress` events and flush to reactive state at most once per animation frame (`requestAnimationFrame`). This prevents 92 reactive rerenders during a fast scan.
- **ETA calculation.** Track `startTime` and `completedCount` to derive `estimatedRemainingMs = (elapsed / completed) * remaining`. Display as "~Xs remaining" in the progress bar.
- **Per-platform timing display.** Show `responseTimeMs` from scanner results in the log console entries.
- **Batch log updates.** Accumulate log entries and push to the `logs` array in batches (every 100ms or every 5 entries) instead of one-by-one.

## Testing Decisions

### What makes a good test

Tests should verify **external behavior through the public interface**, not implementation details. A test should break only when the module's contract changes, never when internal refactoring occurs. Tests should be deterministic — no real network calls, no timers, no randomness.

### Modules to test

**1. Scan Orchestrator (`tests/orchestrator.test.js`)**

- Verify that all platforms are scanned and results are emitted via callbacks.
- Verify that concurrency is respected: mock `scanPlatform` with controlled delays and assert that no more than `maxConcurrency` calls are in-flight simultaneously.
- Verify that high-risk platforms use the slow concurrency lane.
- Verify retry behavior: mock a platform that fails once then succeeds, assert that the final result is `FOUND`.
- Verify cache integration: pre-populate cache, assert that cached platforms skip `scanPlatform` entirely.
- Verify cancellation: fire `AbortController.abort()` mid-scan, assert that the returned summary reflects partial completion and no further callbacks fire.
- Verify circuit breaker: simulate 3 consecutive failures for a platform, assert that the 4th scan skips it with `CIRCUIT_OPEN`.
- Verify priority ordering: assert that low-risk platforms' `onResult` callbacks fire before high-risk platforms'.

**2. Result Cache Layer (`tests/cache.test.js`)**

- Verify basic get/set/invalidate operations.
- Verify TTL expiry: set an entry with a short TTL, advance time (mock `Date.now`), assert `get()` returns `null`.
- Verify LRU eviction: fill cache to `maxSize`, insert one more, assert the least-recently-used entry was evicted.
- Verify different TTLs for `FOUND` vs `NOT_FOUND` results.
- Verify `stats()` accurately tracks hits and misses.
- Verify `clear()` resets all state.
- Verify that accessing an entry refreshes its LRU position.

### Prior art

The existing test suite in `tests/` uses **Jest** with no external mocking libraries. Tests mock `axios` directly and use `jest.fn()` for callback verification. The new tests should follow the same patterns established in `tests/scanner.test.js` and `tests/analyzer.test.js`.

## Out of Scope

- **External queue systems (BullMQ, RabbitMQ, Redis).** This PRD uses in-memory concurrency control and caching. External infrastructure is deferred to a future scaling phase.
- **Worker Threads / Cluster mode.** Node.js Worker Threads add complexity for CPU-bound work, but OSINT scanning is I/O-bound. The event loop with async/await is sufficient.
- **Persistent cache (disk/database).** The cache is RAM-only, consistent with the project's existing "no DB" architecture decision.
- **Proxy pool rotation.** While the scanner supports proxy configuration, managing a pool of rotating proxies is out of scope.
- **WebSocket migration.** SSE remains the streaming protocol. WebSocket would require client-side and infrastructure changes that aren't justified by the current requirements.
- **Rate limit dashboard / admin panel.** Circuit breaker state is logged but not exposed via a dedicated UI.
- **Vercel serverless timeout workarounds.** The handoff doc notes that SSE may hit Vercel's 10-second timeout. Solving that (polling, chunked responses, Vercel Pro) is a separate architectural concern tracked in the handoff notes.

## Further Notes

- **Performance baseline.** Before implementation, run a full 92-platform scan 3 times and record the average `timeTakenMs` from the `end` SSE event. This establishes the "before" benchmark to measure against the 2–4× improvement target.
- **Backwards compatibility.** The `/api/scan` SSE contract (event types: `progress`, `result`, `error`, `end`) remains unchanged. The frontend receives the same event shapes. This is a pure backend internal refactoring with additive fields (`responseTimeMs`).
- **ADR compliance.** This work respects ADR 001 (Svelte 5 frontend) and ADR 002 (expanded registry schema with `riskLevel`, `requiresProxy`, `timeout` fields). The orchestrator uses these schema fields to drive adaptive concurrency decisions.
- **Cache invalidation UX.** Consider adding a "Force Rescan" button in a future UI iteration that calls `cache.invalidate()` for the current target before starting the scan.
