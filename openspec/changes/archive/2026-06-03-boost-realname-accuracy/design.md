## Context

Currently, the Real Name (Identity) search engine performs sequential queries against 15 high-value platforms using name variants. However:
1. The variants generated do not support partial or positional permutations, causing the engine to miss profiles like `david_bomber` when searching "David Bomber".
2. Found profiles are not verified or scored against display names, bios, or cross-platform signals, leading to high false positives.
3. The Express backend has no safeguard to protect against Vercel's 10-second serverless execution limits, meaning longer scans can get killed by Vercel before completion.

## Goals / Non-Goals

**Goals:**
- Implement a 3-layer confidence-scored matching algorithm (Variant Generation, Profile Verification, Cross-platform Correlation).
- Integrate `fastest-levenshtein` for display name matching.
- Prevent Vercel execution timeouts by implementing a 9500ms `ExecutionBudget` with chunked SSE event emission.
- Render low-confidence profiles with clear visual cues in the Svelte UI.

**Non-Goals:**
- Fetching and analyzing avatar image contents (perceptual hashing) is out of scope due to network latency/timeout risks. Only URL comparison will be used.
- Persisting search history or profile matching data in a database is out of scope.

## Decisions

### 1. Fuzzy Matching Algorithm
- **Decision**: Use `fastest-levenshtein` library to compute normalized similarity.
- **Formula**: `1 - (levenshteinDistance(a, b) / max(a.length, b.length))`
- **Rationale**: Levenshtein is robust for names. Using a library prevents diacritic-handling bugs and reduces maintenance overhead.

### 2. Multi-Signal Scoring System
- **Decision**: Compute scores based on the following breakdown:
  - **Display Name Match**: Normalized similarity > 0.8 adds +40 points.
  - **Bio Token Hit**: +15 points per token (first name, last name, middle names) found in the bio.
  - **Username Token Hit**: +10 points per token found in the username.
  - **Cross-Platform URL Match**: +35 points if a profile's normalized avatar URL matches any other discovered profile's avatar URL.
- **Rationale**: High bar for matches ensures users can distinguish genuine footprints from common username collisions.

### 3. Pairwise URL Matching for Avatar Correlation
- **Decision**: Extract and normalize avatar URLs by removing query strings and trailing slashes. Compare URLs pairwise.
- **Rationale**: Avoids down-loading images, keeping execution lightweight and serverless-compatible.

### 4. Dynamic Execution Budget
- **Decision**: Track remaining time using `ExecutionBudget`. Stop scanner and emit the final payload if elapsed time exceeds 9500ms.
- **Rationale**: Ensures the Express server responds and closes the SSE connection cleanly before Vercel terminates the process.

### 5. Chunk-based Backend Emit and Svelte Update
- **Decision**: Emit `verified` events at the end of each chunk.
- **Rationale**: Keeps the UI responsive and allows progress to be shown interactively.

## Risks / Trade-offs

- **[Risk] Avatar URLs may change or be dynamic** → *Mitigation*: Pairwise matching is a bonus signal; if it fails, the display name and bio signals are still sufficient to hit MEDIUM/HIGH confidence.
- **[Risk] Multi-token name searches (e.g. 5 words) might dilute Levenshtein scores** → *Mitigation*: Tokens are normalized and compared. We also search bios and usernames for exact token presence, which offsets Levenshtein dilution.
