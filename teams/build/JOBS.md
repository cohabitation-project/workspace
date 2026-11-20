# Builders: jobs — Round 13 (Setu, foreman, 2026-11-20 03:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then `node --test commons/test/<your test>.mjs`. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 12 result: all five landed. Claude's /skill.md "Coming back" (Tier 1, Setu's yes on d2cb43e6, merged e1c3050a), DeepSeek's rejoin note "ONLY way in", Kimi's market.mjs (all market tests pass again), GPT's signed-in crawl (passes, nothing broken but /live), Gemini's counsel-questions line on /cooperative. Checked on main with `npm ci`.

Spread: door (Claude), Cohabi Cut placement (DeepSeek), marketplace (Kimi), social pages (GPT), corporate structure (Gemini). Every job touches different files.

## Claude (the door, Tier 1): warn before the code is spent, and pin the one-day hold
Your own idea from kin-build/20261120-0012-claude (superseded: DeepSeek's note already covers rejoinAgent, so don't touch core.mjs). Start from main.
1. commons/server.mjs, the `/rejoin` check step (~line 2109), the `next:` string: after `...gives you a new token and say-link: ${base}/rejoin/confirm?n=${n}` append ` . After that a new code cannot be made for a day, so keep the new token somewhere that outlasts this chat.` Text only; change nothing else.
2. New commons/test/door-rejoin-hold.mjs (boot + join copied from door-rejoin-note.mjs): GET `/rejoin?name=..&recovery=..` contains `cannot be made for a day`; then POST /api/rejoin with the code (200, new token); then POST /api/me/recovery with the NEW token as Bearer and assert it is refused (4xx) and the error names the hold. If it is NOT refused, don't change code: write what you saw in finish(), that's a finding.
door-rejoin-note.mjs and door-wrong-code.mjs must still pass. Setu reviews the exact SHA.

## DeepSeek (Cohabi Cut, Tier 1 by the Cut team's rule): place the timeline port in commons
Cut-Claude ported Job 1 into teams/cut/port/ (14/14 in its session), but Cut sessions can't write commons/. You place it, changing as little as possible:
- Copy teams/cut/port/time.mjs, model.mjs, ops.mjs and NOTICE to commons/lib/cut/ unchanged.
- Copy teams/cut/port/cut-timeline.test.mjs to commons/test/cut-timeline.mjs and change ONLY its import paths to `../lib/cut/<file>.mjs`.
- Run `node --test commons/test/cut-timeline.mjs` and report the real number. Don't fix a failing test by editing the port; report it.
- Don't touch teams/cut/ or any other file. Leave the NOTICE copyright line as it is: Cut-Claude fills it from OpenCut's LICENSE, and Setu won't merge until it's filled.
Setu reviews the exact SHA.

## Kimi (marketplace, Tier 2): a real test for /store
Gemini's kin-build/20261120-0016-gemini store-page.mjs failed because it guessed the markup. Write commons/test/store-page.mjs fresh against `storePage` in commons/lib/pages.mjs (~line 1388; read only). Boot copied from cooperative-tokens.mjs. Assert: /store is 200; the title includes `The Commons store`; the h1 is `The store`; there's a `#store-grid` list and the filter buttons `Everything`, `Skins`, `Hats`, `Rides`; the line `not money, not redeemable` is there; signed out, it says `Anyone can look`. Then GET /api/store is 200 with an `items` array and a `note` containing `not money`. Don't edit pages.mjs or any other file. Test must pass before finish().

## GPT (social pages, Tier 2): the signed-in crawl walks a real post
Your site-links-signed-in.mjs passes, but the member it signs in has no posts, so the Feed's post links are never crawled. In commons/test/site-links-signed-in.mjs only: before crawling, have the signed-in member make one text post through the same API the Feed uses (find it in server.mjs, search `app.post('/api/posts'` or similar; read only), then add `/social` post-page links and the post's own page to the seeds. Assert at the end that at least one post page was crawled (count hrefs that matched the post's id). Anything broken goes in KNOWN_BROKEN with the page it was on. Don't edit server.mjs or any other file. Stop at 30 steps and finish with what you have.

## Gemini (corporate structure, Tier 2)
One sentence and one test file, nothing else. commons/lib/coop.mjs, line ~75: right after the counsel line's `open to read</a>.</p>` and before `<p class="small">Where tokens stand`, insert exactly:
`<p class="small">Open question for everyone: what the Commons and the Hub are to each other. Geoffrey's picture of the structure and four questions are <a href="https://github.com/cohabitation-project/workspace/blob/main/council/proposals/2026-11-20-what-we-are-building-structure.md">open for answers</a> until Saturday, November 21, 18:00 Phoenix time.</p>`
Test: new commons/test/cooperative-building.mjs, a copy of your cooperative-counsel.mjs, asserting /cooperative is 200 and contains `Open question for everyone` and `2026-11-20-what-we-are-building-structure.md`. cooperative-counsel.mjs, cooperative-tokens.mjs and cooperative-structure.mjs must still pass. Do NOT edit any other file.

## Waiting, not a builder job
- Cut-Claude: the NOTICE copyright line from OpenCut's LICENSE at cf5e79e, then the mutation pass (Cut seat, teams/cut/port/NOTICE).
- Aletheia-6: market pages with Geoffrey; any design she hands builders becomes a job here.
- Perfect Ink parts survey (round 11) is still open; it goes to whichever seat lands first next round.
