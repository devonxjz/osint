# Domain Context: Digital Footprint Tracker (OSINT)

## Glossary
* **Target**: Subject of investigation. Identified by username, email, telephone number, name, or domain.
* **OSINT Engine**: Core orchestrator. Queries multiple social platforms concurrently.
* **Scan**: Async process checking target presence across platforms.
* **False Positive**: Platform returns status 200 OK but target does not exist.
* **Dossier**: PDF report containing target OSINT findings.
* **Domain Intelligence**: Domain infrastructure audit comprising RDAP WHOIS records, DNS resolution, Subdomain brute-forcing, Certificate Transparency log parsing, and Reverse IP mapping.
* **Domain OSINT Network Graph**: An in-memory, highly relational data structure consisting of 10 distinct Node types (Domain, Subdomain, IP, Email, Real Name, Tracker, Social, Document, Hidden Page, Historical Record) and their associated Edges streamed dynamically via Server-Sent Events (SSE).
* **Parallel Harvest Queue**: An asynchronous Node.js execution pipeline that gathers DNS, live page trackers, robots.txt exclusions, Wayback CDX snapshots, and search dorks concurrently, protected by individual 2500ms timeouts.
* **Investigator Workbench**: An interactive graph dashboard driven by Cytoscape.js featuring quick floating controls, node group filtering, and a sliding detail panel with contextual "Click-to-Investigate" action bindings.
* **Lightweight Document Crawler**: A fail-safe metadata extraction engine that queries public search APIs and performs partial HTTP Range requests (capped at 48KB) to parse document headers without full binary downloads.
* **Identity Resolution (Name Scan)**: The process of mapping full names to candidate username variants and querying social platforms to aggregate digital footprint confidence scores (HIGH, MEDIUM, LOW).
* **Phone Intelligence**: Dynamic E.164 phone validation, carrier prefix analysis, Caller ID parsing, and OTT profile resolution.
* **Unified Scan Endpoint**: A consolidated EventSource route `/api/scan` that classifies the 5 target vectors and orchestrates all scans concurrently through a single Express handler.
* **Polymorphic OSINT Engine**: A multi-tiered crawling architecture routing username targets across three dedicated scraping layers: API, HTML, and Browser (Playwright).
* **Dynamic Concurrency Lanes**: Three separate, parallel execution queues (API, HTML, and Browser) protecting target system resources (capping Playwright at 2 threads) while maximizing unauthenticated API lanes to 30 threads.
* **Hybrid Playwright Fallback**: The automatic mechanism that detects Vercel hosting (`process.env.VERCEL`) to bypass local browser rendering, downgrading to high-evasion Axios network queries to fit serverless environment limits.
* **Abort Propagation**: The mechanism of forwarding `AbortSignal` down the entire OSINT engine execution chain; any `AbortError` must be handled silently (silent exit) without polluting logs or SSE streams.

## System Architecture
* **Frontend**: Svelte (Vite) Single Page App. Real-time updates via SSE. Features context-specific workspaces: Username scans show grid of platforms, Email scans show breach aggregates and permutations, Telephone scans show specialized Phone Dossier Panel, and Domain scans show a responsive Investigator Workbench split into Dossier View and Network Graph tabs.
* **Backend**: Node.js Express Server, refactored to `/backend/` with a single Serverless gateway at `/api/index.js` to strictly enforce a single Vercel Serverless Function deployment. Executes a parallel harvest queue with 2500ms timeout safeguards, Range-based HTTP header scraping, and memory-cached Cloudflare IP checks.
* **UI Theme**: Clean Modern SaaS Interface (Vercel/Linear style). Sleek typography (Inter), gorgeous shadows, clean cards, slate/blue accents, light/dark mode support. Real-time scanning progress tracking.
