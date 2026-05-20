# Detailed Technical Specifications
## Module 1: Input Analyzer | Module 2: Platform Registry

**Project**: Digital Footprint Tracker (OSINT)
**Version**: 1.0.0
**Classification**: Internal Engineering Reference

---

# MODULE 1 — Input Analyzer

## 1.1 Overview

| Attribute       | Value                                  |
|----------------|----------------------------------------|
| File Path       | `backend/src/analyzer.js`              |
| Module Type     | Pure Synchronous Utility               |
| Dependencies    | Zero (no npm packages)                 |
| Async           | No                                     |
| Side Effects    | None                                   |
| Exported API    | `analyzeInput(input)`                  |

---

## 1.2 Function Signature

```javascript
/**
 * Analyzes and classifies a raw user input string.
 * @param {string} input - Raw string from UI search box
 * @returns {AnalysisResult}
 */
function analyzeInput(input) { ... }
```

### Return Type: `AnalysisResult`

```typescript
interface AnalysisResult {
  type:      'EMAIL' | 'USERNAME' | null;  // null only when valid === false
  valid:     boolean;
  sanitized: string;                        // cleaned version of input
  error?:    string;                        // present only when valid === false
}
```

---

## 1.3 Processing Pipeline (Step-by-Step)

```
Raw Input String
      │
      ▼
[Step 1] Guard: null / undefined / non-string check
      │  → if fail: return { valid: false, error: 'Input must be a non-empty string' }
      │
      ▼
[Step 2] Trim whitespace (leading + trailing)
      │
      ▼
[Step 3] Empty string guard
      │  → if empty after trim: return { valid: false, error: 'Input cannot be empty' }
      │
      ▼
[Step 4] Strip leading '@' prefix (e.g. "@johndoe" → "johndoe")
      │
      ▼
[Step 5] Email detection (RFC 5322 regex test)
      │  → if MATCH: return { type: 'EMAIL', valid: true, sanitized: lowercased_input }
      │
      ▼
[Step 6] Username validation regex test
      │  → if MATCH + length in [2, 64]: return { type: 'USERNAME', valid: true, sanitized }
      │  → if FAIL: return { valid: false, error: 'Invalid format: ...' }
```

---

## 1.4 Regex Specifications

### Email Regex (RFC 5322 Simplified)
```javascript
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
```

**Valid examples:**
- `john.doe@gmail.com` ✓
- `john.doe+label@test.co.uk` ✓
- `user123@domain.io` ✓

**Invalid examples:**
- `@gmail.com` ✗ (no local part)
- `user@` ✗ (no domain)
- `user @gmail.com` ✗ (whitespace)

### Username Regex
```javascript
const USERNAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
const USERNAME_MIN = 2;
const USERNAME_MAX = 64;
```

**Valid examples:**
- `john_doe123` ✓
- `dev.user-01` ✓
- `ab` ✓ (min length)

**Invalid examples:**
- `j` ✗ (too short)
- `john doe` ✗ (space inside)
- `john#doe` ✗ (illegal `#`)
- `<script>` ✗ (illegal `<>`)
- `john'doe` ✗ (SQL injection char)
- (65+ chars) ✗ (exceeds max)

---

## 1.5 Sanitization Rules (Detailed)

| Rule                        | Input Example            | Output Example      |
|-----------------------------|--------------------------|---------------------|
| Trim whitespace             | `"  johndoe  "`          | `"johndoe"`         |
| Strip leading `@`           | `"@johndoe"`             | `"johndoe"`         |
| Lowercase email             | `"John.Doe@Gmail.COM"`   | `"john.doe@gmail.com"` |
| Username: preserve case     | `"JohnDoe"`              | `"JohnDoe"`         |
| No other mutations          | `"dev-user.01"`          | `"dev-user.01"`     |

> **Note**: Only the leading `@` is stripped. Any `@` inside the string (e.g., `a@b`) participates in email detection.

---

## 1.6 Complete Output Matrix

| Input                        | type       | valid  | sanitized               | error                          |
|------------------------------|-----------|--------|-------------------------|-------------------------------|
| `"john_doe123"`              | USERNAME  | true   | `"john_doe123"`         | —                             |
| `"  john_doe123  "`          | USERNAME  | true   | `"john_doe123"`         | —                             |
| `"@johndoe"`                 | USERNAME  | true   | `"johndoe"`             | —                             |
| `"john.doe@gmail.com"`       | EMAIL     | true   | `"john.doe@gmail.com"`  | —                             |
| `"John.Doe+X@Test.CO.UK"`    | EMAIL     | true   | `"john.doe+x@test.co.uk"` | —                           |
| `"john#doe"`                 | null      | false  | `"john#doe"`            | `"Invalid username format"`   |
| `"j"`                        | null      | false  | `"j"`                   | `"Username too short (min 2)"`|
| `"   "`                      | null      | false  | `""`                    | `"Input cannot be empty"`     |
| `""`                         | null      | false  | `""`                    | `"Input cannot be empty"`     |
| `null`                       | null      | false  | `""`                    | `"Input must be a string"`    |
| `"<script>alert(1)</script>"`| null      | false  | (sanitized)             | `"Invalid username format"`   |
| `"a".repeat(65)`             | null      | false  | (sanitized)             | `"Username too long (max 64)"`|

---

## 1.7 Error Message Enum (Constants)

```javascript
const ERRORS = {
  NOT_A_STRING:   'Input must be a non-empty string',
  EMPTY:          'Input cannot be empty',
  USERNAME_SHORT: 'Username too short (minimum 2 characters)',
  USERNAME_LONG:  'Username too long (maximum 64 characters)',
  INVALID_FORMAT: 'Invalid format: only letters, numbers, _, -, . are allowed',
};
```

---

## 1.8 Module File Structure

```javascript
// backend/src/analyzer.js

'use strict';

// --- Constants ---
const EMAIL_REGEX    = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_\-\.]+$/;
const USERNAME_MIN   = 2;
const USERNAME_MAX   = 64;

// --- Errors ---
const ERRORS = { ... };

// --- Sanitizer ---
function sanitize(input) { ... }

// --- Validators ---
function isEmail(str)    { ... }
function isUsername(str) { ... }

// --- Main Export ---
function analyzeInput(input) { ... }

module.exports = { analyzeInput };
```

---

## 1.9 Unit Test Specification

**Test file**: `backend/tests/analyzer.test.js`
**Framework**: Jest

### Test Suite Structure

```
analyzeInput()
  ├── Sanitization
  │   ├── trims leading/trailing whitespace
  │   ├── strips single leading @ from username
  │   └── lowercases email addresses
  │
  ├── Email Detection
  │   ├── detects standard email (john.doe@gmail.com)
  │   ├── detects email with + label
  │   ├── detects email with subdomain (.co.uk)
  │   └── rejects malformed email (@gmail.com, user@, missing TLD)
  │
  ├── Username Detection
  │   ├── accepts alphanumeric username
  │   ├── accepts username with _ - . connectors
  │   ├── rejects username under 2 chars
  │   ├── rejects username over 64 chars
  │   ├── rejects username with spaces
  │   ├── rejects username with # $ % special chars
  │   └── rejects XSS / SQL injection patterns
  │
  └── Edge Cases
      ├── returns valid:false for empty string
      ├── returns valid:false for whitespace-only
      ├── returns valid:false for null
      ├── returns valid:false for undefined
      └── returns valid:false for numeric input (type coercion guard)
```

### Critical Test Cases (Code)

```javascript
describe('analyzeInput()', () => {
  it('strips @ prefix and returns USERNAME', () => {
    const result = analyzeInput('@johndoe');
    expect(result).toEqual({ type: 'USERNAME', valid: true, sanitized: 'johndoe' });
  });

  it('detects complex email with label and subdomain', () => {
    const result = analyzeInput('john.doe+label@test.co.uk');
    expect(result.type).toBe('EMAIL');
    expect(result.valid).toBe(true);
  });

  it('returns valid:false for empty string', () => {
    const result = analyzeInput('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects illegal characters in username', () => {
    const result = analyzeInput('john#doe');
    expect(result.valid).toBe(false);
  });

  it('returns valid:false for whitespace-only input', () => {
    const result = analyzeInput('   ');
    expect(result.valid).toBe(false);
  });
});
```

---

## 1.10 Performance Constraints

| Metric              | Target          |
|---------------------|-----------------|
| Execution time      | < 1ms per call  |
| Memory allocation   | Zero heap (pure stack ops) |
| Bundle size impact  | 0 bytes (no deps) |
| Thread blocking     | None (sync, CPU trivial) |

---
---

# MODULE 2 — Platform Registry

## 2.1 Overview

| Attribute       | Value                                     |
|----------------|-------------------------------------------|
| File Path       | `backend/src/registry.js`                 |
| Module Type     | Static Data Configuration                 |
| Dependencies    | Zero                                      |
| Async           | No                                        |
| Side Effects    | None                                      |
| Exported API    | `getPlatforms(categories?)`, `getAllPlatforms()` |

---

## 2.2 Platform Schema (Full Specification)

```typescript
interface PlatformConfig {
  name:        string;                            // Unique display name
  category:    'Tech' | 'Social' | 'Gaming' | 'Media';
  url:         string;                            // Must contain exactly one '{}'
  checkType:   'status' | 'text' | 'selector';
  checkValue:  number | string;
  // checkType === 'status'   → checkValue: HTTP status code (e.g. 404)
  // checkType === 'text'     → checkValue: substring that appears on 404/missing pages
  // checkType === 'selector' → checkValue: CSS/cheerio selector absent on missing pages
}
```

### Field Constraints

| Field        | Type     | Required | Constraint                                   |
|-------------|----------|----------|----------------------------------------------|
| `name`       | string   | ✓        | Unique across registry, non-empty            |
| `category`   | enum     | ✓        | Must be one of 4 defined values              |
| `url`        | string   | ✓        | Must contain exactly one `{}` placeholder    |
| `checkType`  | enum     | ✓        | Must be `status`, `text`, or `selector`      |
| `checkValue` | number\|string | ✓ | number if `status`; string if `text`/`selector` |

---

## 2.3 checkType Semantics (Engine Contract)

The OSINT Engine (Module 3) reads `checkType` + `checkValue` to determine if a profile **does NOT exist**:

| `checkType` | Meaning of `checkValue`                                                   | Profile = NOT_FOUND when...                        |
|------------|----------------------------------------------------------------------------|---------------------------------------------------|
| `status`   | HTTP status code that indicates "user not found"                           | Response status === `checkValue`                  |
| `text`     | A string that appears in response body only on missing profile pages       | Response body **contains** `checkValue` substring |
| `selector` | A CSS selector that is **absent** from the DOM on valid profile pages      | Cheerio **cannot find** `checkValue` in HTML      |

> **Inverse logic**: For `selector` type, the selector is one that **must exist** on a real profile. If the selector is absent → user not found.

---

## 2.4 Curated Platform Registry (Complete)

### Category: Tech (10 platforms)

```javascript
{ name: 'GitHub',       category: 'Tech',   url: 'https://github.com/{}',              checkType: 'status',   checkValue: 404 },
{ name: 'GitLab',       category: 'Tech',   url: 'https://gitlab.com/{}',              checkType: 'status',   checkValue: 404 },
{ name: 'NPM',          category: 'Tech',   url: 'https://www.npmjs.com/~{}',          checkType: 'status',   checkValue: 404 },
{ name: 'DockerHub',    category: 'Tech',   url: 'https://hub.docker.com/u/{}',        checkType: 'status',   checkValue: 404 },
{ name: 'LeetCode',     category: 'Tech',   url: 'https://leetcode.com/{}',            checkType: 'text',     checkValue: 'user not found' },
{ name: 'CodePen',      category: 'Tech',   url: 'https://codepen.io/{}',              checkType: 'status',   checkValue: 404 },
{ name: 'HackerNews',   category: 'Tech',   url: 'https://news.ycombinator.com/user?id={}', checkType: 'text', checkValue: 'No such user.' },
{ name: 'Replit',       category: 'Tech',   url: 'https://replit.com/@{}',             checkType: 'status',   checkValue: 404 },
{ name: 'Kaggle',       category: 'Tech',   url: 'https://www.kaggle.com/{}',          checkType: 'status',   checkValue: 404 },
{ name: 'Dev.to',       category: 'Tech',   url: 'https://dev.to/{}',                  checkType: 'status',   checkValue: 404 },
```

### Category: Social (12 platforms)

```javascript
{ name: 'Reddit',         category: 'Social', url: 'https://www.reddit.com/user/{}',      checkType: 'text',     checkValue: 'Sorry, nobody on Reddit goes by that name.' },
{ name: 'Medium',         category: 'Social', url: 'https://medium.com/@{}',              checkType: 'status',   checkValue: 404 },
{ name: 'Linktree',       category: 'Social', url: 'https://linktr.ee/{}',                checkType: 'status',   checkValue: 404 },
{ name: 'BuyMeACoffee',   category: 'Social', url: 'https://www.buymeacoffee.com/{}',     checkType: 'status',   checkValue: 404 },
{ name: 'Patreon',        category: 'Social', url: 'https://www.patreon.com/{}',          checkType: 'status',   checkValue: 404 },
{ name: 'Substack',       category: 'Social', url: 'https://{}.substack.com',             checkType: 'status',   checkValue: 404 },
{ name: 'Pinterest',      category: 'Social', url: 'https://www.pinterest.com/{}',        checkType: 'status',   checkValue: 404 },
{ name: 'Tumblr',         category: 'Social', url: 'https://{}.tumblr.com',               checkType: 'status',   checkValue: 404 },
{ name: 'Flickr',         category: 'Social', url: 'https://www.flickr.com/people/{}',    checkType: 'text',     checkValue: 'Page Not Found' },
{ name: 'About.me',       category: 'Social', url: 'https://about.me/{}',                 checkType: 'status',   checkValue: 404 },
{ name: 'Gravatar',       category: 'Social', url: 'https://gravatar.com/{}',             checkType: 'status',   checkValue: 404 },
{ name: 'Keybase',        category: 'Social', url: 'https://keybase.io/{}',               checkType: 'status',   checkValue: 404 },
```

### Category: Gaming (9 platforms)

```javascript
{ name: 'Steam',           category: 'Gaming', url: 'https://steamcommunity.com/id/{}',   checkType: 'text',     checkValue: 'The specified profile could not be found.' },
{ name: 'Chess.com',       category: 'Gaming', url: 'https://www.chess.com/member/{}',    checkType: 'status',   checkValue: 404 },
{ name: 'Lichess',         category: 'Gaming', url: 'https://lichess.org/@/{}',           checkType: 'status',   checkValue: 404 },
{ name: 'Itch.io',         category: 'Gaming', url: 'https://{}.itch.io',                 checkType: 'status',   checkValue: 404 },
{ name: 'Speedrun.com',    category: 'Gaming', url: 'https://www.speedrun.com/user/{}',   checkType: 'status',   checkValue: 404 },
{ name: 'Twitch',          category: 'Gaming', url: 'https://www.twitch.tv/{}',           checkType: 'status',   checkValue: 404 },
{ name: 'Poki',            category: 'Gaming', url: 'https://poki.com/en/g/{}',           checkType: 'status',   checkValue: 404 },
{ name: 'GameFAQs',        category: 'Gaming', url: 'https://gamefaqs.gamespot.com/community/{}', checkType: 'status', checkValue: 404 },
{ name: 'Xbox Gamertag',   category: 'Gaming', url: 'https://xboxgamertag.com/search/{}', checkType: 'text',     checkValue: 'not found' },
```

### Category: Media (9 platforms)

```javascript
{ name: 'Spotify',        category: 'Media', url: 'https://open.spotify.com/user/{}',    checkType: 'status',   checkValue: 404 },
{ name: 'Instructables',  category: 'Media', url: 'https://www.instructables.com/member/{}/', checkType: 'text', checkValue: 'Not found' },
{ name: 'SoundCloud',     category: 'Media', url: 'https://soundcloud.com/{}',            checkType: 'status',   checkValue: 404 },
{ name: 'Bandcamp',       category: 'Media', url: 'https://{}.bandcamp.com',              checkType: 'status',   checkValue: 404 },
{ name: 'Vimeo',          category: 'Media', url: 'https://vimeo.com/{}',                 checkType: 'status',   checkValue: 404 },
{ name: 'Behance',        category: 'Media', url: 'https://www.behance.net/{}',           checkType: 'status',   checkValue: 404 },
{ name: 'Dribbble',       category: 'Media', url: 'https://dribbble.com/{}',              checkType: 'status',   checkValue: 404 },
{ name: 'Wattpad',        category: 'Media', url: 'https://www.wattpad.com/user/{}',      checkType: 'status',   checkValue: 404 },
{ name: 'ArtStation',     category: 'Media', url: 'https://www.artstation.com/{}',        checkType: 'status',   checkValue: 404 },
```

**Total: 40 platforms** across 4 categories.

---

## 2.5 Exported API Specification

```javascript
/**
 * Returns all platforms, optionally filtered by category.
 * @param {string[]} [categories] - e.g. ['Tech', 'Gaming']
 * @returns {PlatformConfig[]}
 */
function getPlatforms(categories = []) { ... }

/**
 * Returns the full unfiltered registry.
 * @returns {PlatformConfig[]}
 */
function getAllPlatforms() { ... }

/**
 * Returns all unique category names in the registry.
 * @returns {string[]}
 */
function getCategories() { ... }

module.exports = { getPlatforms, getAllPlatforms, getCategories };
```

### Behavior of `getPlatforms(categories)`

| Input                         | Output                                               |
|-------------------------------|------------------------------------------------------|
| `getPlatforms()`              | All 40 platforms                                     |
| `getPlatforms([])`            | All 40 platforms                                     |
| `getPlatforms(['Tech'])`      | Only the 10 Tech platforms                           |
| `getPlatforms(['Tech','Gaming'])` | Tech + Gaming platforms (19 total)              |
| `getPlatforms(['Unknown'])`   | `[]` (empty array — no match, no error)              |

---

## 2.6 URL Placeholder Specification

- Every `url` field must contain exactly one `{}` token.
- The OSINT Engine substitutes `{}` with the sanitized username at scan time.
- Two URL patterns exist:

| Pattern              | Example                                        | Platform Example |
|---------------------|------------------------------------------------|------------------|
| Path segment        | `https://github.com/{}`                        | GitHub, GitLab   |
| Subdomain           | `https://{}.substack.com`                      | Substack, Tumblr |

**Substitution pseudocode (in scanner):**
```javascript
const targetUrl = platform.url.replace('{}', encodeURIComponent(username));
```

---

## 2.7 Module File Structure

```javascript
// backend/src/registry.js

'use strict';

// --- Registry Data ---
const PLATFORMS = [
  // Tech
  { name: 'GitHub', category: 'Tech', url: 'https://github.com/{}', checkType: 'status', checkValue: 404 },
  // ... all 40 entries
];

// --- API ---
function getAllPlatforms()         { return [...PLATFORMS]; }
function getCategories()          { return [...new Set(PLATFORMS.map(p => p.category))]; }
function getPlatforms(categories) { ... }

module.exports = { getPlatforms, getAllPlatforms, getCategories };
```

---

## 2.8 Unit Test Specification

**Test file**: `backend/tests/registry.test.js`
**Framework**: Jest

### Test Suite Structure

```
Platform Registry
  ├── Schema Validation
  │   ├── every entry has: name, category, url, checkType, checkValue
  │   ├── every category is one of: Tech | Social | Gaming | Media
  │   ├── every checkType is one of: status | text | selector
  │   ├── checkValue is number when checkType === 'status'
  │   └── checkValue is string when checkType === 'text' | 'selector'
  │
  ├── URL Integrity
  │   ├── every url contains exactly one '{}'
  │   ├── every url starts with 'https://'
  │   └── no url contains spaces
  │
  ├── Uniqueness
  │   ├── no duplicate platform names
  │   └── no duplicate urls
  │
  ├── getPlatforms() behavior
  │   ├── returns all platforms when called with no args
  │   ├── returns all platforms when called with empty array
  │   ├── returns only Tech platforms when filtered
  │   ├── returns combined platforms for multiple category filters
  │   └── returns empty array for unknown category
  │
  └── Coverage
      └── total platform count >= 40
```

### Critical Test Cases (Code)

```javascript
const { getPlatforms, getAllPlatforms } = require('../src/registry');

describe('Platform Registry', () => {
  const all = getAllPlatforms();

  it('all platforms have required fields', () => {
    const REQUIRED = ['name', 'category', 'url', 'checkType', 'checkValue'];
    all.forEach(p => {
      REQUIRED.forEach(field => expect(p).toHaveProperty(field));
    });
  });

  it('every url contains exactly one "{}"', () => {
    all.forEach(p => {
      const count = (p.url.match(/\{\}/g) || []).length;
      expect(count).toBe(1);
    });
  });

  it('no duplicate platform names', () => {
    const names = all.map(p => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('no duplicate urls', () => {
    const urls = all.map(p => p.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('category filter returns correct subset', () => {
    const tech = getPlatforms(['Tech']);
    tech.forEach(p => expect(p.category).toBe('Tech'));
  });

  it('unknown category returns empty array', () => {
    expect(getPlatforms(['Unknown'])).toEqual([]);
  });

  it('has at least 40 platforms total', () => {
    expect(all.length).toBeGreaterThanOrEqual(40);
  });
});
```

---

## 2.9 Performance Constraints

| Metric                    | Target                         |
|---------------------------|--------------------------------|
| Module load time          | < 5ms (synchronous JSON parse) |
| `getAllPlatforms()` call   | O(n) array copy, < 1ms         |
| `getPlatforms(cats)` call  | O(n) filter, < 1ms             |
| Memory footprint          | ~15KB static (40 entries)      |

---

## 2.10 Integration Contract with Module 3 (OSINT Engine)

The OSINT Engine imports and consumes the registry as follows:

```javascript
// In scanner.js (Module 3)
const { getPlatforms } = require('./registry');

async function runScan(username, selectedCategories) {
  const platforms = getPlatforms(selectedCategories); // filtered list
  const chunks    = chunkArray(platforms, 15);        // batch of 15

  for (const chunk of chunks) {
    await Promise.all(chunk.map(p => scanPlatform(username, p)));
    await delay(100); // anti-rate-limit pause
  }
}
```

**Key constraint**: Module 2 must never throw. If called with bad categories, return `[]`. The engine must not crash from an empty registry.

---

## 2.11 Extension Guide (Adding New Platforms)

To add a new platform, append one object to the `PLATFORMS` array in `registry.js`:

```javascript
// Example: Adding Mastodon
{
  name:       'Mastodon',
  category:   'Social',
  url:        'https://mastodon.social/@{}',
  checkType:  'status',
  checkValue: 404,
}
```

**Checklist before adding:**
- [ ] `{}` appears exactly once in `url`
- [ ] `category` is one of the 4 approved values
- [ ] `name` is unique in the registry
- [ ] `url` is unique in the registry
- [ ] `checkType` + `checkValue` combination is verified manually via `curl -I <url>`
- [ ] Run `npm test` to confirm schema validation passes

---

*End of Specification — Module 1 & Module 2*