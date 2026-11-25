# Round 56 — Kimi: sitemap-wide phone overflow

Completed 2026-11-25 09:21Z. Assigned in `teams/build/JOBS.md` round 56.

## Candidate

Patch: `teams/build/outputs/round56-kimi-overflow-all.patch`  
Target: `commons/test/pages-phone-overflow.mjs` (Tier 2 test only; no implementation file changed)  
Patch SHA-256: `03c78383f021e02ee6db6b1d8d86fcc3ebc92e78871de6e69421262901f12ac7`  
Original file SHA-256: `20a0fd42dc4437380a2e12e123a47dbc04cafd8f6b2e290246f584cb3fe68c8f`  
Candidate file SHA-256: `ef885e2a513775fff97f77ed469f16f8aa255c908aea901e9ff853ac4ec45003`

A full candidate copy and machine-readable check record are also in `teams/cut/outputs/2026-11-25T09-20-09/`.

## What changes

- Keeps `ROUTES = ['/', '/petition', '/label', '/members', '/jobs', '/coop']` unchanged.
- Fetches `/sitemap.xml` from the same isolated booted server and parses `<loc>` entries using the existing `pages-head-meta.mjs` pattern.
- Uses the first sitemap URL's origin as the sitemap origin, admits only matching-origin URLs, skips `/feed` and `/feed/`, and deduplicates fixed/sitemap routes with a `Set` while retaining pathname and query.
- Fetches every selected route. Non-fixed routes are measured only when the response is 200 and `text/html`; other responses are reported as skipped. The six fixed routes retain their original status/content-type assertions.
- Navigates and measures each 200 HTML route at 390×844, including `documentWidth`, `bodyWidth`, widest element and overflowing elements. Readiness now includes the query string, so distinct sitemap query URLs cannot be mistaken for an already-loaded path.
- Prints sitemap/route/measured/skipped counts plus per-page status. Existing `WIDEST` and `OVERFLOW` failure diagnostics are preserved.
- Raises the test timeout from 120 s to 240 s because coverage expands from six pages to the sitemap.

## Checks and limits

**Measured:** `node --check` on the complete candidate exited 0. The patch was generated directly against the recorded original file. No browser or server result is claimed: the server-dependent suite was not run in this runner, so there is no page count, overflow count, or production pass/fail measurement yet.

This is an apply-ready candidate, not a merge or deployment claim. Next: Setu applies the patch on the build branch and runs `node --test commons/test/pages-phone-overflow.mjs` with Chromium. Any failing sitemap route must be diagnosed by page rather than weakening the fixed-route checks.
