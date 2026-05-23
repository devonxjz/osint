# Task 26: Cytoscape.js Integration & Svelte 5 Tab Layout

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: HITL
- **Status**: [x] Completed
- **Blocked by**: Task 21, Task 22, Task 23, Task 24, Task 25
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Design and implement a glassmorphic 2-tab layout ("Dossier View" and "Network Graph") inside `src/lib/DomainDossierPanel.svelte` using Svelte 5 state reactivity. Embed `Cytoscape.js` inside the Network Graph tab to load and render the streamed in-memory graph (`nodes` and `edges`) in real-time using a force-directed layout (e.g. `cose` layout) and HSL themed group colors.

## Acceptance criteria
- [x] Add a premium micro-animated Tab component in `DomainDossierPanel.svelte` supporting smooth transistions between structural and graph representations.
- [x] Create a container div `cytoscape-canvas` with responsive height (`min-h-[560px]`).
- [x] Install and configure `cytoscape.js` to render the JSON graph nodes and edges.
- [x] Apply elegant cyberpunk styled nodes based on `group` properties (Domain: glowing blue, IP: orange, Email: green, Social: red, Trackers: pink).
- [x] Conduct a design review with the user verifying layout aesthetics and canvas reactivity.
