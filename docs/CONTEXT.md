# Domain Context: Digital Footprint Tracker (OSINT)

## Glossary
* **Target**: Subject of investigation. Identified by username or email.
* **OSINT Engine**: Core orchestrator. Queries multiple social platforms concurrently.
* **Scan**: Async process checking target presence across platforms.
* **False Positive**: Platform returns status 200 OK but target does not exist.
* **Dossier**: PDF report containing target OSINT findings.

## System Architecture
* **Frontend**: React (Vite) Single Page App. Real-time updates via SSE.
* **Backend**: Node.js Express Server. RAM-only storage (no DB). Handles batched requests (Chunking size 15, delay 100ms), proxying, and PDF generation. Curated Registry of ~50 platforms categorized (Tech, Social, Gaming, Media) with UI category selection filters. False positive mitigation via declarative matching (HTTP status, HTML text substring, or cheerio selector checks). Hybrid Email Search: free Gravatar MD5 lookup + live HIBP API (if key provided) or high-fidelity simulated breach database.
* **UI Theme**: Clean Modern SaaS Interface (Vercel/Linear style). Sleek typography (Inter), gorgeous shadows, clean cards, slate/blue accents, light/dark mode support. Real-time scanning progress tracking.
