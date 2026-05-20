# Task 10: Evasion Request Pipeline: Custom Timeouts & Browser Headers

- **Module**: Module 3 - OSINT Engine
- **Type**: AFK
- **Status**: [x] Completed (Rotated UA, dynamic browser headers, platform custom timeouts, and WAF HTTP status 429/403 block checks implemented and verified with TDD Jest tests)
- **Blocked by**: [x] Task 09: Platform Registry Schema Upgrade & Validation
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/08_platform_expansion.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/08_platform_expansion.md)

## What to build
Enhance the backend OSINT engine request execution loop (`be/src/scanner.js`) to apply dynamic browser headers, rotate User-Agents, and inject per-platform network timeouts (`platform.timeout || 5000`) on each Axios client call.

## Acceptance criteria
- [ ] Refactor the Axios scan request construction in `be/src/scanner.js` to populate:
  - Rotated desktop/mobile `User-Agent` strings.
  - Realistic browser request headers (`Accept-Language`, `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Referer`).
- [ ] Read `platform.timeout` from the platform config at run time and apply it directly as the network timeout to override the global standard 5-second timeout limit.
- [ ] Distinguish WAF rate-limiting error signatures (like HTTP status `429` or `403` blocks) from typical user missing signals. Capture them as separate states (e.g. `BLOCKED_BY_WAF`) to avoid showing false-negatives to investigators.
- [ ] Add backend Jest test suites in `be/tests/scanner.test.js` using mock HTTP responses that assert:
  - [ ] A mock server receives the correct custom headers and rotated User-Agents.
  - [ ] A slow-responding platform with a high timeout configuration executes successfully without tripping prematurely.
