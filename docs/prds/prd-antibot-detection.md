# Product Requirement Document (PRD): High-Evasion Anti-Bot Detection Scraper Pipeline

## Problem Statement

As the OSINT intelligence platform scales, modern Web Application Firewalls (WAFs) such as Cloudflare, PerimeterX, and DataDome increasingly block, rate-limit, or issue connection resets (`ECONNRESET`) against the crawler. The legacy architecture relies heavily on `axios` for HTTP queries, which sends requests as a bare HTTP client lacking a valid browser fingerprint. WAFs immediately detect and flag this behavior by analyzing:
1. **TLS Fingerprint (JA3/JA3S)** — Node.js and Axios advertise cipher suites and TLS client parameters that are completely different from a standard Chrome or Firefox client.
2. **HTTP Version & Frame Ordering** — Lack of native HTTP/2 multiplexing, fallback to HTTP/1.1.
3. **Missing or Out-of-Order Browser Headers** — Standard browsers send request headers in a strict, specific order. Axios lacks header ordering preservation, which is a major signal for bot detection.
4. **JS Execution Context** — Several advanced platforms (Instagram, TikTok, LinkedIn) require client-side JavaScript execution to hydrate pages, causing HTML-only scrapers to fail or hit soft-404 redirects.

These blocks lead to scan timeouts, incomplete target profiles, and a high rate of false negatives (profiles reported as "NOT_FOUND" when they actually exist behind auth/anti-bot walls).

---

## Solution

We will replace the single-tier Axios scanner with a **resilient 3-Tier Anti-Bot Scanning Architecture** that uses advanced evasion technologies to successfully query platforms without triggering security blocks.

1. **Tier 0 (Enterprise Bypass) — `curl-impersonate` Subprocess**
   - For Cloudflare Enterprise and targets with strict TLS ClientHello (JA3) fingerprinting requirements where standard Node.js/OpenSSL limits fail, we will support a Tier 0 execution path via a subprocess call to `curl-impersonate` (compiled to mirror Chrome's JA3 byte-for-byte).

2. **Tier 1 (Lightweight) — `undici` with HTTP/2 & Header Ordering**
   - We will replace `axios` completely with `undici` (Node.js native high-performance HTTP client).
   - Implement **Chrome-compliant Header Ordering** (e.g. `:method`, `:authority`, `:scheme`, `:path`, `sec-ch-ua`, `user-agent`, etc.). Header ordering is preserved exactly to mimic a real browser request structure.
   - Force **HTTP/2 multiplexing** and native connection pooling to simulate genuine browser connection handshakes.
   - This handles **80% of targets** (Reddit, GitHub, Medium, Chess.com, LeetCode) with ultra-high speed and low CPU overhead.

3. **Tier 2 (Heavyweight) — Playwright + `playwright-extra` with Stealth Plugin**
   - For the **20% highly-protected targets** (Instagram, TikTok, LinkedIn, Douyin, Spotify), we will leverage Playwright headless browser automation.
   - Inject the **Puppeteer-Extra-Stealth** plugin equivalents into Playwright to override critical browser detection properties: `navigator.webdriver = false`, spoof WebGL GPU renderer, randomize screen resolution, and add minor mathematical noise to Canvas `getImageData` rendering.
   - This heavy-duty scraper will run with a streamlined, simplified footprint (Bézier mouse movements and AudioContext noise are excluded to avoid complexity and lower system memory overhead).

4. **Intelligent 3-Lane Scraper Router & Session Scoping**
   - Route scanning targets dynamically based on their registry classifications:
     - **API Lane**: Standard API endpoints (GitHub, Steam) running with max concurrency.
     - **undici Lane**: HTML engines running with HTTP/2 and randomized headers.
     - **Playwright Lane**: Headless browser automation running with behavior simulation.
   - **Session Scoping**: We will configure exactly **1 browser context per target scan** which is reused across platform checks in the same scan session, preventing high RAM overhead while maintaining context-isolation between distinct target scans.
   - Implement **Exponential Backoff with Jitter** on rate limits (429 status codes) instead of static delay periods.

5. **IP Reputation & Residential Proxy Fallback Option**
   - Incorporate a configurable **Residential Proxy Fallback Option** within proxy pool settings. In case a target scan triggers WAF blocks or rate-limits suggesting IP-level reputation flagging, the scanner can fall back to routing requests via the configured residential proxy pool to bypass datacenter IP range blocks.

6. **Vercel Serverless Constraint Fallbacks**
   - Because Playwright binaries and custom binaries like `curl-impersonate` cannot run easily inside Vercel's serverless environment, the engine must detect Vercel serverless runtimes.
   - On Vercel, highly-protected targets will gracefully downgrade from Playwright or curl-impersonate to **undici with max stealth headers**, marking the scan result with a `{ confidence: 'LOW', method: 'fallback' }` indicator.

---

## User Stories

1. As an OSINT investigator, I want target requests to carry a genuine Chrome JA3 TLS fingerprint via a Tier 0 `curl-impersonate` subprocess path, so that Cloudflare Enterprise does not reset the socket connection.
2. As an OSINT investigator, I want outbound headers to match Google Chrome's exact order, so that WAF heuristics do not flag our requests as automated scripts.
3. As an OSINT investigator, I want highly protected platforms like LinkedIn to execute page JavaScript, so that we can retrieve active profile bios and avatar links instead of a blank page.
4. As an OSINT investigator, I want the system to spoof browser dimensions, WebGL parameters, and Canvas outputs dynamically, so that WAF fingerprint checks do not flag our headless browser.
5. As an OSINT investigator, I want highly-protected scans running on Vercel to automatically fallback to undici, so that the API gateway never crashes due to missing Chromium or custom binaries.
6. As an OSINT investigator, I want scan results to display a "low confidence" badge when running on Vercel fallback, so that I can evaluate the accuracy of the profile discovery.
7. As an OSINT investigator, I want the Playwright engine to utilize context-reuse per target username scan, so that memory overhead remains extremely low and tabs are cleaned up properly.
8. As an OSINT investigator, I want rate-limit retry mechanisms to utilize exponential backoff with randomized jitter, so that the crawlers do not trigger cascading network blocks.
9. As an OSINT investigator, I want target scans to fall back to residential proxies in case of IP reputation blocks, so that we remain resilient to datacenter IP bans.
10. As a developer, I want all legacy Axios instances completely removed from the backend codebase, so that we eliminate standard Axios fingerprint signatures entirely.

---

## Implementation Decisions

### 1. Unified 3-Lane Router & Scraper Registry
The platform registry will be enhanced with a `scrapeMethod` field (`'api' | 'undici' | 'playwright' | 'impersonate'`). The orchestration manager will dynamically assign targets to one of three isolated lanes:
- **API Lane** (Concurrency: 30, delay: 0ms)
- **undici Lane** (Concurrency: 15, delay: random jitter)
- **Playwright Lane** (Concurrency: 2, delay: standard page load delays)
- **Impersonate Lane (Tier 0)** (Concurrency: 5, delay: standard subprocess execution)

### 2. curl-impersonate Subprocess & undici Request Structure
To bypass strict JA3 TLS ClientHello fingerprinting, WAF protected sites will be routed to Tier 0 `curl-impersonate` executing in a native subprocess. For standard HTML engines, `undici.request` options will be used to enforce Chrome-compliant header ordering and HTTP/2 multiplexing.

### 3. Playwright Stealth & Context Reuse
A modular `StealthManager` will handle browser context generation.
- **Preload Scripts**: Overridden using client-side preloads (`navigator.webdriver = false`).
- **WebGL Spoofing**: Spoof WebGL GPU vendor/renderer.
- **Canvas Jitter**: Introduce minor mathematical noise to Canvas `getImageData` outputs.
- **Target Context Reuse**: Create exactly **1 browser context per target scan session**. All platforms queried for this target will reuse this context/jar sequentially, then the context is destroyed to prevent memory leaks and process bloat.

### 4. Exponential Backoff with Jitter (Rate Limiting)
Standard static delays will be replaced by an exponential backoff formula with random jitter to prevent pattern recognition:
$$\text{Delay} = \text{Base} \times 2^{\text{attempt}} + \text{random}(0, \text{Jitter})$$

### 5. IP Reputation & Residential Proxy Fallback
A middleware block will detect WAF blocks (403 Forbidden, Cloudflare challenge pages, or connection resets). If detected, it will dynamically fall back to the configured residential proxy pool override.

### 6. Vercel Environment Guard
In serverless environments (`process.env.VERCEL` is defined), any Platform Scraper configured for `playwright` or `impersonate` will fallback to `undici` with a strict low-confidence meta flag to prevent serverless function crashes.

---

## Testing Decisions

### 1. Test Standards & Behavior-Driven Testing
- Scraper tests must not rely on live websites, as external page content changes frequently. We will write mock HTTP servers inside the test suite to verify JA3 fingerprints, HTTP/2 multiplexing, and request header orders.
- Real Playwright tests will be fully mocked in a CI environment to ensure Chromium launches and preload scripts execute correctly.

### 2. Modules to be Tested
- **undici Scraper Engine**: Test that headers are sent in the exact Chrome order and that HTTP/2 is negotiated successfully.
- **Stealth Module**: Verify that preloads properly spoof `navigator.webdriver = false` and other browser fingerprint details.
- **Evasion Router**: Test that concurrent queries execute in correct lanes and that Vercel environments trigger clean fallbacks.

---

## Out of Scope

- **Desktop GUI for Scrapers**: We will not build any desktop-specific browser GUI extensions; this is entirely server-side backend execution.
- **Captcha Solving Integration**: Automatically solving CAPTCHAs via third-party paid solver APIs (e.g., 2Captcha, Anti-Captcha) is out of scope for this phase.
- **IP Proxy Rotation Pool Service**: The application will support proxy URLs provided in configurations, but maintaining or providing a custom residential proxy pool network is out of scope.

---

## Further Notes

- **Stealth Performance**: While Playwright is highly effective, it consumes significantly more memory (~150MB per tab). We must strictly enforce low concurrency constraints on the Playwright Lane (max 2 parallel sessions) to prevent memory exhaustion in low-end hosting environments.
- **Legal Compliance**: Scrapers must adhere to ethical scraping guidelines and respect target platform terms of service where applicable.

---

[ready-for-agent]
