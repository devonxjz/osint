# PRD: Module 8 - Platform Expansion & Evasion Engine Upgrades

## Problem Statement
The current OSINT Platform Registry is limited to 40 static platforms in 4 basic categories (`Tech`, `Social`, `Gaming`, `Media`). While expanding lookup coverage is essential for professional investigations, it introduces severe architectural and security risks:
1. **WAF & Bot Blocking**: High-profile networks (Facebook, Instagram, LinkedIn, Douyin) return HTTP status `200 OK` or `302 Found` (redirecting to login/landing walls) even when profiles do not exist, rendering `status: 404` checks completely ineffective and yielding ~100% false-positives.
2. **Identifier Mismatches & Secret Exposure**: Storing raw session cookies inside a Git-tracked registry is a major security risk. Furthermore, regional endpoints and decentralized platforms require radically different query signatures (e.g. phone numbers for WhatsApp) or custom connection latency.
3. **Conceptual Congestion**: Tools/services (Shodan, Censys, Maltego, SpiderFoot) and anonymous boards without account search capabilities (4chan, 8kun) are conceptually different from digital footprint profile lookups. Mixing them in the profile registry degrades modularity.
4. **Dark Web Resolution**: `.onion` search networks require Tor protocol gateways or local SOCKS5 proxy routing, which cannot be treated as standard HTTP requests.

---

## Solution
Upgrade the **Platform Registry Schema** and **OSINT Engine request pipeline** to support advanced evasion protocols, per-platform custom timeouts, secure environment-driven session keys, and Tor gateway routing.

We will **triage** all requested platforms into three distinct, highly realistic implementation tiers to avoid bloating the codebase with dead entries:

### Platform Triage Matrix

#### Group A: Implementable Now (Direct HTTP / Text Matcher)
These platforms have stable, public-facing HTTP profile URLs that can be queried directly via GET/HEAD requests and analyzed using HTTP status codes, text substring matches, or simple Cheerio DOM selectors.

1.  **Global & Regional Socials**:
    *   **Reddit**: `https://www.reddit.com/user/{}` (checkType: `text`, checkValue: "Sorry, nobody on Reddit goes by that name.")
    *   **TikTok**: `https://www.tiktok.com/@{}` (checkType: `status`, checkValue: 404)
    *   **YouTube**: `https://www.youtube.com/@{}` (checkType: `status`, checkValue: 404)
    *   **Pinterest**: `https://www.pinterest.com/{}/` (checkType: `status`, checkValue: 404)
    *   **Snapchat**: `https://www.snapchat.com/add/{}` (checkType: `status`, checkValue: 404)
    *   **Tumblr**: `https://{}.tumblr.com` (checkType: `status`, checkValue: 404)
    *   **Flickr**: `https://www.flickr.com/people/{}` (checkType: `text`, checkValue: "Page Not Found")
    *   **Medium**: `https://medium.com/@{}` (checkType: `status`, checkValue: 404)
    *   **Quora**: `https://www.quora.com/profile/{}` (checkType: `status`, checkValue: 404)
    *   **Clubhouse**: `https://www.clubhouse.com/@{}` (checkType: `status`, checkValue: 404)
    *   **Threads**: `https://www.threads.net/@{}` (checkType: `status`, checkValue: 404)
    *   **Bluesky**: `https://bsky.app/profile/{}.bsky.social` (checkType: `status`, checkValue: 404)
    *   **Mastodon**: `https://mastodon.social/@{}` (checkType: `status`, checkValue: 404)
    *   **BeReal**: `https://bereal.app/{}` (checkType: `status`, checkValue: 404)
    *   **MeWe**: `https://mewe.com/i/{}` (checkType: `status`, checkValue: 404)
    *   **Parler**: `https://parler.com/profile/{}` (checkType: `status`, checkValue: 404)
    *   **Gab**: `https://gab.com/{}` (checkType: `status`, checkValue: 404)
2.  **Messaging & Community Links**:
    *   **Telegram**: `https://t.me/{}` (checkType: `text`, checkValue: "If you have Telegram, you can contact")
    *   **WhatsApp**: `https://api.whatsapp.com/send?phone={}` (checkType: `selector`, checkValue: "#action-button", identifierType: "PHONE")
    *   **Slack**: `https://{}.slack.com` (checkType: `status`, checkValue: 404)
    *   **Guilded**: `https://www.guilded.gg/{}` (checkType: `status`, checkValue: 404)
3.  **Regional Platforms**:
    *   **Weibo**: `https://weibo.com/{}` (checkType: `text`, checkValue: "抱歉，您访问的页面地址有误")
    *   **KakaoTalk**: `https://story.kakao.com/{}` (checkType: `status`, checkValue: 404)
    *   **Bilibili**: `https://space.bilibili.com/{}` (checkType: `status`, checkValue: 404)
    *   **Xiaohongshu**: `https://www.xiaohongshu.com/user/profile/{}` (checkType: `status`, checkValue: 404)
    *   **Naver Cafe**: `https://cafe.naver.com/{}` (checkType: `status`, checkValue: 404)
    *   **Baidu Tieba**: `https://tieba.baidu.com/home/main?un={}` (checkType: `text`, checkValue: "该用户不存在")
    *   **Zhihu**: `https://www.zhihu.com/people/{}` (checkType: `status`, checkValue: 404)
    *   **Kuaishou**: `https://www.kuaishou.com/profile/{}` (checkType: `status`, checkValue: 404)
    *   **Niconico**: `https://www.nicovideo.jp/user/{}` (checkType: `status`, checkValue: 404)
    *   **AfreecaTV**: `https://bj.afreecatv.com/{}` (checkType: `status`, checkValue: 404)
4.  **Developer / Fediverse / Forums**:
    *   **GitHub / GitLab / Dev.to / Hashnode**: Standard endpoints (already supported or simple status checks).
    *   **Pixelfed**: `https://pixelfed.social/{}` (checkType: `status`, checkValue: 404)
    *   **Lemmy**: `https://lemmy.ml/u/{}` (checkType: `status`, checkValue: 404)
    *   **Misskey**: `https://misskey.io/@{}` (checkType: `status`, checkValue: 404)
    *   **Something Awful**: `https://forums.somethingawful.com/member.php?action=getinfo&username={}` (checkType: `status`, checkValue: 404)
    *   **Letterboxd**: `https://letterboxd.com/{}/` (checkType: `status`, checkValue: 404)
    *   **Goodreads**: `https://www.goodreads.com/{}` (checkType: `status`, checkValue: 404)
5.  **Dark Web Onion Gateways** (requires SOCKS5 Tor proxy config or standard public Tor gateway):
    *   **Ahmia (Clearnet gateway)**: `https://ahmia.fi/search/?q={}` (checkType: `text`, checkValue: "No results found", timeout: 15000)
    *   **OnionLand**: gateway-routed queries with a high timeout default (15000ms).

#### Group B: Requires Proxy & Session Evasion
These high-risk platforms require advanced evasion setups. Scraping will use rotated proxy pools, custom browser headers, and session authentication keys resolved from `.env` at runtime.

*   **Facebook**: `https://www.facebook.com/{}` (checkType: `selector`, checkValue: `meta[property="og:title"]`, requiresProxy: true, envCookieKey: "FACEBOOK_COOKIE_KEY")
    *   *Mechanism*: FaceBook returns status `200` but redirects to a login wall. Valid profiles will contain the target's name inside the `<meta property="og:title">` property (e.g. `"<meta property="og:title" content="John Doe">"`). Absent profiles display `"Page not found"` or generic landing text.
*   **Instagram**: `https://www.instagram.com/{}/` (checkType: `text`, checkValue: "page_not_found", requiresProxy: true, envCookieKey: "INSTAGRAM_COOKIE_KEY")
    *   *Mechanism*: Instagram strongly protects endpoints. If the cookie is present, a valid username resolves the profile, whereas a missing profile displays the signature `"page_not_found"` or error elements.
*   **LinkedIn**: `https://www.linkedin.com/in/{}` (checkType: `selector`, checkValue: "code.identity-state", requiresProxy: true, envCookieKey: "LINKEDIN_COOKIE_KEY")
    *   *Mechanism*: Uses captured LinkedIn session cookies (such as `li_at`) defined in the server's `.env`.
*   **Douyin**: `https://www.douyin.com/user/{}` (checkType: `selector`, checkValue: ".user-info-container", requiresProxy: true, envCookieKey: "DOUYIN_COOKIE_KEY")

#### Group C: Out of Scope / Deferred
The following platforms are **completely excluded** from the lookup registry because they lack any public HTTP username resolver, are external active tools rather than footprint targets, or have no viable search pipelines:

1.  **No Public HTTP Endpoints**:
    *   *Signal, WeChat, Zalo, KakaoTalk (Direct ID), MOMO, Discord, Messenger (Direct)*: Do not offer public, unauthenticated search directories. Resolving these requires private mobile API keys, automated phone emulator scripting, or active bot accounts, which violate our passive footprinting principles.
2.  **No Account Identifier Model**:
    *   *4chan, 8kun*: Anonymous by design. No username directory exists.
3.  **Tool & Integration Layer Mismatch**:
    *   *Shodan, Censys, Maltego, SpiderFoot, Hunter.io, Have I Been Pwned*: These represent advanced Threat Intelligence or Surface Web API services. They do not fit into the core platform username/profile mapping, and will be implemented in a dedicated **External Integrations Module** (e.g., Module 10) rather than clogging the Platform Registry.

---

## User Stories

### User Interface & Experience
1. **As an investigator**, I want a categorized platform list with filters (`Social`, `Tech`, `Gaming`, `Media`, `Regional`, `Privacy`, `Forums`, `DarkWeb`), so that I can focus my footprinting on the layers relevant to my target.
2. **As an analyst**, I want clear visual indicators for platforms that require active proxy profiles or session keys, so that I can configure my `.env` workspace before running high-risk investigations.
3. **As a researcher**, I want the UI search bar to automatically analyze phone inputs vs text usernames, so that it ignores platforms that don't match the query data type.

### Engine Performance & Evasion
4. **As a developer**, I want session cookies to be securely referenced from `.env` instead of hardcoded in Git, so that credentials remain safe.
5. **As an investigator**, I want each platform check to support a customized latency timeout, so that slow Tor networks or regional platforms do not trigger false timeout errors.

---

## Implementation Decisions

### 1. Registry Schema Upgrades (`PlatformConfig` in `be/src/registry.js`)
Refactor the registry object config schema as follows:

```typescript
type PlatformCategory = 
  | 'Social' | 'Tech' | 'Gaming' | 'Media' 
  | 'Regional' | 'Privacy' | 'Forums' | 'DarkWeb';

type IdentifierType = 'USERNAME' | 'PHONE' | 'EMAIL';

interface PlatformConfig {
  name: string;
  category: PlatformCategory;
  url: string;                     // Replacing target username in "{}"
  checkType: 'status' | 'text' | 'selector';
  checkValue: number | string;
  
  // New Evasion, Security & Tuning parameters
  identifierType?: IdentifierType; // Defaults to 'USERNAME'
  requiresProxy?: boolean;         // Routes request via configured proxies
  envCookieKey?: string;           // Key mapping to environment variable in .env (avoids hardcoding raw cookies)
  timeout?: number;                // Per-platform timeout override in ms (e.g., 15000 for Dark Web)
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}
```

### 2. OSINT Engine Pipeline Upgrades (`be/src/scanner.js`)
- **Evasion Request Construction**: Inject modern browser headers (rotated User-Agents, `Sec-Fetch-*` attributes, random accept languages).
- **Session Resolution**: If `envCookieKey` is present, look up `process.env[platform.envCookieKey]`. If present, append it as a `Cookie` header; if missing, log a warning and mark the platform as `BLOCKED_BY_WAF` or skip it.
- **Proxy and SOCKS5 Tor Routing**: Route platform checks through HTTP proxy pools or local Tor gateways (`socks5://127.0.0.1:9050`) based on `requiresProxy` or `category === 'DarkWeb'`.
- **Dynamic Timeout**: Inject `platform.timeout || 5000` into the Axios request agent config.

### 3. Svelte 5 Frontend Alignment
Svelte 5 + Vite is the official unified frontend. The components (`SearchBar.svelte`, `CardGrid.svelte`, and `scanner.svelte.ts`) will:
- Parse and filter the registry categories dynamically using Svelte 5 Runes.
- Disable inputs/cards when the required credentials/proxies are unconfigured.

---

## Testing Decisions
1. **Automated Schema Checks**: Jest tests will assert that no platform entry contains plain-text credentials, and every `envCookieKey` points to a valid uppercase ENV variable structure.
2. **Tor / Proxy Mock Tests**: Intercept SOCKS5 connections using MSW/Jest to confirm the correct tunnel routes are utilized.

---

## Out of Scope
- **Interactive Headless Automation**: Logging into sites using Playwright/Puppeteer. The registry only supports static Axios cookie injection.
- **Signal / WeChat / Discord mobile resolution**: Resolving non-HTTP private messenger accounts is deferred.
