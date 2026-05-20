# ADR 002: Upgrade Platform Registry Schema and Evasion Models for 100+ Networks

## Status
**Accepted**

## Context
As we expand our digital footprint tracking capability from 40 basic platforms to a wider network of global, regional, forums, decentralized, privacy-focused, and dark web categories, the OSINT engine faces severe scaling bottlenecks:
1.  **Web Application Firewalls (WAFs)**: Major social media networks (Facebook, Instagram, LinkedIn, Douyin) employ aggressive bot-detection (e.g. Cloudflare, Akamai) that will instantly block raw Express/Axios server-side requests with `403 Forbidden` or `429 Too Many Requests`.
2.  **Varied Identifier Types**: Different platforms require different search parameter structures (e.g. phone numbers for WhatsApp, usernames for standard networks).
3.  **UI Categorization Clutter**: Displaying 100+ platforms in a flat list or under only 4 categories makes filtering and analysis sluggish.
4.  **Network Protocols**: Dark Web networks (`.onion` sites like Ahmia/Torch) cannot be resolved via standard HTTP without gateway wrappers or SOCKS5 Tor proxies.
5.  **Frontend Framework Inconsistency**: The original Module 7 PRD mentioned React/Vite, whereas the active client codebase is Svelte 5 + Vite + TypeScript. ADR 001 formally accepted Svelte 5 to align with the workspace, and all future specs must follow this framework alignment.

## Decision
We will upgrade the **Platform Registry Schema** and **OSINT Request Engine** to support advanced routing, evasion, and region-specific metadata.

All platform configurations will be refactored using the expanded `PlatformConfig` specification:
1.  **9 Distinct Categories**: `Social`, `Tech`, `Gaming`, `Media`, `Regional`, `Privacy`, `Forums`, `OSINT`, and `DarkWeb` to prevent UI clutter and allow deep, focused scanning.
2.  **Identifier Classification**: Maps each platform to an `identifierType` (`USERNAME`, `EMAIL`, `PHONE`, `DOMAIN`, `DARK_WEB_QUERY`) so that the scanner only executes query calls matching the input payload signature.
3.  **Evasion Protocols**:
    *   Inject dynamic, rotated modern browser headers and popular mobile/desktop User-Agent strings.
    *   Enable optional proxy routing hooks (`requiresProxy`) to route highly protected endpoints through proxy pools.
    *   **Secure Session Mapping**: Avoid hardcoding raw cookies in Git. Platform entries will specify an optional `envCookieKey?: string` (e.g., `LINKEDIN_COOKIE_KEY`), which the backend uses to resolve the actual cookie string from `.env` at runtime.
    *   **Per-Platform custom timeout**: Add `timeout?: number` to override the global 5s network timeout limit (crucial for slow regional servers and Tor gateways which require up to 15s–20s).
    *   **Secure Gateway Routing**: For `.onion` Dark Web search tools, the engine will route queries through a Tor SOCKS5 proxy configured in `.env` (`socks5://localhost:9050`) or use public Tor gateways (like `ahmia.fi`) under highly strict privacy policies.
    *   Distinguish WAF block statuses (`429`, `403`) from regular missing pages to avoid false negatives.

## Consequences
*   **Platform Conformance**: Every new platform added to `be/src/registry.js` must strictly conform to the upgraded schema and participate in automated Jest verification tests.
*   **Stealthier Scraping**: The OSINT scanner behaves like a standard web client, drastically reducing rate limits and IP blocking.
*   **Flexible Client Routing**: The Svelte 5 frontend reads registry categories dynamically, allowing investigators to select precise, focused search profiles before commencing scans.
*   **Evasion Audits**: The engine requires a robust proxy pool, Tor SOCKS5 configuration, and user agent dictionary in `.env` to execute high-risk platform scans securely.

