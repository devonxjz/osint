# Task 08: SaaS Dashboard UI & Express SSE Integration

## Acceptance Criteria

- [x] **ADR Document (Framework Alignment)**: Formally record Svelte 5 + Vite + TypeScript selection inside `docs/adr/001_framework_choice_svelte5.md` to align PRD requirements with the pre-existing workspace context.
- [x] **Reactive State Orchestrator (`ScannerState`)**:
  - [x] Implement in `fe/src/lib/scanner.svelte.ts` using Svelte 5 Class Runes.
  - [x] Map SSE EventSource endpoints to private handlers (`handleProgress`, `handleResult`, `handleError`, `handleEnd`).
  - [x] Implement cleanup inside `cancelScan()` (terminating socket, resetting state variables, printing warning console log).
  - [x] Define explicit TS typings for card status machine (`PENDING | SCANNING | FOUND | NOT_FOUND`).
  - [x] Add global dark/light `theme` toggling and document root injection.
  - [x] Implement HIBP email breach mock datasets triggers.
- [x] **SaaS Obsidian Theme (`fe/src/app.css`)**:
  - [x] Build responsive CSS grids mapping layouts.
  - [x] Implement modern glassmorphism, rounded borders, and multi-layer box shadows.
  - [x] Configure pure HSL-hued color palette for Light and Dark modes.
  - [x] Create dynamic keyframe animations (`pulse-glow`, `card-pulse`) for active scans.
- [x] **Component 1: SearchBar (`fe/src/lib/SearchBar.svelte`)**:
  - [x] Display input validation icon reflecting target type (`📧` for Email, `👤` for Username, `🔍` for Empty).
  - [x] Provide clickable filter chips for Tech, Social, Gaming, and Media.
- [x] **Component 2: CardGrid (`fe/src/lib/CardGrid.svelte`)**:
  - [x] Render all 40 footprint platforms sorted by categories.
  - [x] Bind cards to state machine statuses: `PENDING`, `SCANNING`, `FOUND`, `NOT_FOUND`.
  - [x] Make found profiles clickable, leading directly to validated targets.
- [x] **Component 3: LogConsole (`fe/src/lib/LogConsole.svelte`)**:
  - [x] Display a dark terminal console printing raw scan logs.
  - [x] Use Svelte `$effect` to automatically scroll the shell to the bottom on new log additions.
- [x] **Component 4: BreachCard (`fe/src/lib/BreachCard.svelte`)**:
  - [x] Display HIBP threat events for email investigations.
  - [x] Style incidents with warning borders and list compromised data fields.
- [x] **Component 5: DossierSummary (`fe/src/lib/DossierSummary.svelte`)**:
  - [x] Show target dossier details: active matches, avatar, search time.
  - [x] Trigger PDF download action.
- [x] **Quality Assurance & Verification**:
  - [x] Run `npm run check` inside `fe/` to verify flawless compilation (0 warnings, 0 errors).
  - [x] Run `npm run build` to confirm bundle packaging succeeds in under 1 second.
