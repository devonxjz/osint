# Task 24: Robots.txt & Wayback Archive Explorer

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: Task 20
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Implement `fetchRobotsTxt()` (to discover hidden admin/private paths) and `fetchWaybackHistory()` (to fetch previous interface snapshot dates via Wayback CDX API) in `backend/domainEngine.js`. Integrate them in the Parallel Harvest Queue with individual **2500ms timeouts**, mapping them as **Hidden Page** and **Historical Record** nodes in the dynamic graph.

## Acceptance criteria
- [x] Implement `fetchRobotsTxt(domain)` parsing `robots.txt` for disallow directories, and mapping up to 5 exclusions as **Hidden Page** nodes.
- [x] Implement `fetchWaybackHistory(domain)` querying the public Wayback Machine CDX index for 3 historical snapshots, mapping them as **Historical Record** nodes.
- [x] Wire both tasks in parallel via `Promise.all` inside `resolveDomainIntel()` under full `try/catch` and timeout safeguards.
- [x] Write tests ensuring that failing to reach Wayback or robots.txt does not crash the main scan and allows a clean fallback.
