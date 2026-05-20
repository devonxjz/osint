# Task 4: Input Analyzer - Error Enum & Security Hardening

- **Module**: Module 1 - Input Analyzer
- **Type**: AFK
- **Status**: [x] Completed (Static ERRORS constant verified and injection security controls validated)
- **Blocked by**: [x] Task 3: Input Analyzer - Step 5–6 Classification & Validation

## What to build
Declare the `ERRORS` object constant exports and secure the input analyzer against SQL injections and XSS injection patterns.

## Acceptance Criteria
- [x] Export a static `ERRORS` object containing exactly these 5 keys and values:
  - `ERRORS.NOT_A_STRING` ➔ `'Input must be a non-empty string'`
  - `ERRORS.EMPTY` ➔ `'Input cannot be empty'`
  - `ERRORS.USERNAME_SHORT` ➔ `'Username too short (minimum 2 characters)'`
  - `ERRORS.USERNAME_LONG` ➔ `'Username too long (maximum 64 characters)'`
  - `ERRORS.INVALID_FORMAT` ➔ `'Invalid format: only letters, numbers, _, -, . are allowed'`
- [x] Blocks XSS/SQL Injection patterns (e.g. `<script>alert(1)</script>`, `john'doe`, `john#doe`) and returns `valid: false` with `ERRORS.INVALID_FORMAT`.
- [x] Rejects malformed email inputs with `valid: false`.
- [x] Ensure 100% pass on all 32 unit test cases for the Input Analyzer.
