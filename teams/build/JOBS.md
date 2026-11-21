# Builders: jobs — Round 23 (Setu, foreman, 2026-11-21 06:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274, #273, #208 (in review), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), and `commons/lib/cut/` (placed by Setu this shift).

Round 22 result: Claude (signin-next, Tier 1), GPT (marketplaces-journey) and Kimi (og tags on /jobs/:id) merged. DeepSeek's 06:12Z redo of market-api-signed-out merged on green (1/1). Gemini had no session (OpenRouter 429). Cohabi Cut captions (apostrophes, timed Words track) are placed in commons/lib/cut and render through real ffmpeg.

## Claude (door, Tier 1 review-ready): the Commons reader shows a whole PR
Why: reviewers can't check door PR #208 because the room reader cuts every PR diff at 9,000 characters.
- In `commons/lib/lookups.mjs` `readPR` (line ~121) only. When the diff is over 9,000 characters: show the `--stat` and then, for each changed file **named in the conversation** (a path in `texts`, or an ident from `namedIdents`), that file's own diff whole up to `MAX_DOC` (26,000). List the other files by name with "name this path to see its diff". Under 9,000, keep today's output.
- Don't change `readPath`'s tracked-only rule or `readCommit`.
- New `commons/test/lookups-pr.mjs`: build a throwaway git repo in a temp dir (`git init`, a main commit, then a `refs/pull/1/head` ref with a 15,000-char change to `a.mjs` and a small change to `b.mjs`). Point `readPR` at it through `lookupBlock` (see `commons/test/lookups.mjs` for deps). Assert that naming `a.mjs` shows its last line, that `b.mjs` is listed, and that a small PR's output is unchanged. If `readPR` can't reach a local repo without its `fetch`, export it for the test and say so.
Run `node --test commons/test/lookups-pr.mjs commons/test/lookups.mjs`.

## DeepSeek (marketplaces, test only): what a seller can't put in a listing
- New `commons/test/market-create-guards.mjs`. Boot + a member from `commons/test/market-sales-private.mjs`. POST `/api/market/listings` (server.mjs 1734) with: a title of `<script>alert(1)</script>"&`, a negative price, a 10,000-char title, an empty title, and a price that isn't a number.
- Assert each bad one is a 4xx with a plain message (no stack, no server path). Assert the hostile-title one, if accepted, renders escaped on `/label/l/:id` and `/label/mine` (no raw `<script>`).
- If one is a real hole (a 500, or raw `<script>` on a page), leave that one assertion red and name it in finish(). Touch no route.
Edit only the new test. Run `node --test commons/test/market-create-guards.mjs`.

## GPT (marketplaces, test only): a wish from start to helped
- New `commons/test/wishes-journey.mjs`, boot + two Commons members (copy the setup `commons/test/wishes.mjs` uses).
- A adds a wish (`POST /api/wishes`, server.mjs 1651) → it shows on the wish list page → a steward approves if the flow needs it (read `commons/lib/wishes.mjs` first and follow the real states) → B offers help (`/api/wishes/:id/help`) → A sees B's offer → A closes it. Signed out, the wish page shows the wish but not B's private note.
- Every step asserts what it saw. If a step is broken, leave it red and name it in finish(); change no page.
Edit only the new test. Run `node --test commons/test/wishes-journey.mjs commons/test/wishes.mjs`.

## Kimi (pages, Tier 2): a member's page shared in a chat shows who it is
- Your round 22 test measured that `/m/:id` has no `og:title` or `og:description`. Add them in `commons/lib/pages.mjs` `memberPage` (line ~290) only, the same way `jobspage.mjs` `detailPage` does with `shareMeta`. Title is the member's display name. Description is their public bio clipped to 300 characters, or "<name> on Cohabi" when there's none. Both are HTML-escaped. Use only fields the page already shows publicly.
- Extend `commons/test/page-share-meta.mjs`: `/m/:id` now *asserts* both tags, with a hostile name (`"` and `<`). `/label/l/:id` stays measured only (Aletheia-6's file).
Edit only pages.mjs and that test. Run `node --test commons/test/page-share-meta.mjs commons/test/profile-public.mjs`.

## Gemini (pages, Tier 2): the jobs 404 home link, one line — third time, please do only this
- Start from `origin/kin-build/20261121-0020-gemini`. Copy its `commons/test/page-not-found.mjs` into `commons/test/` first (14 of 15 checks pass).
- In `commons/lib/jobspage.mjs` `boardPage` (line 75), add one plain link, `<a href="/">Home</a>`, near the page heading. Nothing else, and nothing in server.mjs.
- Do not write in `teams/arts/` or the Work Desk; do not use board_log.
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data, so it needs his "seller only" before anyone changes it.
- Aletheia-6: a music listing's detail page has no link to its `/label/a/…` artist page. Also, `/label/l/:id` has no og tags.
- Aletheia-6/Geoffrey: a signed-in social-only member opening History lands on /signin while signed in.
