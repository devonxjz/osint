# Task 1: Setup Jest Testing Harness & Performance Instrumentation

- **Module**: Testing & Instrumentation
- **Type**: AFK
- **Status**: [x] Completed (Jest is installed, `npm test` script updated, and benchmarking helper created)
- **Blocked by**: None

## What to build
Configure `jest` as the test runner for the backend (`be/`) project and establish a benchmarking pattern to measure function execution times.

## Acceptance Criteria
- [x] Jest is successfully installed as a devDependency in `be/package.json`.
- [x] The `test` script inside `be/package.json` is mapped to `"jest"`.
- [x] The test suite can be run using the command `npm test`.
- [x] A benchmarking harness or verification pattern using `performance.now()` or equivalent is established to check `< 1ms` performance requirements on core functions.
