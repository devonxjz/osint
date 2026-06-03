## Context

The OSINT application uses Axios for network requests in several modules, causing dependency fragmentation and revealing fingerprints (like `axios/1.x.x` User-Agent). Furthermore, standard Node `fetch` (backed by Undici) has TLS fingerprints (JA3/JA4) different from actual browsers, triggering Cloudflare protection. 
Additionally, the user wants a raw scanner output mode (triggered by a `scanner:` target prefix) that returns raw scanner results directly instead of rendering the Svelte components/JS UI.

## Goals / Non-Goals

**Goals:**
- Eliminate Axios entirely from the codebase.
- Standardize on `EvasionClient` / native `fetch` with browser-mimicking TLS config (JA3/JA4 impersonation).
- Implement randomized jitter and dynamic concurrency for batching requests to evade rate limits.
- Support `scanner:` prefix inputs case-insensitively and recursively.
- Return raw JSON results directly from the API for scanner targets with standard, non-suspicious response headers.
- Display raw JSON in the frontend for scanner targets, bypassing standard UI card/graph rendering.

**Non-Goals:**
- Upgrading or changing local headless browser execution (Playwright is kept for JS-heavy platforms).

## Decisions

### 1. TLS Impersonation in EvasionClient
Modify `EvasionClient` to configure the Undici connection dispatcher with browser-like TLS settings, restricting cipher suites to match typical Chrome TLS handshakes (JA3/JA4).
*Alternative considered:* Using external libraries like `curl-impersonate`. Rejected due to installation complexity on serverless/cross-platform hosts. Custom Undici TLS configuration is lightweight and works natively.

### 2. Replacing Axios
Rewrite API calls in `domain_orchestrator.ts`, `breach_engine.ts`, `gravatar.ts`, `pdf_generator.ts`, and `caller_id.ts` to use `EvasionClient` or native `fetch` with standardized browser-mimicking headers.

### 3. Evasion Batching Jitter
Introduce randomized delay (jitter) and rate limiting when batching requests to platforms, ensuring request spikes do not trigger Cloudflare burst detection.

### 4. Robust Scanner Mode Parsing
In `backend/shared/analyzer.ts`, parse the `scanner:` prefix using a case-insensitive regular expression and handle recursive stripping (e.g., `Scanner:scanner:user` -> `user`). If valid, classify target type as `SCANNER`.

### 5. Raw Endpoint Response & Header Protection
Return standard API response headers (`Content-Type: application/json; charset=utf-8`, standard `Cache-Control`, and `X-Content-Type-Options`) when serving raw scanner responses to ensure the endpoint does not stand out as a bot-scrape target.
