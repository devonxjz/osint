# Handoff: OSINT Digital Footprint Tracker

## Context & Selected Architecture
* **Goal**: Cross-platform username & email OSINT footprint tracker for university lab.
* **Arch**: Client-Server split (React/Vite frontend + Express Node.js backend).
* **DB**: RAM-only (no DB persistence).
* **Theme**: Clean SaaS dashboard (Light/Dark obsidian toggles, slate/blue accents).
* **Concurrency**: 15 parallel queries per batch, 100ms throttle delay -> avoid IP blocks.
* **False Positive Check**: Declarative registry matcher (HTTP status codes, Cheerio HTML parsing, body text substrings).
* **Workspace Directories**:
  * `be/` - Backend Node.js Express server (renamed from `backend` by user).
  * `frontend/` - React client workspace (not yet initialized).

## Current Progress & Files
1. **Core Config Registry**: Created `be/src/registry.js` with 40 target platforms, matching rules, and categories.
2. **Scraper Scaffold**: Created `be/src/scanner.js` with Cheerio metadata parsing and request handling.
3. **Core Specification Documents**:
   * Master Plan & Specs: [docs/prd_and_specs.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prd_and_specs.md)
   * Detailed module sub-PRDs: [docs/prds/](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/)
   * Detailed specification for Module 1 & 2: [docs/claude_spec_prd_module_12.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/claude_spec_prd_module_12.md)

## Next Session Focus
1. Write detailed specs for remaining modules (Modules 3-7).
2. Write clean code implementation for **Module 1 (Input Analyzer)** in `be/src/analyzer.js` and **Module 2 (Platform Registry)** in `be/src/registry.js` adhering to [docs/claude_spec_prd_module_12.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/claude_spec_prd_module_12.md).
3. Set up Jest testing suite in `be/` and verify specs.
4. Initialize the React SPA in `frontend/`.

## Recommended Skills for Next Session
* **tdd**: Build Module 1 (Input Analyzer) using test-driven development.
* **improve-codebase-architecture**: Perfect Express middleware structures and Server-Sent Events router pipelines.
* **diagnose**: Troubleshoot potential false-positives and timeout errors on complex web targets.
