# ADR 005: TypeScript Backend Migration Architecture

## Status
**Accepted**

## Context
We are migrating the entire OSINT backend from JavaScript (CommonJS) to TypeScript to improve maintainability, developer experience, type safety, scalability, and security. During our architectural alignment session, we evaluated several design trade-offs:
1. **Stateless Nature vs. Database Models**: The backend is stateless, relying on an in-memory `ResultCache` and real-time SSE streaming with no external DB (Mongoose, Prisma, etc.). The PRD originally mentioned database models, which is a discrepancy.
2. **Framework Selection**: Sticking to the current lightweight Express application vs. rewriting it in NestJS.
3. **Module Resolution**: Compiling TypeScript source files (written in modern ES Modules syntax) to ES Modules output vs. compiling to CommonJS output.
4. **Local Dev & Build Pipeline**: Pre-compiling via background watch processes vs. executing on-the-fly via `tsx` (esbuild).
5. **Input Validation Strategy**: Using strict validation schemas vs. loose interfaces for high-resilience external scrapers.
6. **SSE & Abort-Aware Streams**: Strong types for Server-Sent Events callback flows and silent AbortPropagation.

Based on feedback and design reviews, three additional architectural gaps were identified and addressed:
* **End-to-End Abort Propagation**: Abort controllers cannot just be a typing ornament. If an `AbortSignal` is not hardwired down to the network request layer (e.g. Axios calls), resources are leaked when clients disconnect.
* **Cache Bloat Protection**: The stateless in-memory cache needs strict eviction rules (`maxSize` and `defaultTtlMs`) to prevent Out-Of-Memory (OOM) crashes in multi-tenant environments.
* **Outbound SSE Validation**: Outbound events must be schema-validated before dispatching to client `EventSource` targets, preventing silent client crashes due to malformed payloads.

## Decision
We will execute the TypeScript migration using the following architecture:
1. **Dossier & Registry Schemas**: Remove all references to "Database models". Instead, define strong TypeScript types/interfaces for `Dossier` structures (Email, Phone, Domain, Username), `ResultCacheOptions`, `CacheEntry<T>`, and `Platform` registry configurations.
2. **Strictly Express**: Retain Express as the routing framework. Install `@types/express` for full IDE autocomplete. Avoid the overhead and full rewrite of NestJS.
3. **ESM Source, CommonJS Build**: Write modern `import`/`export` syntax in `.ts` source files, but configure `tsconfig.json` to compile down to **CommonJS** (`"module": "CommonJS"`, `"target": "ES2022"`). This keeps the 24 Jest tests, `nodemon`, and Vercel serverless build running natively out-of-the-box.
4. **Compile-on-the-fly (`tsx`) for Dev**: 
   * Local development: Use `tsx` (esbuild-powered execute) with `nodemon` to execute `.ts` source files on-the-fly without intermediate disk-based compilation (`nodemon --watch backend --ext ts --exec tsx backend/index.ts`).
   * Production build: Use `tsc -p tsconfig.backend.json` to compile files to `dist-backend/`, with `api/index.js` acting as the production gateway pointing to `../dist-backend/index.js`.
5. **Security & Input Validation (Zod Edge Shield)**:
   * Use **Zod** strictly at the Express Client boundaries (Request DTOs) to prevent injection, path traversal, ReDoS, and XSS vulnerabilities.
   * Use **flexible TypeScript Interfaces** with optional fields (`?:`) and default fallbacks for external scraped OSINT data to guarantee resilience against unpredictable third-party API schema changes.
6. **Robust SSE & End-to-End Abort System**:
   * **Abort Controller Wiring**: Ensure `AbortSignal` is strictly passed as a parameter from the Express route, through the orchestrators, down to the actual `axios` configuration blocks (`{ signal: options.signal }`).
   * **Cache Guardrail**: Explicitly enforce an LRU strategy in our `ResultCache` typings with a strict cap (e.g. `maxSize: 1000`) and a strict Time-To-Live (e.g. `defaultTtlMs: 3600000`) to prevent memory leaks.
   * **Outbound Zod SSE Validation**: Outbound events must be run through a Zod parser schema *before* being written to the Express response stream. This guarantees that malformed payloads do not crash client `EventSource` listeners.

## Consequences
* The backend will achieve 100% type-safety without changing its stateless, high-performance streaming nature.
* Developer experience is maximized using fast on-the-fly execution via `tsx` during local runs.
* Production deployments and Jest test suites remain stable and unmodified as they continue running compiled CommonJS code.
* The system is protected against input-level security vulnerabilities at its edge boundaries while preserving scraper robustness.
* Resource exhaustion is prevented through end-to-end Axios request abortion and memory-bounded LRU cache eviction rules.
* Client-side stream rendering is robustly protected against malformed JSON data structures.
