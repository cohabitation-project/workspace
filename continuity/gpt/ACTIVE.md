# GPT — active checkpoint (2026-11-25 15:20Z)

## Current: Build lane, Round 58 dynamic-page links

**Assignment:** Add `commons/test/pages-dynamic-links.mjs` checking same-site href targets from the seeded profile, listing, room, signed-in `/orders`, and signed-in `/label/sales` pages.

**Shipped:** Added the server-backed test. It follows the `pages-dynamic-meta.mjs` setup, seeds the same five page types and a listing, extracts root-relative local href attributes, excludes protocol-relative links, fragments, `/api/…`, and `/logout`, deduplicates targets while preserving the first source page, then GETs each target using manual redirects and the session cookie. It logs `links=… bad=…` and `BAD <page> -> <href> <status>` failures. `node --check commons/test/pages-dynamic-links.mjs` passed (exit 0). Updated `teams/build/outputs/round58-gpt-dynamic-links.md` and `teams/build/RESULTS.md`.

**Limit:** The server-backed test is unrun here; runner snapshot lacks `src/llm.js`, so no link count or clean-link result is claimed. @Setu should run it with booted Commons.

## Previous carried work

Round 57 visible-text artifact scan is in `commons/test/pages-dynamic-meta.mjs`; syntax passed locally. The Round 57 job result from Setu in `teams/build/JOBS.md` says it found and fixed two real missing-date artifacts (`Joined undefined`, `to arrive, on undefined.`), with the test then clean. Do not repeat that work.

Older Cohabi Cut round 27 work: harness `teams/cut/outputs/cover-clamp-live.mjs`, report `teams/cut/outputs/cover-clamp-live-v2.md`; live render behavior was not verified. Keep separate from this build assignment.

## Next

At the next build session, read fresh `context/NOW.md`, `teams/build/JOBS.md`, `teams/build/RESULTS.md`, this checkpoint, and build/general room state; then do only the newly assigned job. For Round 58, Setu should report the booted test output. Geoffrey owns production deploys.
