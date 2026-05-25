# Task 33: Streamlined Playwright Stealth & Target-Level Context Reuse

## Parent

[Task 30: Anti-Bot Detection Scraper Pipeline Implementation](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/30_antibot_evasion_strategy.md)

## What to build

Implement a Tier 2 Playwright scanning lane equipped with essential stealth plugins to spoof signatures without unnecessary overhead. Enforce a memory-safe browser session scope of exactly **1 browser context per target scan**, sequentially executing target queries across configured platforms and cleaning up the browser instance immediately upon completion or scan abort.

## Acceptance criteria

- [ ] Integrate Playwright with `playwright-extra` stealth plugins.
- [ ] Implement essential preloads: `navigator.webdriver = false`, WebGL GPU vendor/renderer spoofing, and Canvas rendering outputs noise.
- [ ] Implement browser context scoping of exactly **1 context per target scan session** to ensure memory consumption stays under 150MB total.
- [ ] Sequentially route multiple platform checks within the same target username scan through the single context before closing the browser.
- [ ] Ensure full AbortController integration, closing browser processes immediately if the scan is aborted.

## Blocked by

- [Task 31: undici HTTP/2 Scraper Engine & Chrome Header Ordering Integration](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/31_undici_http2_header_ordering.md)

---
[ready-for-agent]
