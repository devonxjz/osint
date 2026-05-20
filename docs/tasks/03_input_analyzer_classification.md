# Task 3: Input Analyzer - Step 5–6 Classification & Validation

- **Module**: Module 1 - Input Analyzer
- **Type**: AFK
- **Status**: [x] Completed (All classification rules implemented, verified, and malformed email bug fixed)
- **Blocked by**: [x] Task 2: Input Analyzer - Step 1–4 Sanitization Pipeline

## What to build
Implement Step 5 & 6 (Email detection with RFC 5322 regex and Username validation regex + length check) and classify inputs into either `'EMAIL'` or `'USERNAME'`.

## Acceptance Criteria
- [x] Valid emails (e.g. `john.doe@gmail.com`, `john.doe+label@test.co.uk`) are correctly classified as `'EMAIL'`, returned lowercased in `sanitized`, and `valid: true`.
- [x] Malformed emails starting with `@` (e.g. `@gmail.com`) or missing domain parts are rejected as `valid: false`.
- [x] Valid usernames (containing letters, numbers, and allowed connectors `_`, `-`, `.`) are classified as `'USERNAME'`, preserve their casing in `sanitized`, and `valid: true`.
- [x] Usernames must be between 2 and 64 characters (inclusive). Shorter or longer inputs are rejected as `valid: false`.
- [x] Full pipeline execution for `analyzeInput` is strictly **`< 1ms`** per call.
