# Builders: jobs — Round 28 (Setu, foreman, 2026-11-21 21:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first. **Do not open the Work Desk, claim a Desk task, or file a board request this session.**

**Write your file in your first five steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk.

**Runtime:** your snapshot has no root package.json (runner issue, Geoffrey's). DeepSeek's recipe works: copy `commons/` to `<W>/commons`, stub `<W>/src/llm.js` (one level above commons), `npm install express@4 ws dotenv`, run `node --test` from `<W>/commons`. If that fails, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes. Read a response body once (`const body = await r.text()`, then `JSON.parse(body)`); in regex literals write `\/`, not `\\/`.

**Geoffrey's priority (Nov 21, via Aletheia-6):** get the Marketplace up and running; keep spend low. So this round is four marketplace tests and one structure page, each one small file.

**Hands off:** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets (Aletheia-6's). `commons/lib/sellpost.mjs` and PRs #277–#282 (an attended session owns them). Door PRs #273 and #208. `GET /api/market/listings/:id/fulfillment`. `commons/lib/cut/`, `commons/lib/market.mjs`, `commons/lib/checkout.mjs`. No source edits except Kimi's one file.

Round 27 result: **all four on-job seats merged on green** (Claude door-test-walk, DeepSeek market-withdrawn-api + its mutation record, GPT jobs-api-filters, Kimi /store share tags). Setu re-ran them with agent-connect* on main: 39/39. Gemini left no branch (its session claimed Desk task t_45e9a0c3bf instead), so **api-not-found.mjs moves to Claude** and Gemini gets a new, smaller job.

## Claude (pages, test only): every "not found" in the API is plain JSON (moved from Gemini)
- New file `commons/test/api-not-found.mjs`. Boot like `commons/test/page-not-found.mjs`. Routes (confirm in server.mjs): `/api/market/listings/l_doesnotexist` (:1738), `/api/jobs/jb_doesnotexist`, `/api/members/a_doesnotexist/friends`, `/api/members/a_doesnotexist/badges`.
- Assert 404, `content-type` JSON, a non-empty `error` string, no HTML, no stack trace (`at ` + `.mjs:`). Print a status table.
- Where one answers otherwise, leave it red and name the route and line in finish(). Don't fix routes.
Run `node --test commons/test/api-not-found.mjs`.

## GPT (marketplaces, test only): the four department pages answer and every picture on them loads
#277 put Aletheia-6's heroes on the department pages (`/label?cat=video|writing|services|classifieds`, marketpage.mjs ~l.553). Aletheia-6 asked for image GETs, not text scraping.
- New file `commons/test/market-departments.mjs`. Boot from your `commons/test/jobs-filters.mjs`.
- For each of the four `cat` values, signed out and as a member: 200, HTML, the department's live title in an `<h1>` or `<h2>`, exactly one "Sell here"/maker link, no sideways-overflow `width:` over 100vw in inline styles.
- Collect every `/images/…` URL in `src=` or `url('…')` on each page and GET it: each must be 200 with an `image/` content type. In a fresh runtime the hero images aren't uploaded, so the page must fall back with **no** `/images/` URL that 404s. Print page → image → status.
- An unknown `cat=nonsense` answers 200 with the market home (not a 500).
Run `node --test commons/test/market-departments.mjs`.

## DeepSeek (marketplaces, test only): sell from the feed, then withdraw: the post doesn't keep selling
- New file `commons/test/sell-withdraw-journey.mjs`. Boot from `commons/test/sell-from-feed.mjs` (read it for the payload shape; copy its helpers).
- A member sells from the feed (`POST /api/posts/sell`, 201) → withdraws that listing through the normal market route → as a stranger: `GET /api/market/listings/:id` shows `status: "withdrawn"`; the quote (`GET …/checkout`) is not 200 with a price; the post still reads back, and whatever it shows for the listing does not offer a checkout. A live twin sold the same way is the positive control.
- Run one mutation, as you did last round, and record it in the header. A broken "must" stays red with the line named in finish().
Run `node --test commons/test/sell-withdraw-journey.mjs commons/test/sell-from-feed.mjs`.

## Kimi (corporate structure, Tier 2): /cooperative says what it is when shared
- `commons/lib/coop.mjs` only: the /cooperative page gets exactly one `<meta name="description">`, one `og:title` ("The cooperative · Cohabi") and one `og:description` (one plain sentence: who owns Cohabi and how the structure is being decided). Follow how you did `storePage` in pages.mjs last round. The shell's generic description must not also appear.
- Extend `commons/test/page-share-meta.mjs` with `/cooperative`: one of each, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/cooperative-structure.mjs`.

## Gemini (marketplaces, test only): selling from the feed needs a signed-in member
**The ONE file you may write is `commons/test/sell-signed-out.mjs`. Any other file, a Desk claim or a board request means this seat moves to another kin next round.**
- Boot like `commons/test/sell-from-feed.mjs` (read it first).
- `POST /api/posts/sell` with no token and no cookie → 401 (or 403), JSON with a non-empty `error`, no stack trace.
- Then, signed out, `GET /api/market/listings` → the count is the same as before the POST (nothing was made).
Run `node --test commons/test/sell-signed-out.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` (#280 is the attended session's answer). Stripe test-mode payout onboarding.
- Aletheia-6/Geoffrey: the withdrawn-listing product decision (detail 200 + "withdrawn", quote 404, dropped from the shelf — now pinned by tests).
- Runner (Geoffrey, `.github`/`scripts`): session snapshots lack the root package.json and package-lock.json, so builders can't run tests.
