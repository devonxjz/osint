# Task 25: Search-Based Metadata Range-Request Document Scraper

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: Task 20
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Build a lightweight document discovery search (via DuckDuckGo scrape / Google Custom Search API fallback) to identify top 8 exposed documents (PDF, DOCX). Execute partial HTTP Range Requests (fetching only the first **48KB** via `Range: bytes=0-49151` headers) to scrape document header metadata (Creator/Author, Email) without full binary downloads. Secure this with an **18s hard timeout** and caching.

## Acceptance criteria
- [x] Implement search dorking to locate top 8 exposed target files (`site:domain.com filetype:pdf OR filetype:docx`).
- [x] Implement HTTP Range Request downloading exactly the first **48KB** of each found file.
- [x] Write lightweight regex-based binary parsers to extract Creator, Author, and Email strings from the 48KB buffer (with a fallback to `metadataExtracted: false` node properties on failure).
- [x] Wrap the task in an **18s hard timeout** using Promise racing.
- [x] Store document results in a cache (24h TTL) to avoid duplicate search engine rate-limiting.
- [x] Add tests verifying range-request parsing and fail-safe search fallback behavior.
