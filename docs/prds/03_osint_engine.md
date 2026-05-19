# PRD: Module 3 - OSINT Engine

## Problem Statement
Firing 300+ HTTP requests simultaneously causes high CPU utilization, server-side socket exhaustion, blocks by target WAFs (Web Application Firewalls) yielding 429 Too Many Requests or 403 Forbidden, and results in false negatives.

## Solution
Create an asynchronous, resilient, rate-conscious scraping engine that queries target platforms in chunks, manages request timeouts, applies random User-Agent strings, matches false-positive rules, and extracts target metadata (bio, avatar url, location) using Cheerio.

## User Stories

1. As an investigator, I want scans to be throttle-limited (batches of 15), so that the application server does not get blacklisted by social media firewalls.
2. As a user, I want the system to fake browser headers (User-Agents), so that requests look like authentic user visits and bypass bot detection.
3. As a developer, I want custom timeouts (default 5s) on every request, so that a hung platform does not delay the entire investigation indefinitely.
4. As an analyst, I want to fetch the target's public avatar picture and description, so that I can cross-match identities.

## Implementation Decisions

### Engine Interface
```typescript
async function scanPlatform(username: string, platform: PlatformConfig): Promise<ScanResult>

interface ScanResult {
  platform: string;
  status: 'FOUND' | 'NOT_FOUND';
  url: string;
  avatar?: string;
  bio?: string;
  location?: string;
  error?: string;
}
```

### Scraping Protocol
*   **Request Framework**: Axios client configured with `validateStatus: () => true` to catch non-200 responses without blowing up execution.
*   **Anti-Detection**: Rotated array of popular, modern desktop User-Agents.
*   **Cheerio parsing**: Standard selectors (`meta[property="og:image"]`, `meta[name="description"]`, target profile elements) utilized to pluck profile metadata.

## Testing Decisions
*   **Mock Requests**: Intercept Axios HTTP requests with custom mock responses (e.g. simulated 404, simulated 200 with "page not found" body, simulated 500 error).
*   **Cheerio extraction test**: Read a local mock HTML string of a GitHub profile and verify the parsed result matches expected avatar and biography values.

## Out of Scope
*   **Bypassing JavaScript Challenges**: Support for rendering platforms that require complex SPA hydration (like React/Vue apps requiring Puppeteer/Playwright).
*   **CAPTCHA Solving**: Solving Cloudflare/Google Captchas encountered during scraping.

## Further Notes
*   This is an asynchronous, high-concurrency CPU/IO bound module.
