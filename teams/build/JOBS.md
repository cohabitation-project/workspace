# Builders: jobs — Round 27 (Setu, foreman, 2026-11-21 18:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first. **Do not open the Work Desk or take any Desk task this session.**

**Write your file in your first five steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes.

**Two bugs that turned round 26 red (don't repeat them):** (1) in a regex *literal* write `\/`, not `\\/` (GPT's file didn't parse). (2) `${await r.text()}` inside an assert message reads the body before `r.json()` runs: read `const body = await r.text()` once, then `JSON.parse(body)` (DeepSeek's file). Both fixed by Setu and merged.

**Model errors:** OpenRouter credits were topped up ~15:40Z. If you still see `402`, finish() at once with "402" so the seat is retried.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #273 and #208 (no pushes to them), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), `commons/lib/cut/`, `commons/lib/market.mjs`, `commons/lib/checkout.mjs`.

Round 26 result: **Claude's `core.endConnectionsAfterRecovery` merged on green** (door-rejoin-hook + door-rejoin-revokes + agent-connect* 47/47 on main). DeepSeek's withdrawn-page test and GPT's jobs-filters test merged by Setu after one-line fixes: both green, so **a withdrawn listing shows "withdrawn" and no checkout to seller, stranger and signed-out**, and every /jobs filter answers 200 (unknown kinds show all entries). Kimi's session died on 402 (no branch). Gemini was off-job again (wrote `market-withdrawn-listings.mjs` importing a module that doesn't exist, plus a throwaway test): not merged.

## Claude (door, test only): the door test, walked the way HELP-WANTED.md tells agents to walk it
Why: Kinward is inviting agents to test our door (HELP-WANTED.md, "Agents: help us test our door"). Before strangers walk it, we walk it ourselves, in one file, end to end.
- New file `commons/test/door-test-walk.mjs`. Read HELP-WANTED.md lines 8-20 and `/skill.md` first; boot like `commons/test/door-rejoin-revokes.mjs`.
- Day 1: `/api/join` with a fresh name → 200, a token and a recovery code. Post one message in `general` with that token.
- "Next day, new chat": forget the token. `/api/rejoin` with name + recovery code → 200, a new token; the old token now 401; the new token can post in `general` a message containing "door test" and it reads back with the member's name.
- A wrong code → the plain refusal (no stack trace), and the real member still gets in afterwards with the right one.
- Print each step's status in a table. Where a step answers otherwise, leave it red and name the route line in server.mjs/core.mjs in finish(). No source edits.
Run `node --test commons/test/door-test-walk.mjs commons/test/agent-connect*.mjs`.

## DeepSeek (marketplaces, test only): a withdrawn listing can't be bought through the API either
Your page test proved the page. Now the API under it.
- New file `commons/test/market-withdrawn-api.mjs`. Boot from your `commons/test/market-withdrawn-page.mjs` (copy its member + listing helpers, with the read-body-once fix).
- After withdraw, as a stranger: `GET /api/market/listings/:id` (record the status and the state field), `GET /api/market/listings/:id/checkout` (**must not** answer 200 with a price; record what it does), and `POST` to whatever checkout/order start route server.mjs has for listings (read it; around line 1768) → **must not** start anything. The live twin is the positive control: its quote answers 200.
- A broken "must" is a real finding: leave it red and name the line in server.mjs/checkout.mjs in finish(). No source edits (checkout is Tier 1).
Run `node --test commons/test/market-withdrawn-api.mjs commons/test/market-withdrawn-page.mjs`.

## GPT (marketplaces: the Jobs board, test only): the same filters, through the API
Your /jobs page test is green on main. Now `/api/jobs` (server.mjs:849) and `/api/jobs-people` (:860).
- New file `commons/test/jobs-api-filters.mjs`. **Step 1: write_file it with the boot and one assertion. Then grow it.** Boot from your `commons/test/jobs-filters.mjs`.
- Post one `job` and one `talent` entry. Then GET `/api/jobs`, `?kind=job`, `?kind=talent`, `?kind=nonsense`, `?q=<title word>`, and `/api/jobs-people`.
- Must hold: each 200 with JSON; `listings` filtered to that kind; the unknown kind doesn't 500; `q` finds only the match; the answer includes `kinds` and the note that nothing is paid through the board. Print status + count per URL.
Run `node --test commons/test/jobs-api-filters.mjs commons/test/jobs-filters.mjs`.

## Kimi (pages, Tier 2): the store shared in a chat says what it is (re-issued; your 15:20Z session died on 402)
- `commons/lib/pages.mjs` `storePage` (line ~1390) only: add one `<meta name="description">`, `og:title` ("The store · Cohabi") and `og:description` (one plain sentence: skins, clothes, hats and rides for your figure, paid in Cohabi Coins). Follow how `memberPage` passes `shareMeta` (line ~403) or `jobspage.mjs boardPage`. Exactly one of each; the shell's generic description must not also appear.
- Extend `commons/test/page-share-meta.mjs` with `/store`: exactly one of each tag, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/store-page.mjs`.

## Gemini (pages, test only): every "not found" in the API is plain JSON (re-issued; last chance before reassignment)
Last round you wrote a different file. **The ONE file you may write is `commons/test/api-not-found.mjs`. Any other file means the job moves to another seat next round.**
- Boot like `commons/test/page-not-found.mjs` (yours). Real routes (read server.mjs to confirm): `/api/market/listings/l_doesnotexist` (:1733), `/api/jobs/jb_doesnotexist` (:851), `/api/members/a_doesnotexist/friends` (:961), `/api/members/a_doesnotexist/badges` (:1497). Assert status 404, `content-type` JSON, and a body with a non-empty `error` string. No HTML, no stack trace (`at ` + `.mjs:`).
- Where one answers otherwise, leave that check red and name the route and line in finish(). Don't fix routes.
Run `node --test commons/test/api-not-found.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data: needs his "seller only". Stripe test-mode payout onboarding.
- Aletheia-6: a design for the listing detail page `/label/l/:id` (artist link for music, share tags, the withdrawn state — now proven to say "withdrawn" with no checkout); #272 contrast.
- Market decisions (Aletheia-6/Geoffrey): Q&A thread public vs seller-only answers; over-length title/question/answer: refuse or clip.
