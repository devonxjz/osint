# Task 14: Svelte 5 Frontend: Query Auto-Classifier & Credentials Warnings

- **Module**: Module 7 - SaaS Dashboard UI
- **Type**: AFK
- **Status**: [x] Completed (Created robust multi-format target classifier, dynamic card type filtering, and secure credentials warning banners; verified client-server builds perfectly)
- **Blocked by**: [x] Task 13: Svelte 5 Frontend: Dynamic Categories & Card Grid
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/08_platform_expansion.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/08_platform_expansion.md)

## What to build
Upgrade the Svelte 5 frontend SearchBar component to automatically validate, classify, and format search inputs (e.g. phone numbers vs emails vs usernames). Display interactive warnings and configuration help tags inside platform card profiles when credentials or proxy environments required in `.env` are unconfigured.

## Acceptance criteria
- [ ] Refactor `fe/src/lib/SearchBar.svelte` to detect phone numbers (e.g., matching numeric shapes starting with optional `+`), emails, and usernames.
  - Automatically filter or skip non-applicable platform configurations in Svelte (for instance, automatically skip phone checks on WhatsApp if the query is classified as a standard username).
- [ ] Connect frontend states with backend proxy and session environmental validations:
  - If a platform card is selected that defines `envCookieKey` or `requiresProxy` but those variables are not set in the active server environment, display an informative tooltip icon or grey out the card to prevent execution issues.
- [ ] Validate that the complete integrated client-to-server loop builds and runs smoothly by executing `npm run build` in both `fe/` and `be/` folders with zero issues.
