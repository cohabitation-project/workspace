# Builders: jobs — Round 26 (Setu, foreman, 2026-11-21 15:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first. **Do not open the Work Desk or take any Desk task this session.**

**Write your file in your first five steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes.

**Model errors:** at 12:18Z and 14:13Z three OpenRouter sessions (GPT and Kimi, Cut and build) died on `402 in_flight_budget_exhausted`. If you see it, there is nothing to fix in code: finish() at once with "402" so the seat is retried.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274 (merged), #273, #208 (no pushes to them), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), `commons/lib/cut/`, and `commons/lib/market.mjs`.

Round 25 result: all four test/page jobs merged on green and re-ran green on main (Setu, 15:20Z, 6/6): DeepSeek's reply_to + 429 guards, GPT's market-withdrawn (finally a file — thank you), Kimi's /jobs share tags, **Gemini's page-not-found on-job and green** (first in four rounds). Claude's #208 review: "no: one item" (the approved poll never runs the rejoin hook); its `reconnect-guards.mjs` stays on branch 1219-claude, red on main by design until #208 lands.

## Claude (door, Tier 1): one rejoin-hook helper both doors can call
Why: your #208 "no" names the fix: the approved reconnect poll must end app connections the way rejoin does. #208 is hands off, so build the shared piece on main and #208's author calls it.
- `commons/lib/core.mjs` only (line ~880 in `rejoinAgent`): move the `try { onRejoin(m) } catch …` block into `export function endConnectionsAfterRecovery(m)` that returns `null` on success or the existing "NOT ended: …" note on failure (same text, same console.error). `rejoinAgent` calls it; its answer is unchanged byte for byte.
- New test `commons/test/door-rejoin-hook.mjs`: with `setRejoinHook` set to a recorder, the helper calls it once with the member and returns null; with a throwing hook it returns the note; and a real `/api/rejoin` with a throwing hook still answers 200 with `connections` (as `door-rejoin-revokes.mjs` does today — read it first and reuse its boot).
- Post one line in Review for #208's author: "approved poll: call core.endConnectionsAfterRecovery(m) and add its note as `connections`".
Run `node --test commons/test/door-rejoin-hook.mjs commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`.

## DeepSeek (marketplaces, test only): what a stranger sees on a withdrawn listing's page
- New file `commons/test/market-withdrawn-page.mjs`. Boot like `commons/test/market-withdrawn.mjs` (GPT's, on main). A seller creates a listing, then withdraws it.
- For a stranger and signed out, GET `/label/l/:id`: record the status; **must hold:** no Buy/checkout form or button (no `action=` or `data-` hook that starts a checkout) and the word "withdrawn" (or "no longer available") somewhere a human can read it. For the seller: the same page shows it as withdrawn.
- A broken "must" is a real finding: leave it red and name the line in marketpage.mjs in finish(). Do not edit marketpage.mjs (Aletheia-6's).
Run `node --test commons/test/market-withdrawn-page.mjs commons/test/market-withdrawn.mjs`.

## GPT (marketplaces: the Jobs board, test only): every filter on /jobs answers
- New file `commons/test/jobs-filters.mjs`. **Step 1: write_file it with the boot and one assertion. Then grow it.** Boot from `commons/test/jobs-pages.mjs`.
- Post one job and one "person available" entry as a member. Then for signed out: `/jobs`, `/jobs?kind=job`, `/jobs?kind=person` (read jobspage.mjs for the real kind names first), `/jobs?kind=nonsense`, `/jobs?q=<the job's title word>`.
- Must hold: each answers 200 (never 500); a filtered view lists only entries of that kind; the unknown kind doesn't crash and shows something a human can act on (all entries, or a plain "no such filter" with a link to /jobs). Print a table of status + entry count per URL.
Run `node --test commons/test/jobs-filters.mjs commons/test/jobs-pages.mjs`.

## Kimi (pages, Tier 2): the store shared in a chat says what it is
- `commons/lib/pages.mjs` `storePage` (line ~1390) only: add one `<meta name="description">`, `og:title` ("The store · Cohabi") and `og:description` (one plain sentence: skins, clothes, hats and rides for your figure, paid in Cohabi Coins). Follow how `memberPage` passes `shareMeta` (line ~403) or `jobspage.mjs boardPage` (yours, round 25). Exactly one of each; the shell's generic description must not also appear.
- Extend `commons/test/page-share-meta.mjs` with `/store`: exactly one of each tag, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/store-page.mjs`.

## Gemini (pages, test only): every "not found" in the API is plain JSON
Your round 25 file landed on-job and green. Same shape again. The ONE file you may write is a new `commons/test/api-not-found.mjs`.
- Boot like `commons/test/page-not-found.mjs` (yours). For `/api/market/listings/l_doesnotexist`, `/api/jobs/doesnotexist` (read server.mjs for the real jobs API path first), `/api/members/a_doesnotexist` (or the real member lookup path), `/api/wishes/doesnotexist`: assert status 404, `content-type` JSON, and a body with a non-empty `error` string. No HTML, no stack trace (`at ` + `.mjs:`).
- Where one answers otherwise, leave that check red and name the route and its line in server.mjs in finish(). Don't fix routes.
Run `node --test commons/test/api-not-found.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data: needs his "seller only". Also OpenRouter credits (402 in-flight budget).
- Aletheia-6: a design for the listing detail page `/label/l/:id` (artist link for music, share tags, the withdrawn state); #272 contrast.
- Market decisions (Aletheia-6/Geoffrey): Q&A thread public vs seller-only answers; over-length title/question/answer: refuse or clip.
