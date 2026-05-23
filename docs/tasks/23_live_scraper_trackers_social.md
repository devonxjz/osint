# Task 23: Live Page Scraper (Analytics Trackers & Social Mapping)

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: Task 20
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Implement the async function `scrapeLivePage()` inside `backend/domainEngine.js protected by a **2500ms timeout**. It scrapes the target's homepage HTML using `cheerio` or regex, extracts Google Analytics/Adsense codes (**Tracker Nodes**), and discovers social backlinks/Facebook/Twitter tags (**Social Nodes**), appending them with `USES_TRACKER` and `ASSOCIATED_WITH` edges to the graph.

## Acceptance criteria
- [x] Implement `scrapeLivePage(domain)` fetching the main URL with custom user-agents and a 2500ms timeout.
- [x] Parse page body via regex for Google Tracking IDs (`UA-\d+-\d+`, `G-[A-Z0-9]+`) and Adsense publisher IDs (`pub-\d+`).
- [x] Parse outbound links for common social networks (Facebook, Twitter, LinkedIn, Instagram).
- [x] Map discovered trackers and social links as **Tracker** and **Social** nodes with `group` styling metadata in the JSON graph.
- [x] Write Jest tests simulating homepage content with trackers and verifying they are parsed correctly.
