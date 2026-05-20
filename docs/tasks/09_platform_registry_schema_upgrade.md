# Task 09: Platform Registry Schema Upgrade & Validation

- **Module**: Module 2 - Platform Registry
- **Type**: AFK
- **Status**: [x] Completed (Upgraded registry schema config fields with strict schema validation and security tests passing successfully)
- **Blocked by**: [x] Task 08: SaaS Dashboard UI & Express SSE Integration
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/08_platform_expansion.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/08_platform_expansion.md)

## What to build
Upgrade the `PlatformConfig` object schema structure in the backend lookup registry (`be/src/registry.js`). Implement new optional attributes (`identifierType`, `requiresProxy`, `envCookieKey`, `timeout`, and `riskLevel`) and develop a strict TDD-driven automated test suite to validate all existing and future lookup configurations.

## Acceptance criteria
- [ ] Upgrade the registry configuration structure inside `be/src/registry.js` with new schema fields:
  - `identifierType`: `'USERNAME' | 'PHONE' | 'EMAIL'` (default: `'USERNAME'`)
  - `requiresProxy`: `boolean` (default: `false`)
  - `envCookieKey`: `string` (optional env reference key to secure session tokens)
  - `timeout`: `number` (optional millisecond lookup override timeout)
  - `riskLevel`: `'LOW' | 'MEDIUM' | 'HIGH'` (optional rating)
- [ ] Add Jest tests inside `be/tests/registry.test.js` validating schema conformity:
  - [ ] Every platform entry must not expose raw plain-text cookies (enforce using `envCookieKey` prefix patterns).
  - [ ] Every `timeout` property must be a positive integer greater than `0`.
  - [ ] Every `identifierType` must belong to the approved `'USERNAME' | 'PHONE' | 'EMAIL'` union.
- [ ] Ensure that `npm run test` executes and succeeds with 100% of all registry test assertions passing.
