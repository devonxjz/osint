# Task 6: Platform Registry - APIs & Filtering

- **Module**: Module 2 - Platform Registry
- **Type**: AFK
- **Status**: [x] Completed (All query APIs implemented, tested under 5 distinct cases, and running in < 1ms)
- **Blocked by**: [x] Task 5: Platform Registry - Data & Schema Validation

## What to build
Implement the public registry API queries (`getPlatforms(categories)`, `getAllPlatforms()`, `getCategories()`) and write TDD tests verifying case-insensitive category filtering and error handling.

## Acceptance Criteria
- [x] Export `getCategories()` returning unique list of categories `['Gaming', 'Media', 'Social', 'Tech']`.
- [x] Verify 5 behavior cases of `getPlatforms(categories)`:
  - `getPlatforms()` ➔ Returns all 40 platform records.
  - `getPlatforms([])` ➔ Returns all 40 platform records.
  - `getPlatforms(['Tech'])` ➔ Returns only the 10 Tech platforms.
  - `getPlatforms(['Tech', 'Gaming'])` (case-insensitive, e.g. `['tech', 'gaming']`) ➔ Returns 19 platforms (Tech + Gaming).
  - `getPlatforms(['Unknown'])` ➔ Returns `[]` array without throwing any error.
- [x] Execution time of the registry APIs is strictly **`< 1ms`** per call.
- [x] Module load time is **`< 5ms`**.
