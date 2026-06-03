## 1. Network Layer (Replace Axios & Impersonation)

- [x] 1.1 Replace `axios` with native `fetch`/`EvasionClient` in `backend/domain/domain_orchestrator.ts`
- [x] 1.2 Replace `axios` with native `fetch`/`EvasionClient` in `backend/email/breach_engine.ts`
- [x] 1.3 Replace `axios` with native `fetch`/`EvasionClient` in `backend/email/gravatar.ts`
- [x] 1.4 Replace `axios` with native `fetch`/`EvasionClient` in `backend/email/pdf_generator.ts`
- [x] 1.5 Replace `axios` with native `fetch`/`EvasionClient` in `backend/phone/caller_id.ts`
- [x] 1.6 Remove `axios` dependency from package.json and package-lock.json
- [x] 1.7 Configure TLS impersonation (JA3/JA4) in `EvasionClient` using Chrome-like TLS connect configuration in Undici Agent
- [x] 1.8 Integrate randomized jitter into batching queues to evade rate limits

## 2. Input Classification (Target Analyzer)

- [x] 2.1 Update `backend/shared/analyzer.ts` target classification to support `scanner:` prefix case-insensitively and recursively
- [x] 2.2 Add unit tests in `tests/analyzer.test.js` to verify scanner classification and recursive edge cases

## 3. Backend Scan Flow for Scanner Target

- [x] 3.1 Update `backend/index.ts` scan endpoint to handle `SCANNER` target type and return raw JSON data directly
- [x] 3.2 Implement secure browser-mimicking headers in API response for scanner mode
- [x] 3.3 Add backend route tests for `SCANNER` input in `tests/api.test.js`

## 4. Frontend Raw Output UI

- [x] 4.1 Update `src/lib/scanner.svelte.ts` to support raw scanner results and UI updates for `SCANNER` type
- [x] 4.2 Update `src/App.svelte` to render raw JSON output when input target type is `SCANNER`

## 5. Verification

- [x] 5.1 Run all tests to ensure correctness of Axios removal, TLS impersonation, jitter, and scanner mode integration
