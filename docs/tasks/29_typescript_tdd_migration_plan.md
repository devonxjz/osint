# Task 29: TypeScript TDD Migration Blueprint

- **Module**: Backend TypeScript Migration
- **Type**: Architecture & TDD Blueprint
- **Status**: [x] Slices 1, 2, and 3 Completed (Cache, Analyzer, and sseManager migrated to TypeScript under strict TDD and passing 100% of the tests)
- **Blocked by**: None

---

## 🎯 1. TDD Philosophy & Strategy

Our TypeScript migration will strictly follow **Vertical Slices (Tracer Bullets)**. Instead of converting the entire codebase in bulk, we will migrate **one module at a time, writing a failing test for its new TypeScript type contracts, implementing it, making it pass (GREEN), and refactoring**.

### Core Guidelines:
1. **Behavior-Focused Testing**: Tests will verify public interfaces, not internal structure. We will not mock private helper methods. Tests will survive internal code refactorings.
2. **Deep Modules**: Keep public API surfaces small and clean, pushing complexity (such as dynamic scraper fallbacks, caching eviction, and rate limits) behind robust, simple functions.
3. **No Horizontal Slicing**: Do not rename all files to `.ts` at once. Migrate one module completely from RED to GREEN before moving to the next.

---

## 📐 2. Public Interfaces & Type Contracts

Below is the design for the primary public interfaces that will be migrated and verified under TDD.

### A. Core Cache Module (`ResultCache`)
Located in `backend/cache.ts`.
```typescript
export interface ResultCacheOptions {
  maxSize?: number;
  defaultTtlMs?: number;
}

export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
}

export class ResultCache {
  constructor(options?: ResultCacheOptions);
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs?: number): void;
  invalidate(key: string): void;
  clear(): void;
  stats(): CacheStats;
}
```

### B. Secure Input Analyzer (`analyzer.ts`)
Located in `backend/analyzer.ts`. Combines parsing and input validation security.
```typescript
export type TargetType = 'EMAIL' | 'PHONE' | 'REAL_NAME' | 'DOMAIN' | 'USERNAME';

export interface AnalysisSuccess {
  valid: true;
  type: TargetType;
  sanitized: string;
}

export interface AnalysisFailure {
  valid: false;
  error: string;
}

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;

export function analyzeInput(input: string): AnalysisResult;
```

### C. SSE Event Stream & Outbound Validation (`sseManager.ts`)
Located in `backend/sseManager.ts`. Adopts a **pure functional approach** to prevent `this` binding bugs and simplify testing.
```typescript
import { Response } from 'express';

export type SSEEventType = 'progress' | 'result' | 'end' | 'error';

export interface SSEEvent<T = any> {
  id?: string;
  type: SSEEventType;
  data: T;
  timestamp: string;
}

export interface SSEController {
  send: <T>(type: SSEEventType, data: T) => void;
  end: () => void;
}

// Pure functional entrypoint - zero state lifecycle risk
export function initSSE(res: Response): SSEController;
```

### D. Abort-Aware OSINT Collectors (`scanner.ts`, `domainEngine.ts`, etc.)
```typescript
export interface AbortableScanOptions<T_Result = any, T_Progress = any> {
  signal?: AbortSignal;
  onResult?: (result: T_Result) => void;
  onProgress?: (progress: T_Progress) => void;
  onError?: (error: Error) => void;
  timeoutMs?: number;
}

export function isAbortError(err: any): boolean;
```

---

## 🚀 3. Tracer Bullet: Migrating the Cache Module

To prove that our Jest setup, TypeScript compiler, CommonJS target outputs, and `tsx` local environments are 100% correct, we will launch our **first tracer bullet** on the `ResultCache` module.

### Cycle 1 (Tracer Bullet):
1. **RED**: Rename `tests/cache.test.js` to `tests/cache.test.ts` (or create a TS test file). Update imports to use the TypeScript version of `ResultCache`. Verify that the test runner fails (as `backend/cache.ts` doesn't exist yet).
2. **GREEN**: Create `backend/cache.ts` using ESM syntax (`export class ResultCache`), compile it using `tsc -p tsconfig.backend.json` into CommonJS, and ensure the Jest test runner successfully imports and passes.
3. **REFACTOR**: Move helper types into `types/cache.ts`, keeping the cache module clean and deep.

---

## 🧱 4. Step-by-Step TDD Vertical Slices (Backlog)

Once the tracer bullet is verified, we will execute the remaining migration backlog incrementally:

```
                  ┌──────────────────────────────────────────┐
                  │ Tracer Bullet: cache.ts (LRU/TTL Types)  │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Slice 2: analyzer.ts (Zod Edge Shield)   │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Slice 3: sseManager.ts (Outbound Zod)    │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Slice 4: orchestrators & axios Abort     │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │ Slice 5: End-to-End SSE route handlers   │
                  └──────────────────────────────────────────┘
```

### 🛡️ Slice 2: Edge Input Sanitization & Classification (`analyzer.ts`)
* **Behavior 1: Input Type Detection & Graceful Fallback**: Maps inputs to `EMAIL`, `PHONE`, `REAL_NAME`, `DOMAIN`, or `USERNAME`. Add a critical TDD test to assert that if a collector is missing, disabled, or not matching, the core orchestrator gracefully degrades with a user-friendly error instead of crashing.
* **Behavior 2: Security Shield (Zod Validation)**: Rejects path traversals (e.g., `../../`), prevents ReDoS (caps length to 100 chars), and escapes scripting payloads.
* **TDD Path**: Write test checking that path traversal triggers `AnalysisFailure` -> Implement Zod boundary parser -> Test passes -> Refactor regex checks.

### 📡 Slice 3: Outbound SSE Event Integrity (`sseManager.ts`)
* **Behavior 1: Handshake & Connection Initialization**: Writes correct HTTP headers (`text/event-stream`, `keep-alive`, `no-cache`).
* **Behavior 2: Safe String Serialization**: Serializes data to valid JSON.
* **Behavior 3: Outbound Zod Schema Guards**: Functional wrapper throws error if outbound event data does not match `SSEEvent` schema (preventing silent client EventSource failures).
* **TDD Path**: Write test verifying malformed event payload is blocked -> Add outbound Zod validation parser to `initSSE` controllers -> Test passes -> Refactor string serialization.

### 🔌 Slice 4: Abortable Collectors & Mid-Stream Interruption (`domainEngine.ts`, `breach_engine.ts`, etc.)
* **Behavior 1: End-to-End Abort Propagation**: Passes the `AbortSignal` all the way down to Axios request blocks.
* **Behavior 2: Silent Exit on Abort**: Catches `AbortError` and silences it without polluting output logs or throwing 500 errors.
* **Behavior 3: Mid-Stream Interruption (Resource Leak Protection)**: 
  * *Critical Test Case*: Aborting mid-way through a chunked stream (e.g., after receiving chunk 2 of 5).
  * *Asserts*:
    1. Chunks 3, 4, and 5 are completely blocked from executing.
    2. Active/pending Axios requests are immediately canceled via `CancelToken`/`AbortSignal`.
    3. No dangling promises remain unresolved in the Node.js event loop.
* **TDD Path**: Write a mock collector firing requests sequentially. Assert that triggering `abort()` mid-stream rejects downstream executions and cancels active requests immediately -> Wire `AbortSignal` checks to every sequential step and Axios fetch parameter -> Test passes -> Refactor with `isAbortError` utility.

---

## 📝 5. TDD Verification Checklist

For each cycle, the developer must verify:
- [ ] The test describes a critical public behavior, not a private implementation method.
- [ ] No speculative "just-in-case" features are written. Code is minimal to pass the test.
- [ ] All tests survive internal refactoring of helper functions or algorithms.
- [ ] Jest runs tests fast (< 2 seconds per file) using compiled CommonJS output.

---

## 🙋‍♂️ 6. Approvals & Feedback

Before we write any code, we need your feedback:
1. **What should the final public interfaces look like?** Do the signatures in Section 2 match your expectations?
2. **Which behaviors are most important to prioritize?** Do you agree with the prioritization order in Section 4?
