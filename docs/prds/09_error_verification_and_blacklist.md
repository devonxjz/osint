# Product Requirement Document (PRD): Global Profile Matching & Error Verification Engine

## Problem Statement

During deep OSINT searches across 105 platforms, the system was identifying false-positive profile matches (`FOUND`) on platforms that served a successful HTTP status code (200 OK) but rendered error templates, shutdown announcements, or "page not found" wrappers inside the page content. 

Specifically:
* **Threads** redirects deleted/non-existent profiles to a localized Vietnamese/English page stating: *"Không phải cứ biến mất là mất tích, nhưng trang này thì mất tích thật rồi"* (Not everything that disappears is missing, but this page is truly gone).
* **Kaggle** serves a Single Page Application (SPA) shell returning 200 OK but displaying: *"We can't find that page."*
* **Devpost** returns 200 OK with: *"Sorry, that page does not exist."*
* **MeWe** serves a 200 OK holding: *"The page you're looking for could not be found."*
* **Lemmy** returns server errors with: *"There was an error on the server"* or *"The server returned this error"*.
* **Stack Overflow** redirects sunsetted Developer Story lookups to a static landing page: *"We have shut down Stack Overflow Jobs and Developer Story..."*.

Since the network request was successful, the profile scanner incorrectly treated these as valid user profiles.

---

## Solution

Implement a robust, multi-layer **Global HTML Blacklist & Error Verification Engine** in the OSINT scan pipeline. 

The engine:
1. Fetches the raw response HTML from the target endpoint.
2. Intercepts the HTML payload and extracts user metadata (like the bio/description) to build a **contextual map**.
3. Performs a case-insensitive check against a curated list of global blacklist strings (e.g. `"page not found"`, `"không phải cứ biến mất là mất tích"`).
4. Employs a **confidence threshold safety guard** to skip blacklist matching if the phrase is actively present inside the user's custom biography or username, preventing false-negative profile rejections.
5. Employs an automated **Live Audit Tool** (`npm run test:live-audit`) that hits live endpoints with a simulated dummy query to prevent blacklist decay and stale string issues.

---

## User Stories

1. As an OSINT investigator, I want non-existent profiles to be identified as `NOT_FOUND` even if the server returns 200 OK, so that I do not spend time analyzing dead or redirected links.
2. As a security researcher, I want Threads lookups to correctly identify dead handles stating *"Không phải cứ biến mất là mất tích"*, so that my digital footprint reports are completely accurate.
3. As a developer, I want Kaggle and Devpost profiles to be rejected when they render SPA error shells like *"We can't find that page"*, so that only profiles with real user portfolios are listed.
4. As a system administrator, I want Lemmy server failures or Stack Overflow Jobs/Story redirects to be automatically filtered out, so that temporary platform errors do not pollute active results.
5. As a SaaS dashboard user, I want the card grid to only display active, verified profiles with real bios and avatars, so that my investigation reports are pristine and noise-free.

---

## Implementation Decisions

### 1. Context-Aware Verification Engine
* **`be/src/scanner.js` (`scanPlatform` method)**:
  * Modified to intercept raw HTML response streams immediately upon resolution.
  * Injected a global static array `GLOBAL_HTML_BLACKLIST` containing verified localized and English error signatures.
  * Prior to matching, the engine loads the HTML with `cheerio` and parses the user bio via `extractMetadata`.
  * If a blacklist phrase matches, the system verifies that the phrase is NOT inside the user's parsed biography or the search username. If it is part of their active content, it is skipped. This prevents high-risk binary false-negatives (e.g., if a user wrote `"page not found"` as a joke in their active profile bio).

```javascript
// Contextual extraction to prevent false negatives from user-defined bios/usernames
const metadata = extractMetadata(html, platform.name);
const bio = (metadata.bio || '').toLowerCase();
const lowerUsername = (username || '').toLowerCase();

for (const phrase of GLOBAL_HTML_BLACKLIST) {
  if (lowerHtml.includes(phrase)) {
    // Skip if the phrase is customized inside the user's bio or username
    if (bio.includes(phrase) || lowerUsername.includes(phrase)) {
      continue;
    }
    return { platform: platform.name, status: 'NOT_FOUND', url: targetUrl };
  }
}
```

### 2. Schema Abstractions: Before/After Configurations
To support text signature lookups for Kaggle and Stack Overflow, their registry checks were updated to bypass strict status 404 rules:

| Platform | Old Check Configuration (Registry) | New Check Configuration (Registry) |
| :--- | :--- | :--- |
| **Kaggle** | `checkType: 'status'`, `checkValue: 404` | `checkType: 'text'`, `checkValue: "We can't find that page."` |
| **Stack Overflow** | `checkType: 'status'`, `checkValue: 404` | `checkType: 'text'`, `checkValue: 'We have shut down Stack Overflow Jobs'` |

---

## Technical Limitations & Risks

### 1. Pure Client-Rendered SPA Platforms (The "Raw HTML Shell" Problem)
* **Risk**: Single Page Applications (SPAs) that compile entirely client-side inside the browser without any Server-Side Rendering (SSR) output only a skeleton shell (e.g. `<div id="root"></div>`) during raw HTTP requests. Since our scraping engine uses `axios` (no JavaScript engine), it does not boot the SPA. If a platform does not provide server-side error fallbacks, the raw HTML will not contain the blacklist error phrase, rendering this solution ineffective for pure-JS client SPAs.
* **Mitigation**: Pure-JS platforms must be tracked via custom registry check rules (e.g., matching a selector or using an API endpoint if available). For complex JS-heavy targets, a headless browser controller (Playwright/Puppeteer) or a dedicated scraper API must be integrated.

### 2. Blacklist Maintenance Decay
* **Risk**: Web platforms frequently update their styles, localizations, and error pages. Over time, error messages like *"Không phải cứ biến mất là mất tích"* or *"We can't find that page"* will change, resulting in silent false-positive matches.
* **Mitigation**: We introduced the Live Audit tool (`test:live-audit`) to continuously smoke-test live platforms for decaying strings.

---

## Testing Decisions

### 1. Live Audit & Blacklist Staleness Verification
* **Module**: `be/scripts/verify_blacklist_health.js`
* **Purpose**: Performs real live network requests against major platforms using a guaranteed non-existent username (`__osint_nonexistent_user_998877_xyz__`).
* **Assertions**: Asserts that each queried platform resolves cleanly to `NOT_FOUND`. If any queries return `FOUND`, the audit tool throws an exit code 1 to fail the CI/CD pipeline, alerting developers that a platform's error signature has decayed in the real world.
* **Integration**: Added to `be/package.json` under `npm run test:live-audit`.

### 2. Dry-Run Unit & Integration Mocks
* **Module**: `be/tests/registry_health.test.js`
* **Mitigation of Circular Mock Checks**: While the unit mock tests successfully verify the logic boundaries of the regex/selector parser, they are inherently circular as mock outputs are tailored to the tested input. The **Live Audit Tool** serves as the true boundary check verifying the real-world accuracy of our assumptions.

---

## Out of Scope
* Resolving false positives on fully custom private domain networks.
* Automated account lookup retry intervals for platforms experiencing transient 500 server errors.
