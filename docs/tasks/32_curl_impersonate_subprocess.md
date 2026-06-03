# Task 32: Tier 0 curl-impersonate Subprocess & Registry Integration

## Parent

[Task 30: Anti-Bot Detection Scraper Pipeline Implementation](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/30_antibot_evasion_strategy.md)

## What to build

Implement a Tier 0 execution path utilizing a subprocess call to `curl-impersonate` for Cloudflare Enterprise and targets requiring exact byte-for-byte JA3 TLS ClientHello emulation. Add the new `impersonate` option to the scraper registry schema and ensure the orchestrator routes these targets through the new subprocess runner.

## Acceptance criteria

- [ ] Add `'impersonate'` as an available option in `scrapeMethod` inside the platform registry schema.
- [ ] Implement a subprocess utility to safely run `curl-impersonate` queries using standard Chrome flags.
- [ ] Integrate the subprocess runner within the orchestration pipeline to handle targets configured with `'impersonate'`.
- [ ] Add unit tests verifying that the subprocess executes correctly and captures standard output cleanly.

## Blocked by

None - can start immediately

---
[ready-for-agent]
