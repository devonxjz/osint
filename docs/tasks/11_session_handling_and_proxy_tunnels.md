# Task 11: Secure Session Handling & Proxy Tunnels

- **Module**: Module 3 - OSINT Engine
- **Type**: AFK
- **Status**: [x] Completed (Secure environment-driven session cookie resolution, WAF proxy tunnels, and Tor SOCKS5 proxy routing implemented and fully verified with TDD Jest tests)
- **Blocked by**: [x] Task 10: Evasion Request Pipeline: Custom Timeouts & Browser Headers
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/08_platform_expansion.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/08_platform_expansion.md)

## What to build
Implement dynamic runtime environment cookie resolution (`envCookieKey` matching against `.env` variables) and configure SOCKS5/HTTP tunnel proxy integrations in the backend scanner Axios engine. Securely bridge Tor gateways for Onion search networks and high-risk platform routes without exposing hardcoded session credentials.

## Acceptance criteria
- [ ] Implement cookie resolution logic inside `be/src/scanner.js`:
  - If a platform profile defines an `envCookieKey`, extract the cookie value securely from `process.env[platform.envCookieKey]`.
  - Add this resolved token to the request's `Cookie` header at execution time. Log a clean diagnostic warning (and flag the scan appropriately) if the configured key is missing from the environment.
- [ ] Configure proxy integration:
  - If `platform.requiresProxy` is true, route the Axios network call via the proxy agent pool (read from `PROXY_POOL_URL` in `.env`).
  - If a target belongs to the `DarkWeb` category (resolving `.onion` links), tunnel requests through a SOCKS5 Tor proxy agent (`socks5://localhost:9050` configured in `.env`).
- [ ] Add unit tests in `be/tests/scanner.test.js` asserting that:
  - [ ] Proxy connections are triggered and used when the `requiresProxy` flag is enabled.
  - [ ] Requests to Tor network categories use the configured SOCKS5 proxy routing.
  - [ ] Session cookie parameters are correctly mapped and sent to target servers during Axios execution.
