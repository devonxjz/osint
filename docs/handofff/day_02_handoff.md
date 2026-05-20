# Handoff — OSINT Platform: Monorepo Merge + CI/CD Setup

**Date:** 2026-05-20  
**Branch at handoff:** `main` (HEAD: `6ea9cf2`)  
**Repo:** https://github.com/devonxjz/osint

---

## What Was Done This Session

### 1. Platform Registry Cleanup
Removed noisy/irrelevant platforms from `api/registry.js`:
- Removed: **Linktree, About.me, Kaggle, Substack**
- Removed entire **Forums** category: Something Awful, Stack Overflow, Bitcointalk, HackerNoon, Slack, Disqus, Eurogamer
- Updated threshold in all 3 test files from `>100` → `>85`
- All 64/64 Jest tests pass after cleanup

### 2. Monorepo Merge (`fe/` + `be/` → root)
Previously the repo had two separate package trees: `fe/` (Vite+Svelte, ESM) and `be/` (Express, CommonJS). These were merged into a single unified project at the repo root.

**New structure:**
```
osint/
├── api/          ← Express backend (formerly be/src/)
├── src/          ← Svelte frontend (formerly fe/src/)
├── tests/        ← Jest tests (formerly be/tests/)
├── scripts/      ← Audit tools (formerly be/scripts/)
├── public/       ← Static assets
├── package.json  ← Single unified package (type: commonjs)
├── vite.config.ts ← Vite + proxy /api → localhost:3000
├── vercel.json   ← Vercel routing config
├── svelte.config.js ← CommonJS format (module.exports = {})
└── .github/workflows/
    ├── ci.yml
    └── preview.yml
```

**Key fix in `src/App.svelte`:** Hardcoded `http://localhost:3000` replaced with:
```js
new ScannerState(typeof window !== 'undefined' ? window.location.origin : '')
```

**Commits:** `5e296b1`, `44558c4`

### 3. GitHub Actions CI/CD Pipeline
Two workflow files created and merged into `main` via PR #9:

**`.github/workflows/ci.yml`** — triggers on push/PR to `main` or `dev`:
- Job 1: `🧪 test` — `npm ci` + `npm test` (Jest, 64 tests)
- Job 2: `🏗️ build` — `npm run build` (Vite), uploads `dist/` artifact
- Job 3: `🚀 deploy-production` — Vercel CLI deploy, **only on push to `main`**

**`.github/workflows/preview.yml`** — triggers on PR to `dev`:
- Runs tests → deploys Vercel preview → comments URL on PR

**Fixes applied to workflows:**
- Added `permissions: contents: read` (private repo access)
- Added `token: ${{ secrets.GITHUB_TOKEN }}` to every `checkout` step
- Commits: `babd13d`, `0f2817c`, `4c1f9a6`

### 4. Vercel Build Fix
Vercel was auto-detecting the project as **SvelteKit** (due to `svelte.config.js`) and running `rollup -c` instead of `vite build`. Fixed by adding explicit overrides to `vercel.json`:
```json
{
  "framework": null,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/index.js" }]
}
```
Commit: `4c1f9a6`

---

## Current Blockers — Action Required

### 🔴 Vercel Secrets Not Configured
The CI/CD pipeline fails at `vercel pull` with `No existing credentials found` because the 3 required GitHub Secrets have **not been added yet**.

The user accidentally exposed a token in chat — **it must be revoked immediately** at https://vercel.com/account/tokens before generating a new one.

**Secrets needed in GitHub → Settings → Secrets and variables → Actions:**

| Secret | How to get |
|--------|------------|
| `VERCEL_TOKEN` | vercel.com/account/tokens → Create new token |
| `VERCEL_ORG_ID` | Run `vercel link` locally → `.vercel/project.json` → `orgId` |
| `VERCEL_PROJECT_ID` | Same file → `projectId` |

Once secrets are set, push any commit to `main` to trigger the production deploy pipeline.

---

## Current State Summary

| Area | Status |
|------|--------|
| Registry (92 platforms, 7 categories) | ✅ Clean |
| Backend tests (64/64) | ✅ All passing |
| Vite build | ✅ Compiles clean |
| Monorepo structure | ✅ Merged, pushed to `main` |
| CI/CD workflow files | ✅ On `main`, syntactically correct |
| Vercel deployment | ❌ Blocked — secrets not configured |

---

## Local Dev Commands (from repo root)

```bash
# Frontend (Vite dev server, port 5173, proxies /api → 3000)
npm run dev

# Backend (Express, port 3000)
npm run server

# Tests
npm test

# Live blacklist audit
npm run test:live-audit
```

---

## Files to Know

| File | Role |
|------|------|
| `api/registry.js` | Platform registry — add/remove platforms here |
| `api/scanner.js` | HTTP scan engine + blacklist verification |
| `api/index.js` | Express server + SSE endpoint `/api/scan` |
| `src/lib/scanner.svelte.ts` | Svelte reactive state + SSE client |
| `src/lib/CardGrid.svelte` | Results UI — shows only FOUND platforms |
| `tests/registry.test.js` | Platform count/schema assertions |
| `vercel.json` | Vercel build + routing config |
| `.github/workflows/ci.yml` | CI + production deploy pipeline |

---

## Suggested Next Steps

1. **Revoke leaked token** → create new Vercel token → add all 3 secrets to GitHub
2. **Test deploy**: push a small commit to `main` and watch the Actions tab
3. **Set up `.env` on Vercel dashboard** for platform cookies (`FACEBOOK_COOKIE_KEY`, etc.) needed by the scanner at runtime
4. **Consider**: The `api/index.js` Express server runs as a Vercel Serverless Function — SSE (Server-Sent Events) long-lived connections may hit Vercel's **10-second serverless timeout**. If scans time out in production, this will need to be addressed (e.g., chunked polling, or upgrading to Vercel Pro for longer timeouts).

---

## Suggested Skills for Next Session

- **`/diagnose`** — if Vercel deploy succeeds but SSE scan times out in production
- **`/improve-codebase-architecture`** — if the SSE timeout issue requires a deeper architectural fix (e.g., moving scan logic to a queue/polling model)
