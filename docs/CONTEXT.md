# Domain Context: Digital Footprint Tracker (OSINT)

## Glossary
* **Target**: Subject of investigation. Identified by username, email, telephone number, name, or domain.
* **OSINT Engine**: Core orchestrator. Queries multiple social platforms concurrently.
* **Scan**: Async process checking target presence across platforms.
* **False Positive**: Platform returns status 200 OK but target does not exist.
* **Dossier**: PDF report containing target OSINT findings.
* **Domain Intelligence**: Domain infrastructure audit comprising RDAP WHOIS records, DNS resolution, Subdomain brute-forcing, Certificate Transparency log parsing, and Reverse IP mapping.
* **Identity Resolution (Name Scan)**: The process of mapping full names to candidate username variants and querying social platforms to aggregate digital footprint confidence scores (HIGH, MEDIUM, LOW).
* **Phone Intelligence**: Dynamic E.164 phone validation, carrier prefix analysis, Caller ID parsing, and OTT profile resolution.
* **Unified Scan Endpoint**: A consolidated EventSource route `/api/scan` that classifies the 5 target vectors and orchestrates all scans concurrently through a single Express handler.
* **Abort Propagation**: The mechanism of forwarding `AbortSignal` down the entire OSINT engine execution chain; any `AbortError` must be handled silently (silent exit) without polluting logs or SSE streams.

## System Architecture
* **Frontend**: Svelte (Vite) Single Page App. Real-time updates via SSE. Features context-specific workspaces: Username scans show grid of platforms, Email scans show breach aggregates and permutations, Telephone scans show specialized Phone Dossier Panel (validation, carrier, caller ID, simulated OTT accounts), and Domain scans show a Domain Intelligence Panel.
* **Backend**: Node.js Express Server, refactored to `/backend/` with a single Serverless gateway at `/api/index.js` to strictly enforce a single Vercel Serverless Function deployment. Handles 5-vector input analysis, concurrent scans with abort signals, proxying, and PDF generation with zero-dependency WHOIS/RDAP over HTTPS.
* **UI Theme**: Clean Modern SaaS Interface (Vercel/Linear style). Sleek typography (Inter), gorgeous shadows, clean cards, slate/blue accents, light/dark mode support. Real-time scanning progress tracking.
