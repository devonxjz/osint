# PRD: OSINT Intelligence Platform v2 — Expanded Search Engine & Refactored API Architecture

**Version**: 2.0  
**Status**: Ready  
**Triage Label**: `ready-for-agent`  
**Priority**: High  

---

## Problem Statement

The Digital Footprint Tracker v1 handles only `USERNAME` and `EMAIL` inputs, routing them through a single OSINT engine and email breach scanner. As the platform expands to include **Real Identity Resolution** (name), **Phone Intelligence**, and **Domain Intelligence**, the existing structure has hit two major ceilings:

1. **Vercel Hobby Serverless Function Limit**: Vercel treats every top-level `.js` file directly inside the `/api` directory as an individual Serverless Function. In v1, this resulted in 7+ separate functions being deployed. Adding 3 new modules would exceed the **12-function limit** of the Vercel Hobby Plan.
2. **Execution Ceilings & Timeout Restrictions**: Vercel Hobby enforces a strict **10-second timeout**. Running multi-lane, highly concurrent scans (like generating 7 name variants across 50 platforms, or performing 200 subdomain DNS lookups) will trigger frequent timeouts, blocked IP addresses, and uncaught async abort crashes.

---

## Solution

Re-architect the backend into a clean two-layer structure to enforce exactly **one Vercel Serverless Function** deployment. Implement a **Unified Search Endpoint** (`/api/scan`) that auto-detects 5 input vectors, dispatches scans to specialized asynchronous engines concurrently, and streams real-time JSON events down a single SSE channel. Enhance performance and security through robust network proxy caching, pre-flight Wildcard DNS detection, secure HTTPS RDAP WHOIS lookups, and silent abort propagation.

---

## User Stories

### Architecture & Single-Function Deployment
1. As a developer, I want all backend logic stored outside the `/api` folder so that Vercel is forced to deploy exactly one Serverless Function gateway (`api/index.js`).
2. As a developer, I want all 5 scan pipelines routed through a single `/api/scan` SSE stream so that the frontend does not require complex routing logic for different input types.
3. As a developer, I want the system to silently exit on `AbortError` without polluting server logs or sending dead-client SSE errors.
4. As an investigator, I want to see a "Deep Scan" toggle switch in the SearchBar when a Domain or Real Name input is detected, so that I can opt-in to scanning secondary name variants or deeper DNS lookups.

### Input Analysis & Auto-Detection
5. As an investigator, I want to paste any input (e.g., SĐT `0901234567`, name `John Doe`, domain `test.co.uk`) and have the system auto-detect the correct category immediately.
6. As a student, I want VN phone formats to normalize automatically to E.164 (`+84901234567`) so that local number queries do not fail.
7. As a threat researcher, I want usernames with dots (like `john.doe`) to be recognized as `USERNAME` while domains (like `john.io`) are correctly classified as `DOMAIN`.

### Identity Resolution (Name Scan)
8. As an investigator, I want to search a person's real name so that the system generates candidate username variants (like `john_doe`, `johndoe`, `john.doe`) and queries social media platforms.
9. As a developer, I want real name searches to skip obscure websites and query a curated subset of high-value social platforms to reduce network noise.
10. As a developer, I want variant checks to stop testing further usernames on a specific platform as soon as a match is found (per-platform early termination) to avoid rate limits.
11. As an investigator, I want found accounts to be assigned a confidence badge (HIGH, MEDIUM, LOW) based on whether the profile bio confirms the target's real name.

### Phone Intelligence
12. As an investigator, I want to input a telephone number so that the carrier, region, caller ID name, and OTT social accounts are resolved concurrently.
13. As an analyst, I want to see if the target phone number is linked to any known database breaches or leaks.

### Domain Intelligence
14. As a network administrator, I want subdomain scans to detect Wildcard DNS so that they do not output 200 false-positive subdomains sharing the same wildcard IP.
15. As a security expert, I want Cloudflare wildcard proxies to bypass wildcard filtering so that we do not drop valid subdomains hosted behind CDN shields.
16. As an investigator, I want to query Certificate Transparency logs and reverse-IP lookups to discover hidden subdomains and co-hosted server sites.

---

## Implementation Decisions

### 1. File Restructuring (Architecture Plan B)
- **Rename root directory**: Rename the existing `/api` folder (which contains direct utility modules) to `/backend` at the project root.
- **Vercel gateway bridge**: Create a single file `api/index.js` that acts as the sole Vercel-monitored entry point. It imports the Express application from `/backend/index.js` and exports it:
  ```javascript
  const app = require('../backend/index');
  module.exports = app;
  ```
- This ensures Vercel compiles exactly **one** serverless function, well within the 12-function cap.

### 2. Ambiguity Parsing & Normalization
The `Input Analyzer` implements a top-down priority chain: `EMAIL → DOMAIN → PHONE → REAL_NAME → USERNAME → INVALID`.
- **EMAIL**: Matches standard RFC 5322 regex.
- **PHONE**: Normalized E.164. Recognizes local formats (digits-only, starting with `0`, length 9-11) or international numbers (7-15 digits starting with `+` or `00`).
- **DOMAIN**: Matches strings containing at least one dot followed by a recognized alphabetic TLD (2-6 chars, e.g. `.com`, `.vn`, `.io`).
- **REAL_NAME**: Matches 2-5 space-separated words containing only alphabetic letters and diacritics. Single-word names default to `USERNAME`.
- **Vietnamese Diacritics Normalization**: For name targets containing Vietnamese accents (e.g. `Nguyễn Văn A`), the `Input Analyzer` always normalizes the string to base ASCII (e.g. `Nguyen Van A`) by running `.normalize('NFD').replace(/[\u0300-\u036f]/g, '')` and mapping `đ/Đ -> d/D` *before* generating username variants. This ensures that accurate, standard ASCII variants like `nguyenvana`, `nguyen_van_a`, and `nguyen.van.a` are generated, guaranteeing high match rates across global social platforms.
- **USERNAME**: Alphanumeric + `_`, `-`, `.`, min 2, max 64 chars.

### 3. Identity Resolution Concurrency & Variant Early Termination
- **Target Filtering**: Real name queries only scan a high-value subset of **top 10-15 social platforms** in the registry.
- **Per-Platform Early Termination**: When checking variants (e.g., `johndoe`, `john_doe`) on a platform, they are checked in order of probability. The moment any variant returns `FOUND`, further variant queries for *that specific platform* are aborted.
- **Parallel Platform Scans**: Platforms continue to run in parallel; a match on Platform A does not delay or block Platform B.
- **Variant Limits**: By default, only the top 4 variants are scanned. Secondary variants require a `deep_scan=true` flag.
- **Deep Scan UI Switch**: The `<SearchBar />` component will display a custom styled, micro-animated glassmorphic toggle switch labeled "Deep Scan" *only* when the detected input type is `REAL_NAME` or `DOMAIN`. Enabling this toggle appends the `deep_scan=true` parameter to the `/api/scan` request.

### 4. Wildcard DNS Mitigation with Cloudflare Proxy Bypass
- **Pre-flight probe**: Query a randomized non-existent subdomain (e.g., `random-wildcard-check-12345.example.com`).
- **Wildcard Detection**: If it resolves to an IP address, wildcard DNS is flagged.
- **Bypass Filters**: Filter out any subdomain in the 200-dictionary scan that resolves to this wildcard IP **unless** the IP belongs to a Cloudflare IP range.
- **Cloudflare Dynamic Sync**: To prevent hardcoded IP ranges from going stale, Cloudflare's IPv4 ranges are fetched dynamically from `https://www.cloudflare.com/ips-v4` at server startup and cached in-memory. If the network call fails, the engine falls back to a robust static pre-seeded Cloudflare IP list.

### 5. Firewalled WHOIS/RDAP Lookup
- **Eliminate TCP Port 43**: Do not use system `whois` commands or TCP socket connections that are blocked by Vercel's Serverless environment.
- **Primary source**: Query `rdap.org` JSON-based HTTPS API on Port 443.
- **Secondary fallback**: Query `whois.freetools.io` or similar JSON API over HTTPS if `rdap.org` fails.

### 6. Abort Propagation and Silence
- **Signal Passing**: Every scan engine must accept `signal` (AbortSignal) and pass it down.
- **HTTP Aborts**: Bind the `signal` to all `axios/fetch` network operations (RDAP, crt.sh, reverse-IP).
- **Silent Exit**: Wrap all engines in robust `try/catch` scopes. If an error's name is `'AbortError'` or matches a canceled connection, **exit silently** (do not emit SSE error events, do not write error logs).

### 7. API Rate-Limiting & Defensive Retry Policy
To protect the backend from being blocked by third-party OSINT providers (specifically `crt.sh` and `hackertarget.com`), the following rate limit policies are strictly enforced:
- **Explicit No-Retry on Vercel**: Due to the Vercel Hobby 10-second timeout ceiling, we explicitly **do not retry** failed requests when an HTTP status `429 Too Many Requests` is returned.
- **Silent Fallback**: In the event of a `429` status code, the engine catches the error and immediately emits a structured `INFO` SSE result: `"Rate limit encountered; domain intelligence records for this platform are temporarily unavailable."` ensuring the overall scan finishes successfully and without delay.

### 8. PDF Dossier Size Cap & Timeout Mitigation
To prevent `pdfkit` rendering timeouts on huge data grids (e.g. 50+ certificates or 30 reverse-IP domains), the PDF generation pipeline implements strict truncation:
- **Certificate Logs Cap**: Deduplicated certificates in the PDF are capped at the **top 15 most recent entries**.
- **Reverse IP Domains Cap**: Reverse-IP co-hosted domains listed in the PDF table are capped at the **top 10 entries**.
- This ensures the PDF generation buffers compile in under 500ms and never hit Vercel serverless timeout walls.

---

## Testing Decisions

- **Good Test Criteria**: Test only external public behavior (analyzing inputs, normalized output shapes, correct event streams) and avoid asserting on internal private state or intermediate variables.
- **Unit Tests**:
  - `analyzer.test.js`: Expand to 20+ variations testing local phone normalization, TLD domain identification, and real name parsing.
  - `phone_validator.test.js`: Assert correct Vietnamese carrier mappings.
  - `domain_engine.test.js`: Mock DNS resolution (including wildcard IP match/bypass), mock RDAP response, and verify subdomain dictionary enumeration filters.
  - `identity_engine.test.js`: Verify variant generator arrays, confidence calculations, and per-platform early-termination logic.
- **Integration Tests**:
  - Verify that when client disconnects during an active `domain` or `identity` scan, the system triggers the abort signal and terminates silently.

---

## Out of Scope

- Authenticated social scraping requiring active user cookies or sessions.
- Direct TCP Port 43 WHOIS requests.
- Live SMTP handshakes or real-time SMS pings.
- Persistent databases (remains RAM-only cache for Vercel deployment).

---

## Further Notes

- By implementing a single gateway (`api/index.js`) and routing all scanning pipelines through the Express router in `/backend/`, the application aligns 100% with the Vercel Hobby tier's limits while remaining extremely fast and modular.
