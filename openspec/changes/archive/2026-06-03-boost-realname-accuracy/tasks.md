## 1. Backend Core Logic Updates

- [x] 1.1 Install `fastest-levenshtein` and verify package.json dependency.
- [x] 1.2 Implement `ExecutionBudget` utility to track elapsed execution time in real-name orchestrator.
- [x] 1.3 Implement Levenshtein normalized similarity helper `fuzzyMatch` using `fastest-levenshtein`.
- [x] 1.4 Update `generateVariants` to support partial and positional variants.
- [x] 1.5 Implement `verifyProfileMatch` scoring algorithm based on display name, bio tokens, username tokens, and avatar URL.
- [x] 1.6 Update `scoreConfidence` logic to classify cluster confidence levels based on the updated thresholds (HIGH >= 70, MEDIUM 40-69, LOW < 40).

## 2. Integration and SSE Updates

- [x] 2.1 Update `scanIdentity` orchestrator to run in chunks, verify found profiles, and invoke pairwise correlation.
- [x] 2.2 Update Express server `GET /api/scan` handler to stream `verified` events at the end of each chunk.

## 3. Frontend UI Updates

- [x] 3.1 Update frontend `scanner.svelte.ts` to handle `verified` SSE events and update the dossier state reactively.
- [x] 3.2 Update `IdentityDossierPanel.svelte` to show individual profile confidence badges, scores, and render LOW confidence profiles with a distinct dashed border, desaturated styling, and a warning badge.

## 4. Testing & Verification

- [x] 4.1 Update backend unit tests under `tests/identity_engine.test.js` to cover the new scoring rules and variant generation.
- [x] 4.2 Run the full Jest test suite to verify that the entire test suite passes without regressions.
