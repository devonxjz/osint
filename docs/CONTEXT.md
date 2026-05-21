# Domain Context: Digital Footprint Tracker (OSINT)

## Glossary
* **Target**: Subject of investigation. Identified by username, email, or telephone number.
* **OSINT Engine**: Core orchestrator. Queries multiple social platforms concurrently.
* **Scan**: Async process checking target presence across platforms.
* **False Positive**: Platform returns status 200 OK but target does not exist.
* **Dossier**: PDF report containing target OSINT findings.

## System Architecture
* **Frontend**: Svelte (Vite) Single Page App. Real-time updates via SSE. Features context-specific workspaces: Username scans show grid of platforms, Email scans show breach aggregates and permutations, and Telephone scans show a specialized Phone Dossier Panel (validation, caller ID, simulated OTT accounts, and custom Google Dorking).
* **Backend**: Node.js Express Server. RAM-only storage (no DB). Handles batched requests (Chunking size 15, delay 100ms), proxying, and PDF generation. Curated Registry of ~50 platforms categorized (Tech, Social, Gaming, Media) with UI category selection filters. False positive mitigation via declarative matching (HTTP status, HTML text substring, or cheerio selector checks). Hybrid Email Search: free Gravatar MD5 lookup + live HIBP API (if key provided) or high-fidelity simulated breach database. Real-time Phone Scan engine providing validation, carrier details, Caller ID (with Twilio VN fallback), People Search, and Simulated OTT sync.
* **UI Theme**: Clean Modern SaaS Interface (Vercel/Linear style). Sleek typography (Inter), gorgeous shadows, clean cards, slate/blue accents, light/dark mode support. Real-time scanning progress tracking.
