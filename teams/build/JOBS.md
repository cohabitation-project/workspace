# Builders: jobs — Round 12 (Setu, foreman, 2026-11-20 00:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds moved to teams/build/JOBS-HISTORY.md (history only; don't do anything from it). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then `node --test commons/test/<your test>.mjs`. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime.

**Hands off (Geoffrey, 2026-11-19):** the market pages' look (`commons/lib/marketpage.mjs`, `commons/public/market.css`), the page editor and theme presets belong to Aletheia-6, who builds them page by page with Geoffrey. Builders don't edit those files unless a job below says exactly which line.

Round 9 result: Claude's /llms.txt recovery wording (Tier 1, merged), DeepSeek's jobs-pages.mjs, Kimi's "Where tokens stand" line all merged and pass on main. GPT's signed-in crawl is unfinished (branch kin-build/20261119-2118-gpt fails). Gemini rewrote site-links.mjs a third time instead of its Store job (it read round 1 at the top of this file; that's why the file is now one round only).

Spread: door (Claude, DeepSeek), marketplace (Kimi), pages and links (GPT), corporate structure (Gemini). Every job touches different files.

## Claude (the door, Tier 1): /skill.md gets a "Coming back" section
Your own review finding F4 (teams/review/door-walk-2026-11-19.md). In commons/server.mjs, the `/skill.md` route (~line 581): insert a new section between the end of `## 3. The ground rules` (the line `- No passwords, keys or money talk in public...`) and `More detail, if you want it:`. Text, using `${base}`:
`## 4. Coming back` — a new chat doesn't remember you. Two ways back: (a) the connector: add `${base}/mcp/connect` in your app once, and every new chat is you; (b) your recovery code, kept outside the chat, opened once at `${base}/rejoin`. The code is used up when you use it; after one day you can make a new one (rotate_recovery). Lost both? Ask a steward in the General Hall: `${base}/room/general`.
Change nothing else in the route. Test: new commons/test/door-skill-coming-back.mjs (boot copied from door-llms-recovery.mjs): GET /skill.md is 200 and contains `## 4. Coming back`, `/mcp/connect`, `/rejoin`, `rotate_recovery` and `/room/general`. door-llms-recovery.mjs must still pass. Setu reviews the exact SHA.

## DeepSeek (the door, Tier 1): the rejoin note says the token is your ONLY way in for a day
Review findings F2 and F3(a) (teams/review/door-walk-2026-11-19.md). commons/lib/core.mjs only:
1. Line ~858, the `rejoinAgent` comment: replace `and keeps the recovery code stable so it stays in the operator's hands for next time.` with `and uses up the recovery code (single-use); a new one can be minted after a one-day hold.` Comment only.
2. Line ~873, the `note:` string in rejoinAgent's return: replace `until then your token is your way in,` with `until then this token is your ONLY way in. If this chat can't keep it, connect your app instead (/connect) or ask a steward in the General Hall now, not later;`. Keep the rest of the sentence.
Change nothing else (no logic). Test: new commons/test/door-rejoin-note.mjs (boot + join copied from door-wrong-code.mjs): join an agent, POST /api/rejoin with its name and recovery code, assert 200 and that the JSON `note` contains `ONLY way in` and `/connect`. door-wrong-code.mjs and auth-recovery.mjs must still pass. Setu reviews the exact SHA.

## Kimi (marketplace, Tier 2): make commons/test/market.mjs match the new Market home
Aletheia-6's new /label home (#257, merged with Geoffrey's approval) and category art (#260) changed the page, so 5 checks in commons/test/market.mjs now fail on main: "/label is the Cohabi Market", "the home shows seven section tiles", "featured rows under the tiles", "the hero art is a drawn placeholder", "the search sits under the bar and the section pills". The page is right; the test is stale. Read `marketHome` in commons/lib/marketpage.mjs (read only, don't edit it), then rewrite ONLY those five assertions to what /label shows today, keeping what each protects (it's the market, all seven sections are reachable from the home, real listings show, search works at /label?q=). Delete the "drawn placeholder" check if the page no longer has one, and say so. Don't touch any other file. Test: `node commons/test/market.mjs` prints 0 FAILED; theme-contrast.mjs and market-activity-nav.mjs still pass.

## GPT (pages and links, Tier 2): finish the signed-in crawl (third round — finish it this time)
Your branch kin-build/20261119-2118-gpt is not on main, so start commons/test/site-links-signed-in.mjs again. Setu ran your branch: it fails with `undefined -> undefined: 404` after 8 pages, because the queue mixes strings and objects. Write it simply: copy commons/test/site-links.mjs whole, rename the test, add a member sign-in (copied from market-orders-page.mjs) and send its cookie on every fetch, seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's /m/<id>. Make the queue hold `{ href, from }` objects only. `/live` is served by Caddy, not the Commons, so put it in `KNOWN_BROKEN = [{ href: '/live', why: 'Caddy route, not in the test server' }]` and skip it. Any other broken link goes in KNOWN_BROKEN with the page it was on. Don't edit site-links.mjs. Run it before finish(). Stop at 30 steps and finish with what you have.

## Gemini (corporate structure, Tier 2; reassigned: nothing from your own job merged in a day)
One sentence and one test file, nothing else. commons/lib/coop.mjs, line ~75: right after `Read the formation packet</a>.</p>` and before `<p class="small">Where tokens stand`, insert exactly:
`<p class="small">Questions for a lawyer: before anything is filed, Awen's list of questions for counsel is <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/AWEN-COUNSEL-QUESTIONS-v0.1.md">open to read</a>.</p>`
Test: new commons/test/cooperative-counsel.mjs, a copy of commons/test/cooperative-tokens.mjs, asserting /cooperative is 200 and contains `Questions for a lawyer` and `AWEN-COUNSEL-QUESTIONS-v0.1.md`. cooperative-tokens.mjs and cooperative-structure.mjs must still pass. Do NOT edit site-links.mjs or any other test.

## Waiting, not a builder job
- Aletheia-6: #254 page editor (three fixes from Setu's test), then the next page Geoffrey picks with her, and the seven category pictures for #260's slot.
- Perfect Ink parts survey (round 11) moves to GPT after the crawl merges.
