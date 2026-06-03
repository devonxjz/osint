# OSINT Soft-404 Blacklist Checker Interface Design

This document details the interface design for the Soft-404 Blacklist Checker in the OSINT system, engineered for maximum flexibility, streaming analysis, and extensibility.

---

## 1. Interface Signature (TypeScript)

```typescript
import { ReadableStream } from 'stream/web';

/**
 * Contextual data about the scanned profile and network response metadata.
 */
export interface ProfileScanContext {
  username: string;                 // Target username we are hunting for
  expectedBio?: string;             // Optional expected text in bio
  platformId: string;               // E.g., 'twitter', 'github', 'instagram'
  statusCode: number;               // HTTP response code (e.g., 200, 404, 302)
  finalUrl: string;                 // Final URL after redirects
  headers?: Record<string, string>; // HTTP Response headers (e.g., content-type)
}

/**
 * Profile metadata parsed from the response body.
 * Extractor hooks populate this to be consumed by rule evaluators.
 */
export interface ExtractedProfileData {
  extractedUsername?: string;
  extractedBio?: string;
  customFields?: Record<string, any>; // E.g., follower counts, meta tags
}

/**
 * The final decision returned by the checker.
 */
export interface Soft404Verdict {
  isSoft404: boolean;                 // True if determined to be 'not found' / missing profile
  confidence: 'high' | 'medium' | 'low';
  matchedRuleId?: string;             // The rule identifier that made the verdict
  reason?: string;                    // Debug info or description of why it's a soft-404
}

/**
 * Custom extractor hook to extract metadata from HTML strings or streams.
 * Allows decoupling HTML scraping/parsing from the actual classification logic.
 */
export type MetadataExtractor = (
  content: string | ReadableStream<Uint8Array>,
  context: ProfileScanContext
) => Promise<ExtractedProfileData> | ExtractedProfileData;

/**
 * Core interface for soft-404 classification rules.
 * Rules can evaluate the HTML content (string or stream), scan context, or extracted metadata.
 */
export interface Soft404Rule {
  id: string;
  name: string;
  
  /**
   * Evaluates soft-404 conditions. Can run synchronously or asynchronously.
   * If `content` is a stream, the rule can read it incrementally to support early-abort.
   */
  evaluate(
    content: string | ReadableStream<Uint8Array>,
    context: ProfileScanContext,
    extracted: ExtractedProfileData
  ): Promise<Soft404Verdict> | Soft404Verdict;
}

/**
 * Declarative platform configuration schema.
 * Simplifies configuring simple platforms without writing custom code/classes.
 */
export interface PlatformConfig {
  platformId: string;
  // Regexes matched against the raw HTML or text body
  regexBlacklist?: (string | RegExp)[];
  // Selectors to check for specific presence or absence (e.g., checking if a 'user-not-found' class exists)
  selectorRules?: Array<{
    selector: string;
    condition: 'present' | 'absent';
    isSoft404: boolean;
  }>;
}

/**
 * Initialization options for the Checker.
 */
export interface Soft404CheckerOptions {
  globalHtmlBlacklist?: (string | RegExp)[];
  platformConfigs?: Record<string, PlatformConfig>;
  extractors?: Record<string, MetadataExtractor>;
  rules?: Soft404Rule[];
}

/**
 * Main interface for the Soft-404 Blacklist Checker.
 */
export interface ISoft404Checker {
  /**
   * Configures platform-specific declarative rules.
   */
  configurePlatform(config: PlatformConfig): void;

  /**
   * Registers a custom metadata extractor hook for a given platform.
   */
  registerExtractor(platformId: string, extractor: MetadataExtractor): void;

  /**
   * Registers a custom rule evaluator dynamically.
   */
  registerRule(rule: Soft404Rule): void;

  /**
   * Evaluates the scanned page content to determine if it is a soft-404.
   */
  check(
    content: string | ReadableStream<Uint8Array>,
    context: ProfileScanContext
  ): Promise<Soft404Verdict>;
}
```

---

## 2. Usage Examples

### Example A: Basic Setup with Custom Extractor Hook and Evaluation

```typescript
import { Soft404Checker } from './Soft404Checker';
import { ProfileScanContext } from './types';

// 1. Instantiate the checker with a global blacklist
const checker = new Soft404Checker({
  globalHtmlBlacklist: [
    /404 not found/i,
    /page does not exist/i,
    /profile suspended/i
  ]
});

// 2. Register a custom metadata extractor hook for Instagram
checker.registerExtractor('instagram', async (content, context) => {
  const htmlString = typeof content === 'string' ? content : await streamToString(content);
  // Custom parsing logic (e.g. cheerio or regex)
  const metaBio = htmlString.match(/<meta property="og:description" content="([^"]+)"/)?.[1];
  return {
    extractedBio: metaBio,
    extractedUsername: context.username
  };
});

// 3. Perform a check
const context: ProfileScanContext = {
  username: 'john_doe_99',
  platformId: 'instagram',
  statusCode: 200,
  finalUrl: 'https://instagram.com/john_doe_99'
};

const htmlPayload = `<html><head><meta property="og:description" content="User not found"></head></html>`;

const verdict = await checker.check(htmlPayload, context);
console.log(verdict); 
// Output: { isSoft404: true, confidence: 'high', matchedRuleId: 'global_blacklist', reason: 'Matches global HTML blacklist keyword' }
```

### Example B: Stream Analysis with Fail-Fast / Early Abort

For large-scale OSINT scanning, buffering full HTML payloads in memory is costly. The stream analysis pattern evaluates the HTML chunk-by-chunk and aborts the HTTP request as soon as a blacklist pattern is matched.

```typescript
import { Soft404Rule, ProfileScanContext, ExtractedProfileData } from './types';

/**
 * A rule that inspects stream chunks progressively for early-abort on large files.
 */
export class StreamBlacklistRule implements Soft404Rule {
  id = 'stream_blacklist';
  name = 'Incremental HTML Stream Blacklist Rule';

  async evaluate(
    content: string | ReadableStream<Uint8Array>,
    context: ProfileScanContext,
    extracted: ExtractedProfileData
  ) {
    if (typeof content === 'string') {
      return this.checkString(content);
    }

    const reader = content.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Scan buffer incrementally (keeping a window size matching longest keyword)
        if (buffer.includes('User Not Found') || buffer.includes('Account Suspended')) {
          // Cancel the stream to prevent further network/memory consumption!
          await reader.cancel('Soft-404 match detected early');
          return {
            isSoft404: true,
            confidence: 'high' as const,
            matchedRuleId: this.id,
            reason: 'Found soft-404 pattern in stream chunks'
          };
        }

        // Keep buffer size bounded to prevent infinite memory growth
        if (buffer.length > 4096) {
          buffer = buffer.slice(-1024); // Keep tail overlapping window
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { isSoft404: false, confidence: 'low' as const };
  }

  private checkString(text: string) {
    const isSoft = text.includes('User Not Found') || text.includes('Account Suspended');
    return {
      isSoft404: isSoft,
      confidence: isSoft ? ('high' as const) : ('low' as const)
    };
  }
}
```

---

## 3. What This Design Hides Internally

1. **Stream Buffer Reassembly & Memory Management:** Callers pass either raw streams or strings. The engine encapsulates stream decoding, sliding window buffering (to catch patterns split across chunk boundaries), and stream lifetime management (closing/canceling underlying response streams on early abort).
2. **Execution Order and Rule Pipeline:** The order in which extractors are run (before rules) and the orchestration of multiple rule checks (e.g., executing cheap status code/redirect checks first, then global blacklists, then resource-heavy parser rules) is completely hidden.
3. **Selector & Regex Engine Compilations:** Platform configurations might define simple CSS selector strings or regex patterns. The internal implementation caches compiled regexes and DOM parses (e.g., using `JSDOM` or `Cheerio` pools) to prevent performance degradation on repeated runs.

---

## 4. Trade-Offs of This Approach

### Advantages (Pros)
* **High Extensibility:** Hook-based metadata extraction decouples "parsing the page metadata" from "determining if the profile is missing". Rules can be reused across platforms or tailored specifically to individual edge cases.
* **Network & Memory Efficient:** Support for `ReadableStream` combined with stream cancelation/early-abort ensures that the engine can interrupt network downloads immediately upon discovering a soft-404 keyword, preventing unnecessary data transfer in high-throughput scans.
* **Unified API:** Callers interact with a single `check()` method regardless of whether the profile is being checked via status codes, URL redirect analysis, DOM queries, regexes, or a combination of them all.

### Disadvantages (Cons)
* **Stream Read Single-Ownership Constraints:** In JavaScript, a `ReadableStream` can typically only be read or locked by a single reader at a time. If multiple custom rules attempt to read from the stream concurrently, the engine must either clone the stream (which increases memory overhead) or force sequential execution by buffering chunks first, partially defeating the stream efficiency.
* **Complexity of Slide-Window Matching:** Standard regex matches do not work out of the box across stream boundaries. To perform regex matching on a stream, the engine needs complex state-machine regex parsers or overlapping sliding windows, which increases code complexity compared to checking standard strings.
