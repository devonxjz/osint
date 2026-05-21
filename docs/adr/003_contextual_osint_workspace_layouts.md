# ADR 003: Contextual OSINT Workspace Layouts in Frontend UI

## Status
**Accepted**

## Context
As the OSINT Suite expands from simple username searches to support email data breach checks and telephone intelligence scans, the nature of the scanned data diverges significantly:
* **Username Scans**: Yields binary presence maps across ~50 platforms, best represented as status grids.
* **Email Scans**: Yields data breach listings, breach statistics, and username permutations.
* **Telephone Scans**: Yields carrier metadata, reverse Caller ID records, simulated OTT profiles (Zalo, Telegram, WhatsApp), and clickable Google Dorking queries.

We considered two primary layout alternatives:
1. **Generic Tabbed Layout**: A single multi-purpose UI container with tabs. This results in heavy tab clicking and an empty/unintuitive interface when the user inputs a new search target.
2. **Context-Specific Panel Swap (Selected)**: The dashboard dynamically switches layouts depending on the *type* of input entered (autodetected via regex: `USERNAME`, `EMAIL`, or `PHONE`). 

Furthermore, we resolved the following UI/UX split:
* **Intelligence Output (Left Column)**: Holds actual data findings (Caller ID, OTT Profiles, Google Dorks).
* **Operational Control (Right Column)**: Holds progress tracking, stream logs (Terminal), and the unified Dossier Export trigger.

## Decision
We will implement dynamic **Contextual OSINT Workspace Layouts** on the frontend, managed by `ScannerState` and rendered in `App.svelte`:
1. **Dynamic Target Detection**: The input target's type is classified reactively.
2. **Dynamic UI Swapping**:
   - If the type is `USERNAME`: Render the 50-platform grid (left) and operational console/summary (right).
   - If the type is `EMAIL`: Render the breach statistics/permutations (left) and operational console (right).
   - If the type is `PHONE`: Render the specialized `<PhoneDossierPanel />` (left) containing validation, Caller ID, OTT profiles, and `<DorkLinksPanel />` underneath. The platform grid is completely hidden to prevent cognitive overload.
3. **Single Download Entry Point**: The `DossierSummary` card (right) remains the single, consistent entry point to trigger PDF reports (`downloadDossier()`) across all 3 scanning profiles.

## Consequences
* Improves UX consistency by maintaining a unified dashboard while tailoring the output grid to match the target's data structure.
* Promotes progressive disclosure (real-time streaming updates populating the UI incrementally).
* Simplifies component design by separating "intelligence findings" (left) from "operational metadata" (right).
