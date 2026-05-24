# ADR 004: Lightweight In-Memory Domain OSINT Graph & Serverless Parallel Harvesting

## Status
Accepted

## Context
The Product Requirements Document (PRD v2.0) proposed a stateful, microservices-based architecture for the Domain OSINT & Reconnaissance Platform, consisting of a Java Spring Boot Orchestrator, Python Scraping Workers, RabbitMQ message brokers, PostgreSQL, and a Neo4j Graph Database. 

However, the existing codebase is built on a highly optimized, lightweight, serverless-ready stack featuring a Svelte 5 (Vite) frontend and a Node.js Express backend. The entire platform compiles into a single serverless function (via a single unified gateway in `api/index.js`) to strictly satisfy Vercel's 12 serverless function limitation.

Deploying stateful, long-running services like Neo4j, RabbitMQ, and Spring Boot inside a serverless ecosystem is highly expensive, difficult to maintain, and contradicts the lightweight Vercel deployment model.

## Decision
We decided to optimize and adapt the PRD's Domain OSINT Graph requirements directly within the existing lightweight Node.js/Svelte 5 stack through three core architectural adaptations:

1. **In-Memory Graph Construction & Streaming**:
   - Rather than storing nodes and edges in a stateful Neo4j database, the Express backend builds the Domain OSINT Network Graph `{ nodes, edges }` completely *in-memory* during the scan.
   - The graph structure supports 10 distinct Node types (Domain, Subdomain, IP, Email, Real Name, Tracker, Social, Document, Hidden Page, Historical Record) with dynamic `group` and `properties` attributes.
   - Detections and graph chunks are streamed to the Svelte client in real-time over the existing single `/api/scan` Server-Sent Events (SSE) gateway.

2. **Parallel Harvest Queue with Timeout Protection**:
   - Upstream WHOIS registration metadata and crt.sh subdomains are resolved first.
   - Downstream scrapers—including `scrapeLivePage()`, `fetchWaybackHistory()`, `fetchRobotsTxt()`, and search-based document discovery—run concurrently under `Promise.all` in a parallel harvest queue.
   - Each scraping task is protected by an independent **2500ms timeout** and isolated `try/catch` blocks.
   - Public document metadata extraction uses HTTP Range Requests (`Range: bytes=0-49151`) to pull only the first **48KB** of binary files (PDF/DOCX) on-the-fly, capping the crawler's execution budget under an **18s hard timeout**.

3. **Client-Side Interactive Graph Rendering (Investigator Workbench)**:
   - Svelte 5 dynamically renders the dynamic graph using **Cytoscape.js** within a custom glassmorphic canvas (`min-h-[560px]`).
   - The workbench is split into a "Dossier View" (structural tables) and "Network Graph" (interactive graph) using tabbed layouts.
   - Floating graph controls provide Fit View, Reset Layout, PNG/SVG exports, and Node Group toggles.
   - Clicking a Node slides out a details side panel with contextual "Click-to-Investigate" action bindings that pre-fill search vectors and trigger secondary scans.

## Consequences
- **Zero Infrastructure Cost**: The entire system runs inside free-tier serverless environments (Vercel) without maintaining Neo4j cluster instances or microservice servers.
- **Fail-Safe Robustness**: A failure in one scraper (e.g. Wayback archive downtime) is isolated by individual timeouts and does not fail the primary subdomain/DNS scan.
- **Microsecond Response Latency**: Constructing and streaming the graph in-memory avoids database query overhead and speeds up the trinh sát loop.
- **Seamless UX**: High-fidelity Cytoscape.js canvas rendering provides a state-of-the-art cyber-intelligence look.
- **Limitation**: The system does not natively support historical cross-scan correlation queries (e.g., finding overlapping tracker IDs across separate user investigations), which can be added later via cloud database integrations.
