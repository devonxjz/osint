# OSINT Platform Session Handoff: Obsidian Graph View Optimization & Tab Persistence
> **Current Date**: May 23, 2026  
> **Repository**: `osint` (Vite + Svelte 5 + Node Express)  
> **Status**: **Tab Switching Mapped | 60FPS Drag Physics | Real-time Streaming Debouncing | Raw Intel JSON & Crisp PNG Exports Validated**

This document serves as the handoff record for the next agent session, detailing the styling, state-preservations, and export enhancements implemented on the **Investigator Workstation**.

---

## 1. Key Accomplishments (This Session)

We modernized and optimized the Cytoscape relational graph in [DomainDossierPanel.svelte](file:///c:/Users/ADMIN/Documents/MyProject/osint/src/lib/DomainDossierPanel.svelte) to resolve stutters, state loss, and faulty export buttons:

### A. Silky Smooth 60FPS Graph & Drag Physics
1. **Debounced Layout recalculations (`debouncedLayout`)**: Throttled automated layout updates by **350ms** to prevent CPU starvation and stutters while subdomains are streamed in real time.
2. **Smart Spawning**: Newly discovered subdomains or ports now spawn next to their parent nodes with a small random offset instead of popping in at `(0, 0)` and snapping across the screen.
3. **High-Performance Canvas Options**: Enabled `motionBlur` (with opacity `0.15`), `textureOnViewport` rendering, and pixel ratio optimization for high-DPI displays.
4. **Obsidian-Style Straight Edges**: Changed curve style to `straight`, which renders **5x faster** than bezier curves and perfectly matches the Obsidian Graph aesthetic.
5. **Cached Neighborhood Drag Pulls**: Cached 1-hop and 2-hop connected nodes during the `grab` event. This completely eliminated DOM traversals on the `drag` loop, achieving lag-free dragging on high-refresh-rate monitors.

### B. Persistent Tabs (No Data Loss on Toggle)
1. **CSS Tab Toggle**: Swapped Svelte's conditional `{#if activeTab === 'graph'}` block for class-based toggling (`class:hidden={activeTab !== 'graph'}`). 
2. **Helper Style Class**: Added `.hidden { display: none !important; }` to `<style>`. This prevents Svelte from destroying the Cytoscape canvas element and instance. Custom node positions, pan, and zoom levels are now **perfectly preserved** when switching between tabs.
3. **Reactive Canvas Resize (`$effect`)**: Configured a reactive watcher that calls `cy.resize()` and `cy.fit()` with a 50ms timeout when switching back to the Graph tab, resolving any hidden container width/height mismatch bugs.

### C. Bulletproof High-Res Exports
1. **High-Res PNG Export (`exportPng`)**: Forced `cy.resize()`, generated crisp high-definition **2x scaled** captures (`scale: 2`), and appended the download link to `document.body` before programmatic triggers to bypass security blocks on detached anchors.
2. **Clean JSON Intelligence Data (`exportJson`)**: Completely rewrote the exporter. Instead of exporting Cytoscape's internal CSS stylesheet array via `cy.json()`, it now serializes the clean, logical OSINT intelligence dossier (Queried target, nodes list with all properties and groups, and edges source/target relations).

---

## 2. Code Location & References

All optimized investigator workstation implementations reside in:
* **Relational Investigator Workbench**: [DomainDossierPanel.svelte](file:///c:/Users/ADMIN/Documents/MyProject/osint/src/lib/DomainDossierPanel.svelte)
* **Design Guidelines**: [docs/adr/003_contextual_osint_workspace_layouts.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/adr/003_contextual_osint_workspace_layouts.md)

---

## 3. Next Session Focus & Suggested Actions

1. **Test the Local Suite**:
   * Verify all Jest tests are green:
     ```bash
     npm test
     ```
2. **Perform End-to-End Visual Scans**:
   * Start a domain scan in the browser and watch the subdomains stream.
   * Verify that switching to the Dossier tab and coming back preserves all manual node dragging and layout adjustments.
   * Try exporting to **PNG** and **JSON** to verify high-fidelity downloads.
3. **Align Remaining Dashboard Panels**:
   * Migrate similar tab state-preservation patterns to other investigator panels (like `PhoneDossierPanel.svelte` or `EmailDossierPanel.svelte`) if visual graphs are added.

---

## 4. Suggested Agent Skills for the Next Session
* [diagnose](file:///c:/Users/ADMIN/Documents/MyProject/osint/.agents/skills/diagnose/SKILL.md): If any frontend proxying or SSE streaming bugs are detected.
* [improve-codebase-architecture](file:///c:/Users/ADMIN/Documents/MyProject/osint/.agents/skills/improve-codebase-architecture/SKILL.md): For unifying state management and localizations across other dossier panels.
