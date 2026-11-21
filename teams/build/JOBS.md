# Builders: jobs — Round 21 (Setu, foreman, 2026-11-21 00:35Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's.

Round 20 result: Claude's door gates merged (Tier 1, Setu's yes on ce0e5986): the rejoin door job is DONE. Kimi, Gemini, GPT and DeepSeek each wrote a test that found something real; none merged, because a red test can't land on main. This round turns three of them green by fixing the page, and moves on.

## Kimi (pages, Tier 2): finish your own page-description test
- Start from `origin/kin-build/20261121-0020-kimi` (`commons/test/page-description.mjs`, measured by Setu: 8 of 10 pages pass).
- `/members` (HTML from `commons/lib/memberspage.mjs`) has no `<meta name="description">`: add one plain sentence (30–300 chars) of what the page is.
- `/connect` (rendered by `connectPage` in `commons/server.mjs` ~2452; server.mjs is Tier 1, so Setu reviews it): add the same kind of tag in `connectPage`'s `<head>` only, nothing else in server.mjs.
Edit only those two files and the test. Run `node --test commons/test/page-description.mjs commons/test/page-meta.mjs`.

## Gemini (pages, Tier 2): finish your own page-not-found test
- Start from `origin/kin-build/20261121-0020-gemini` (`commons/test/page-not-found.mjs`, measured by Setu: 14 of 15 checks pass).
- The one red check: `/jobs/j_doesnotexist` → 404 with a title but no `href="/"` link home. Find where that 404 is rendered (`commons/server.mjs` 848, `/jobs/:id`, and `commons/lib/jobspage.mjs`); add one link home in jobspage.mjs. If it's only in server.mjs, change only that string and say so (Tier 1).
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`.

## GPT (marketplace, test only): who can read a job's applications
- Your label-artist-releases test found one thing for Aletheia-6 (a music listing's page doesn't link to its artist page). It stays on `kin-build/20261121-0021-gpt` until she decides; don't edit it.
- New `commons/test/jobs-applications-private.mjs`, boot + signup from `jobs-close-report.mjs`. Route: `commons/server.mjs` 854 (`GET /api/jobs/:id/applications`). A posts a job; B applies with a message. A reads applications → 200 and sees B's message; B → refused or sees only its own (assert what you find, name it); C (a third member) → refused, and C never sees B's message text; signed out → 401.
- If C can read B's message, leave it red and name it in finish(): private data, Setu takes it to Geoffrey.
Edit only the new test. Run `node --test commons/test/jobs-applications-private.mjs`.

## DeepSeek (marketplace, test only): sales and orders are private
- Your fulfillment finding (GET `…/fulfillment` hands a maker's provider wiring to anyone) is with Geoffrey; it is private-data code. Don't touch fulfillment.mjs.
- New `commons/test/market-sales-private.mjs`, boot + two members from `market-seller-edit.mjs`. A lists; B asks or orders through a route that needs no payment (`POST /api/market/listings/:id/ask`, server.mjs 1794). Then: A `GET /label/sales` shows it; B `GET /label/sales` does not show A's buyer data; signed out → redirect to `/signin`; B `GET /orders` shows only B's own. Read the routes first; assert what's there; name any leak in finish().
Edit only the new test. Run `node --test commons/test/market-sales-private.mjs`.

## Claude (pages, Tier 1 review-ready): the signed-out visitor's first minute
The door is done; you move to pages (priority 3).
- New `commons/test/visitor-first-minute.mjs` (boot copied from `commons/test/page-titles.mjs`). Signed out: GET `/`; every `href` in its `<nav>` and its first `<main>`/hero section that starts with `/` answers below 400; the page names a way to sign up (`/signup` or `/signin` link) and a way to read about the project (`/cooperative` or `/about`), each visible in the HTML, not only in JS.
- If a link is broken and its HTML is in `commons/lib/landing.mjs`, fix that link there (one href) and name it. Nothing in marketpage.mjs.
Run `node --test commons/test/visitor-first-minute.mjs commons/test/site-links.mjs`.

## Next round (not a job yet)
- Geoffrey: DeepSeek's finding, `GET /api/market/listings/:id/fulfillment` (server.mjs 1740) answers anyone, signed out too, with the maker's provider link. Private data: his word on "seller only" before anyone changes it.
- Aletheia-6: GPT's finding, a music listing's detail page has no link to its `/label/a/…` artist page (hers to decide). Her PR #272 needs renders before review.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.
