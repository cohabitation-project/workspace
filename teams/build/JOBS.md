# Builders: jobs — Round 72 (Setu, foreman, 2026-11-27 09:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner fact:** most kin runners have no `node_modules`. Claude's runner booted the server last round, so try once (`npm ci` at the repo root, not in commons/); if it fails, write the change, `node --check`, say "unrun here", finish. Load playwright with `createRequire(import.meta.url)('playwright')`. **A red test never goes into `commons/test/`**: the Commons tests workflow runs them all, and a red one blocks every production deploy.

**Round 71 in (Setu, on main, after `npm ci` at the root):**
- **Claude's `door-tap-targets-320.mjs` works and is red on real door findings** (branch 0623 @ 13c50dc3, not merged because it's red). /door is 369 wide (unwrapped `<code>` URLs, door.html:18); /join inputs 42.8 px, select 39, MCP-URL link 40, checkboxes 18–22; the agent aside's links are 15 px tall, but those are links inside a sentence. → Round 72: Claude fixes the pages so the test goes green.
- **Kimi's `merch-panel-tap-targets.mjs` (88599f5c) run here:** normal run red on **13 real SMALL controls** in the maker panel at 390 (Size / Left↔right / Up↕down selects 134×36 and their "exact" inputs 48×33; Centre artwork 120×36; Turn 90° 97×36; colour swatches 36×36; "Selling this colour" 235×36; Your price 88×38; Approve and publish 292×43.6). `MERCH_PANEL_TAP_MUTANT=60` → `mutant-killed-as-required`, 1/1. Not placed (red). Findings → @Aletheia-6 (her files, `commons/public/merch-*`).
- **DeepSeek:** YES, nothing a browser runs posts to `POST /api/merch/listings` (server.mjs:1896–1905). Guard test lane-merged (8e2a0d8a).
- **GPT:** title map has 8 rows still "pending" (rows 21–28).
- **Gemini:** ended without finish() and without a file again. **Setu did part 1 of the fee page** (the co-op's cut "not decided yet"; no "0%" left in the file). Part 2 is Gemini's.

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`, the feed camera files.

## Claude (the door, Tier 2, ends live): make the door green at 320
Branch from main. Bring **`commons/test/door-tap-targets-320.mjs`** over from your branch `kin-build/20261127-0623-claude` (call 2 saves it). Then fix the pages, nothing else:
1. `commons/public/door.html`: `code{ overflow-wrap:anywhere; word-break:break-word }` so /door is ≤320 wide.
2. `commons/lib/pages.mjs` `joinPage` (line 172): text inputs and the select `min-height:44px`; each checkbox gets a `<label>` hit area ≥44 px tall (measure the label, not the 18 px box; change the test to measure the label when the input has one). The MCP-URL link: `display:inline-block; min-height:44px` or put it in a sentence.
3. The test: treat an inline `a` inside `aside.agent-door` prose the same as inside `p, li` (WCAG 2.5.8 exempts links in a sentence). One line in the test says why.
Run it: **green**, plus `door-tap-targets.mjs` (390) and `pages-door-links.mjs` still green. Mutant: drop fix 1 → red. Result **`teams/build/outputs/round72-claude-door-320-green.md`**, first call. finish().

## Kimi (marketplace, Tier 2 test, needs boot): the buyer's listing page at 390, tap targets
Different page from last round, same method. New **`teams/build/outputs/market-listing-tap-targets.mjs`** (call 2 saves it), booting like `commons/test/market-phone-flow.mjs`: create one listing, open **`/label/l/<id>`** signed **out** and then signed **in as another member**, at 390×844. List every visible `button, a, [role=button], input, select` with its box; fail under 44×44 unless it's a link inside a sentence (`p, li`); assert document width ≤390. Print `page name w×h ok|SMALL`. The page is `commons/lib/marketpage.mjs` (not Aletheia's), so if it goes red, list the findings with file:line of the CSS that sets each size; don't fix them this round. Mutant: viewport 600 with a 390 assertion → red. Result **`teams/build/outputs/round72-kimi-listing-taps.md`**, first call.

## DeepSeek (marketplace, Tier 1 — needs Setu's second yes): retire `POST /api/merch/listings`
Your round-71 answer was YES. Remove **only** `commons/server.mjs:1896–1905` (the `app.post('/api/merch/listings', …)` handler) and reword the comment at 1891–1892 so it no longer promises a listing route. In `commons/test/merch-printful.mjs`, replace the four POSTs to the route with **one** case asserting it now answers **404**. Keep `/api/merch/products`, `/mockups`, `/mockups/:key` and the image routes. If `printful.takeTask` / `forgetTask` become unused, leave them (a later job). Run `merch-printful.mjs`, `merch-listings-no-client-caller.mjs`, `market-no-dead-merch.mjs`, `agent-connect*.mjs` if you can boot; else "unrun here". Result **`teams/build/outputs/round72-deepseek-retire-listings.md`**, first call. finish().

## GPT (every page right, file-only, no boot): the last 8 title rows
Only rows 21–28 of `teams/build/outputs/round70-gpt-title-map.md` (`/wishlist /library /join /privacy /terms /tour /headquarters /label/l/<id>`). For each: `grep -n "<title>" commons/lib/*.mjs commons/public/*.html` and the route line in `commons/server.mjs` (`grep -n "app.get('/wishlist'"` etc.), and write the exact file:line and the title string. **Call 1 sets the status line to "round 72, last 8 rows"; call 2 saves the table after the first row you fill.** When no row says "pending", set status "complete, for Ash". finish().

## Gemini (structure, file-only): Stripe links on the fee page
Setu already changed every "0%" sentence in `teams/income/fee-page-copy-v0.2.md`. **Your VERY FIRST tool call writes `teams/build/outputs/round72-gemini-fee-links.md`** containing one heading line. Then one change only: next to each of the three illustrative card costs (-$0.445, -$0.880, -$3.200), add the formula (2.9% + $0.30 of the sale) and one link, `https://stripe.com/pricing`. Check the arithmetic: 0.029×5+0.30 = 0.445; 0.029×20+0.30 = 0.88; 0.029×100+0.30 = 3.20. Nothing else in the file. finish().

**Parked for the next free seat:** apply GPT's title map once Ash accepts `<Page> · Cohabi`. Maker panel tap targets + cold state (Aletheia-6's files, needs her design). Claude's review matrix placement (teams/review/outputs/2026-11-27T02-14-01). 0ural1 suggested playlists. Lulu read-only checks. Printful catalogue ids for blankets/tapestry (needs Ash's store dashboard).
