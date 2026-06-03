## Why

Axios is used in several backend files, causing inconsistency and potential WAF issues. Additionally, scanner input queries should yield raw scanner results directly instead of auto-rendering JS/UI.

## What Changes

- Replace `axios` with native `fetch` or `EvasionClient` in `domain_orchestrator.ts`, `breach_engine.ts`, `gravatar.ts`, `pdf_generator.ts`, and `caller_id.ts`.
- Add raw output format support when scan target starts with `scanner:` or is explicitly configured for CLI/API-first consumption.

## Capabilities

### New Capabilities
- `raw-scanner-output`: Extract and return raw scanner output without JS UI rendering when `scanner:` target prefix or mode is specified.

### Modified Capabilities
<!-- None -->

## Impact

- `backend/domain/domain_orchestrator.ts`
- `backend/email/breach_engine.ts`
- `backend/email/gravatar.ts`
- `backend/email/pdf_generator.ts`
- `backend/phone/caller_id.ts`
- `backend/shared/analyzer.ts`
- `backend/index.ts`
