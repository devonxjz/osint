## Why

The current realname search variant generation only generates direct name concatenations, which fails to find targets that use partial names or positional permutations (e.g., searching "David Bomber" fails to discover "david_bomber" or "davidbomber99"). Furthermore, the engine lacks profile content verification and cross-platform correlation, leading to a high rate of false positive matches with low-confidence username collisions.

## What Changes

- **Extended Variant Generation**: Generate partial and positional variants (e.g. `d_bomber`, `dbomber`, `davidb`).
- **Confidence-Scored Multi-Signal Matching**: Score found profiles based on display name fuzzy matching, bio token hits, username token hits, and avatar URL matching.
- **Pairwise Cross-Platform Avatar URL Correlation**: Detect shared avatar URLs across platforms to boost confidence scores.
- **Streaming Timeout Budget**: Implement an execution budget inside the realname orchestrator to prevent Vercel 10s serverless function timeouts while streaming progress, results, and verification events.
- **Visual Cue for Low Confidence**: Highlight low-confidence matches differently in the UI dashboard.

## Capabilities

### New Capabilities
- `realname-accuracy-matching`: Implements multi-signal confidence scoring, partial variant generation, pairwise avatar URL correlation, and budget-aware streaming execution for real-name identity scans.

### Modified Capabilities
<!-- None -->

## Impact

- **Backend**:
  - `backend/realname/realname_orchestrator.ts`: Re-implement `generateVariants`, `scanIdentity`, and `scoreConfidence`. Add `verifyProfileMatch` and `ExecutionBudget`.
  - `backend/index.ts`: Update `/api/scan` endpoint to emit `verified` events per chunk.
- **Frontend**:
  - `src/lib/scanner.svelte.ts`: Update SSE handler to listen to `verified` events and stream results reactively.
  - `src/lib/IdentityDossierPanel.svelte`: Display confidence badges and scores dynamically, and render low-confidence results with a distinct visual style.
- **Dependencies**:
  - Added `fastest-levenshtein` for string similarity computation.
