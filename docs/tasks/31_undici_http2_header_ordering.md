# Task 31: undici HTTP/2 Scraper Engine & Chrome Header Ordering Integration

## Parent

[Task 30: Anti-Bot Detection Scraper Pipeline Implementation](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/30_antibot_evasion_strategy.md)

## What to build

Completely replace Axios with `undici` for Tier 1 standard lightweight target platforms. The request flow must negotiate HTTP/2 multiplexing, reuse connection pools, and enforce Chrome-compliant HTTP request header ordering exactly to prevent WAF bot detection heuristics from flagging the requests.

## Acceptance criteria

- [ ] Refactor platform scraper helpers to use `undici` instead of Axios for HTTP requests.
- [ ] Enforce Chrome-compliant header ordering sequence (e.g. `:method`, `:authority`, `:scheme`, `:path`, `sec-ch-ua`, `user-agent`, etc.) within all `undici` requests.
- [ ] Force HTTP/2 multiplexing and connection pooling.
- [ ] Implement unit tests using a mock HTTP server to assert that header ordering is strictly preserved and HTTP/2 is negotiated successfully.

## Blocked by

None - can start immediately

---
[ready-for-agent]
