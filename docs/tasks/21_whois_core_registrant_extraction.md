# Task 21: WHOIS Core & Registrant Entity Extraction

- **Module**: Section 4 - Phân Tích Tên Miền
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: Task 20
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-domain_name-sd.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-domain_name-sd.md)

## What to build
Enhance `fetchWhoisRdap()` and `resolveDomainIntel()` in `backend/domainEngine.js` to extract the registrant name and email address from the RDAP registration event lists and bootstrap WHOIS response. Map them to **Domain**, **Email**, and **Real Name** nodes with associated `REGISTERED_BY` and `OWNED_BY` edges, and stream them dynamically through the SSE gateway.

## Acceptance criteria
- [x] Implement `extractWhoisRegistrant()` to parse owner name and registrant email from nested RDAP JSON paths.
- [x] If WHOIS is privacy-protected (WhoisGuard), add nodes reflecting redaction with a specific `properties.privacyProtected: true` flag.
- [x] Populate `graph.nodes` and `graph.edges` with the found Domain, Email, and Real Name entities.
- [x] Write integration test cases in `tests/api.test.js` or a new test verifying that these registrant nodes are emitted correctly over `/api/scan`.
