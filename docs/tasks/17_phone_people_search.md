# Task 17: Phone People Search & Dorking Aggregator

- **Module**: Module 5 - Data Brokers & Dorking Engine
- **Type**: AFK
- **Status**: [x] Completed
- **Blocked by**: [x] Task 15: Phone Input Validation & Carrier Lookup
- **Labels**: `ready-for-agent`

## Parent
[docs/prds/prd-telephone-system-design.md](file:///c:/Users/ADMIN/Documents/MyProject/osint/docs/prds/prd-telephone-system-design.md)

## What to build
Build the Data Brokers and Search Engine Dorking scraper interface. This module simulates searching for the phone number across online records aggregates (FastPeopleSearch, TruePeopleSearch, Pipl) and performs targeted Google Custom Dorking queries to locate addresses, relatives, and workplace/business profiles.

## Acceptance criteria
- [x] Implement `api/phone/people_search.js` with search function `searchPeopleData(phone)`.
- [x] Construct realistic mock records return for non-production environments based on country code (e.g. returning address coordinates, relatives list, and business affiliations) using deterministic seed-based mocking.
- [x] Add Google Custom Dorking query builder that produces target-specific search URLs. These URLs will be rendered on the Svelte frontend via a dedicated `<DorkLinksPanel />` component on the Dashboard (and omitted from `<DossierExport />` PDFs to maintain document cleanliness).
- [x] Write a test suite `tests/phone_people_search.test.js` validating data schema outputs (`name`, `realAddress`, `relatives`, `business`, `dorkUrls`) and ensuring clean structural fallbacks.
