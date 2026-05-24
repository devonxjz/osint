# Task 16: Phone Reverse Caller ID Engine

- **Module**: Module 3 - Reverse Lookup Engine
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: [x] Task 15: Phone Input Validation & Carrier Lookup
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-telephone-system-design.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-telephone-system-design.md)

## What to build
Build a high-fidelity reverse Caller ID engine that performs lookups using external directory endpoints (e.g. Twilio, OpenCNAM APIs) or falls back gracefully to a curated mock caller ID database with pattern-based responses.

## Acceptance criteria
- [x] Implement `api/phone/caller_id.js` with a lookup function `lookupCallerID(phone, options = {})`.
- [x] Create a mock caller database representing multiple regions (VN, US, UK) that triggers realistic candidate names and locations based on prefixes (e.g. `+84` prefix matches Vietnamese names, `+1` prefix matches US names) using deterministic seed-based mocking.
- [x] Connect optionally to environmental API keys (like `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN`) for live Carrier/Caller Name Lookup if available.
- [x] Handle Twilio VN/non-US limits: If Twilio returns `callerName: null` (common for VN numbers), the lookup function must actively fallback to the deterministic seed-based mock name instead of returning an empty string.
- [x] Write a test suite `tests/phone_caller_id.test.js` validating mock fallback lookups, correct schema fields (`realName`, `location`, `carrier`, `sources`), and rate limit safety. Run and pass all tests.
