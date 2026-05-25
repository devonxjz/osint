# Task 35: Vercel Serverless Evasion Fallback & UI Low Confidence Badge

## Parent

[Task 30: Anti-Bot Detection Scraper Pipeline Implementation](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/30_antibot_evasion_strategy.md)

## What to build

Implement a serverless runtime guard that detects if the application is running inside a Vercel Serverless environment. If running on Vercel, gracefully downgrade Playwright and `curl-impersonate` targets to `undici` with maximum stealth headers, appending `{ confidence: 'LOW' }` metadata. Update the Svelte frontend to render a professional "Low Confidence" warning badge next to fallback platforms on the dashboard.

## Acceptance criteria

- [ ] Implement a `process.env.VERCEL` runtime check within the platform execution router.
- [ ] On Vercel, intercept Playwright and curl-impersonate targets, downgrading them cleanly to `undici` request execution.
- [ ] Return `{ confidence: 'LOW', method: 'fallback' }` within the target platform SSE event stream and dossier payload.
- [ ] Modify the Svelte platform card grid component to display a warning badge next to platforms with `confidence === 'LOW'`, explaining the fallback due to serverless constraints.
- [ ] Verify using unit tests that Vercel environments trigger undici downgrades cleanly and without server process crashes.

## Blocked by

- [Task 33: Streamlined Playwright Stealth & Target-Level Context Reuse](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/tasks/33_playwright_stealth_context_reuse.md)

---
[ready-for-agent]
