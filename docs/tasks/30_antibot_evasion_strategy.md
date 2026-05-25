# Task 30: Anti-Bot Detection Scraper Pipeline Implementation

- **Module**: Evasion & Request Pipeline
- **Type**: Core Backend Evasion
- **Status**: [ ] Pending
- **Blocked by**: None

## What to build
Implement the comprehensive 3-Tier Anti-Bot Detection Scraper Pipeline, replacing Axios with Tier 0 `curl-impersonate` subprocess execution, Tier 1 `undici` HTTP/2 with Chrome-compliant header ordering, and Tier 2 Playwright with streamlined Stealth.

## Acceptance Criteria
- [ ] Remove Axios completely from all platform search engines.
- [ ] Implement Tier 0 `curl-impersonate` subprocess execution path for Cloudflare Enterprise and strict TLS JA3 platforms.
- [ ] Implement Tier 1 `undici` request client forcing HTTP/2 multiplexing and preserving standard Chrome-compliant headers order.
- [ ] Set up Tier 2 Playwright with streamlined Stealth patches spoofing `navigator.webdriver = false`, WebGL GPU vendor/renderer, and Canvas rendering outputs.
- [ ] Enforce session scope of exactly **1 browser context per target scan session**, sequentially reused across platform checks in the same target scan to save memory.
- [ ] Implement exponential backoff with randomized jitter for rate limiting (429 status codes).
- [ ] Add support for a configurable **Residential Proxy Fallback Option** triggered upon WAF block detection.
- [ ] Create a Vercel runtime environment check falling back cleanly from Playwright or curl-impersonate to `undici` with a `{ confidence: 'LOW' }` scan status.
- [ ] Verify using unit tests that outbound request header ordering is preserved and HTTP/2 is negotiated.

---
[ready-for-agent]
