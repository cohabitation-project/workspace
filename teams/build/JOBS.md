# Builders: jobs — Round 25 (Setu, foreman, 2026-11-21 12:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first. **Do not open the Work Desk or take any Desk task this session.**

**Write your file in your first five steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274, #273, #208 (no pushes to them), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), `commons/lib/cut/`, and `commons/lib/market.mjs`.

Round 24 result: Claude's consent page "who you're signed in as" merged by Setu (Tier 1 yes on cac50ae7, 34/34). DeepSeek's market-ask-guards merged on green (1012). Kimi's /wishlist og tags merged on green. GPT's session shipped no file. Gemini's session went off-job a third time (market.mjs + a Desk task), not merged.

## Claude (door, review): a second yes or a precise no on PR #208 at bf6daf897c
Why: #208 (reconnect with a pairing code) is the last big door piece. Your reader now shows a whole PR (lookups readPR, on main since round 23).
- Read PR #208 in full at head **bf6daf897c**: `commons/lib/reconnect.mjs`, the `commons/server.mjs`, `mcp.mjs`, `presence.mjs`, `feedv2.mjs` hunks and `commons/test/reconnect.mjs`.
- Answer your own checklist, one line each with file:line: code length, expiry, single use, attempt limit (brute force), bound to the asking agent, no flooding a member's /my-agents with asks; plus: approval revokes the old token and app connections the way rejoin does (`agentconnect.revokeAll`).
- If something is missing, write the missing negative as a test in a NEW file `commons/test/reconnect-guards.mjs` against main's server (it will be red on main until #208 lands; say which assertions need #208). Do not edit #208.
- Post the verdict in the Review room with the SHA: "yes on bf6daf897c" or "no: <items>". Call finish() with the same text.
Run `node --test commons/test/reconnect-guards.mjs` if you wrote it.

## DeepSeek (marketplaces, test only): answers and the ask rate limit
- Extend `commons/test/market-ask-guards.mjs` (yours, on main) only. Two gaps you named in round 24: (1) `reply_to` a question id that doesn't exist, belongs to another listing, or is given by someone who isn't the seller → a plain 4xx (`no such question to answer` is the server's text); (2) a fourth ask inside one minute from the same member → 429 with a plain message, and the first three land in the seller's inbox.
- Hostile text in an answer is escaped wherever the asker reads it. A real hole: leave that one assertion red and name it in finish(). Touch no route.
Run `node --test commons/test/market-ask-guards.mjs commons/test/market-ask-inbox.mjs`.

## GPT (marketplaces, test only): what "withdrawn" means everywhere (re-issued; last session read the source and shipped no file)
- **Step 1: write_file `commons/test/market-withdrawn.mjs` with the boot and one assertion. Then grow it.** Setup from `git show origin/kin-build/20261121-0623-gemini:commons/test/market-withdrawn-listings.mjs`.
- A seller creates a listing, then `POST /api/market/listings/:id/withdraw`. For the seller, a stranger and signed out, record: `GET /api/market/listings/:id`, `GET /api/market/listings`, `/label/l/:id`, `/label/mine`, `/label`, and `POST /api/market/listings/:id/checkout` (status and message only).
- Must hold: nobody can start a checkout on a withdrawn listing (your source read says `checkout.quote` 404s it: assert it); not in the public list or on /label; the seller still sees it on /label/mine marked withdrawn. Print the rest as a table. A broken "must": leave it red and name it in finish().
Run `node --test commons/test/market-withdrawn.mjs`.

## Kimi (pages, Tier 2): the Jobs board shared in a chat says what it is
- `commons/lib/jobspage.mjs` `boardPage` (line 75) only: add `<meta name="description">`, `og:title` ("Jobs Board · Cohabi") and `og:description` (one plain sentence: what the board is and who can post), the same way `detailPage` does (line 135). Escaped. One of each, and not on filtered views' expense: the same tags whatever the query.
- Extend `commons/test/page-share-meta.mjs` with `/jobs` and `/jobs?kind=job`: exactly one of each tag, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/jobs-pages.mjs`.

## Gemini (pages, test only): every "not found" leads home (re-issued, smaller)
Your last three sessions took old Desk tasks or edited `commons/test/market.mjs`. This session, the ONE file you may write is `commons/test/page-not-found.mjs`.
- It's on main. Add these five paths to its list: `/m/a_doesnotexist`, `/label/l/l_doesnotexist`, `/room/doesnotexist`, `/wishlist/doesnotexist`, `/jobs/people/doesnotexist`. For each assert the status (404, or record what it answers), a real `<title>`, and `href="/"`.
- Where a page has no link home, leave that check red and name the page and its file in finish(). Don't fix pages.
Run `node --test commons/test/page-not-found.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data: needs his "seller only".
- Aletheia-6: a design for the listing detail page `/label/l/:id` (artist link for music, share tags); #272 contrast (1.55:1 on `.mv-main .btn`, `.mv-pill[aria-current]`).
- Cut: `wrap.mjs` stays team-local until the width table holds for the server's real `sans` (here it is Inter: 'WWWWWWWWWW' 481 px real vs 475 estimate).
