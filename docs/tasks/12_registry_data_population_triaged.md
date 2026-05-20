# Task 12: Platform Registry Data Population (Triaged Tiers)

- **Module**: Module 2 - Platform Registry
- **Type**: AFK
- **Status**: [x] Completed (Expanded registry to 105 active platforms across 8 distinct categories, built dry-run registry diagnostics health checker verified with Jest tests)
- **Blocked by**: [x] Task 09: Platform Registry Schema Upgrade & Validation
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/08_platform_expansion.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/08_platform_expansion.md)

## What to build
Populate `be/src/registry.js` with the 60+ newly triaged platforms categorized across 9 distinct categories, ensuring that no non-viable or dead-weight endpoints (like direct WeChat or Shodan integration layers) clog the footprint lookup registry. Build an automated health check validation suite that tests platform checks end-to-end.

## Acceptance criteria
- [ ] Add and configure all approved Group A (Implementable Now) and Group B (Proxy & Session) platforms into `be/src/registry.js`. Ensure they map perfectly to their respective categories (`Social`, `Tech`, `Gaming`, `Media`, `Regional`, `Privacy`, `Forums`, `DarkWeb`).
- [ ] Strictly ensure all triaged platforms in Group C (like Signal, WeChat, Shodan, Censys, 4chan) are omitted from the profile lookup registry to keep the engine modular.
- [ ] Build a lightweight registry diagnostic script (`npm run test:registry-health` or equivalent Jest script in `be/tests/registry_health.test.js`) that runs dry-run checks against active platform test profiles to confirm the missing/found text substring rules remain accurate.
- [ ] Confirm all registry schema and duplicate checking unit tests continue to pass seamlessly with 100% success.
