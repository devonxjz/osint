# Task 5: Platform Registry - Data & Schema Validation

- **Module**: Module 2 - Platform Registry
- **Type**: AFK
- **Status**: [x] Completed (All 40 platform configurations validated and verified through strict automated schema checks)
- **Blocked by**: [x] Task 1: Setup Jest Testing Harness & Performance Instrumentation

## What to build
Load the curated 40 platforms into `be/src/registry.js` under distinct categories and write strict, automated TDD unit tests to verify the config data schemas.

## Acceptance Criteria
- [x] Load exactly 40 curated platform records split as: Tech (10), Social (12), Gaming (9), and Media (9) matching the spec table.
- [x] Verify each platform record contains: `name`, `category`, `url`, `checkType`, and `checkValue`.
- [x] Strictly validate that `checkValue` is a `number` when `checkType` is `'status'`, and a `string` when `checkType` is `'text'` or `'selector'`.
- [x] Verify platform name uniqueness (case-insensitive) and URL uniqueness across the registry.
- [x] Ensure all platform URLs start with `https://`, contain no spaces, and have **exactly one** `{}` placeholder.
