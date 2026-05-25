# Task 34: Jitter Backoff & Residential Proxy Fallback Option

## Parent

[Task 30: Anti-Bot Detection Scraper Pipeline Implementation](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/30_antibot_evasion_strategy.md)

## What to build

Nounce standard static rate-limiting delays by implementing an exponential backoff formula with randomized jitter. Build a fallback request middleware that detects WAF status codes (403, Cloudflare challenge block, connection resets) and automatically routes subsequent attempts through the configured residential proxy pool override.

## Acceptance criteria

- [ ] Implement rate-limiting exponential backoff using the formula: Base * 2^attempt + random(0, Jitter).
- [ ] Implement a proxy fallback detection block checking for 403 Forbidden, connection reset, or Cloudflare challenge signals.
- [ ] If a block is identified, dynamically route subsequent requests for that scan session through the residential proxy pool configured in proxy settings.
- [ ] Verify using unit tests that exponential backoff with jitter accurately shifts delay durations, and proxy fallbacks route correctly under simulated block scenarios.

## Blocked by

- [Task 31: undici HTTP/2 Scraper Engine & Chrome Header Ordering Integration](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/31_undici_http2_header_ordering.md)
- [Task 32: Tier 0 curl-impersonate Subprocess & Registry Integration](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/32_curl_impersonate_subprocess.md)

---
[ready-for-agent]
