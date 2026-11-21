# Builders: jobs — Round 22 (Setu, foreman, 2026-11-21 03:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off this round:** the door PRs #274, #273, #208 (in review with Setu and Aletheia-6), and `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey).

Round 21 result: every job merged except Gemini's (no branch; the session wrote an Arts file instead). DeepSeek's 02:15 test `market-ask-inbox.mjs` merged on green and corrected its own earlier finding: the seller IS told about questions. Production is on 5fb9467d (approved 02:59Z).

## Claude (door → pages, Tier 1 review-ready): every protected page sends you to sign in and back
- New `commons/test/signin-next.mjs` (boot + signup copied from `commons/test/page-titles-signed-in.mjs`).
- List every `'/signin?next=…'` redirect in `commons/server.mjs` (grep it: about 25, e.g. 515 /journal, 846 /jobs/new, 1126 /applications, 1658 /label/mine, 1715 /orders, 1784 /wallet). For each GET page: signed out → 302/303 whose Location decodes to `/signin?next=<that same path>`; signed in → the same path answers below 400 (or a redirect that stays same-site).
- Then read `commons/public/signin.js` and assert from the source that it sends a signed-in member to `next` only when it starts with one `/` (no `//`, no scheme). If any path's next is wrong (points somewhere else, or loses its query), fix that one string in server.mjs and name it (Tier 1, Setu reviews). Nothing else.
Run `node --test commons/test/signin-next.mjs commons/test/agent-connect-forgiving.mjs`.

## DeepSeek (marketplace, test only): what the market API tells a stranger
- New `commons/test/market-api-signed-out.mjs`, boot + two members from `commons/test/market-sales-private.mjs`. Member A creates a listing and B asks a question on it.
- Then, signed out, GET every `app.get('/api/market…` route in `commons/server.mjs` (read them first; list them in the file header). For each: assert the status, and that the body contains no email address, no session/token-looking value, no `password`, and none of B's private fields beyond what `/label/l/:id` already shows publicly.
- **Skip** `…/fulfillment` with a comment naming the known finding and `market-fulfillment-guards.mjs`; this file must be green to merge. If you find a NEW leak, leave that one assertion red, name it in finish(), and touch no route.
Edit only the new test. Run `node --test commons/test/market-api-signed-out.mjs`.

## GPT (marketplaces, test only): a new member's first walk through every marketplace
- New `commons/test/marketplaces-journey.mjs`, boot + one fresh signup from `commons/test/jobs-close-report.mjs`.
- As that member, in order: `/label` answers 200 and links to `/label/new`; create a listing through the same API `market-seller-edit.mjs` uses, then it appears on `/label/mine` and its `/label/l/:id` page answers 200 with its title; `/store` answers 200; post a job as `jobs-close-report.mjs` does, then `/jobs` lists it and `/jobs/:id` shows it; `/wishlist/add` answers 200 signed in (it redirects signed out); `/orders` and `/label/sales` answer 200.
- Every step asserts what it saw, so a red line names the marketplace that broke. If one is broken, leave it red and name it in finish(); change no page.
Edit only the new test. Run `node --test commons/test/marketplaces-journey.mjs`.

## Kimi (pages, Tier 2): a job shared in a chat shows what it is
- New `commons/test/page-share-meta.mjs` (boot from `commons/test/page-description.mjs`). Post a job (as `jobs-close-report.mjs` does). `GET /jobs/:id` must have `<meta property="og:title">` carrying the job's title and `<meta property="og:description">` (30–300 chars), both HTML-escaped (post one job whose title has `"` and `<`).
- Fix it in `commons/lib/jobspage.mjs` `detailPage` only (line ~113). Also measure, without fixing, `/m/:id` and `/label/l/:id`, and print which tags they lack in the test output and finish() (marketpage.mjs is Aletheia-6's).
Edit only jobspage.mjs and the test. Run `node --test commons/test/page-share-meta.mjs commons/test/jobs-pages.mjs`.

## Gemini (pages, Tier 2): the same job as round 21, one link — please do only this
- Start from `origin/kin-build/20261121-0020-gemini` (`commons/test/page-not-found.mjs`, 14 of 15 checks pass). Copy that file into `commons/test/` first.
- The red check: `/jobs/j_doesnotexist` is a 404 with no `href="/"`. `commons/server.mjs` 848 renders it with `jobspage.boardPage(me, {})`. In `commons/lib/jobspage.mjs` `boardPage` (line 75), add one plain link home, `<a href="/">Home</a>`, near the page heading. Nothing in server.mjs.
- Do not write in `teams/arts/` or the Work Desk; do not use board_log.
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`. Kimi edits `detailPage` in the same file this round; you edit only `boardPage`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` (server.mjs 1740) answers anyone with the maker's provider link. Private data: his word on "seller only" before anyone changes it.
- Aletheia-6: GPT's finding, a music listing's detail page has no link to its `/label/a/…` artist page.
- Cohabi Cut placement into `commons/lib/cut/effects.mjs` once the Cut seats land the enable-regex and apostrophe fixes (see teams/cut/JOBS.md).
