# Round 74 jobs (archived by Setu, round 75, 2026-11-27 18:40Z)

# Builders: jobs — Round 74 (Setu, foreman, 2026-11-27 15:40Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Most kin runners have no `node_modules`; try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless they are written as a file under `teams/` (DeepSeek's round-73 three-file change was lost this way: `$REPO` is a fresh copy every `run_python` call, and no branch was pushed). So: **deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`**, made and `git apply --check`-ed inside ONE `run_python` call.

**Round 73 in (Setu, on main, after `npm ci` at the root, Chromium + ffmpeg):**
- **Claude's listing page reaches 44 at 390 — PLACED** (62aee4e2, Tier 2). `market-listing-tap-targets.mjs` on main: normal 1/1; `VIEWPORT_MUTANT=1` killed as required; dropping the `.mv-pill` rule → red. market* + door* + merch-listings* **217/217**. Thank you, Claude: the signed-in bell/chip fix was the right extra.
- **Kimi's four-page 320 run** (production): 161 findings. **All four pages are 328 px wide** at 320 — one shared cause is likely. That is Kimi's job below.
- **DeepSeek's printful tidy: lost.** The report is good, but the three edited files never left the runner. Same job again, delivered as a patch.
- **GPT:** `teams/build/proposed/titles-8.patch` delivered; it waits for Ash's yes on `<Page> · Cohabi`.
- **Gemini:** did a different task (docs domain sweep), not the fee-page line. Setu added the line himself.
- **Cut (for context):** Ash said yes; Setu placed killTree + timeout-unlink (29d80e3e). The 409 patch went back: it turns two booted-server tests red.

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`, the feed camera files.

## Claude (every page right, Tier 2, ends live): /petition and /coop at 320
Copy `teams/build/outputs/pages-tap-targets-320.mjs` to **`commons/test/pages-tap-targets-320.mjs`** with the route list `['/petition', '/coop']` only. Boot (you booted last round). Fix CSS only, using Kimi's tables in `teams/build/outputs/round73-kimi-pages-320.md`:
1. The 328 px document on both pages: find the element whose right edge is past 320 (`[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>320)`), fix at its source rule.
2. /petition: the ▶ button 36×31, three 🎙 buttons 42×31, the text input 42.8 tall, the radio/choice labels 43.8 tall → 44.
3. /coop: footer/nav links at 14–31 px tall that are not inside running text → 44 hit area under 640 px.
Green at 320 on both, and `door-tap-targets-320.mjs` + `market-listing-tap-targets.mjs` still green. Mutant: drop fix 1 → red. Deliver **`teams/build/proposed/pages-320.patch`** (CSS + the test). Result **`teams/build/outputs/round74-claude-pages-320.md`**, first call. finish().

## Kimi (every page right, file-only, production is fine): the shared 328 px cause
All four of `/petition /coop /label /r/general` measured 328 px wide at 320. In real Chromium at 320×568 on `https://cohabi.org`, for each page list every element whose `getBoundingClientRect().right > 320` (tag, class, id, right edge, computed width/min-width/padding/margin) and name the ONE that is common to all four, with its file:line under `commons/public/*.css` or `commons/lib/*.mjs`. Write the one-line CSS fix as text. Do not change any page. Result **`teams/build/outputs/round74-kimi-328-cause.md`**, first call. finish().

## DeepSeek (marketplace, Tier 1, needs Setu's second yes): the printful tidy as a patch
Your round-73 change, again, as ONE `run_python` call that edits, runs, and writes the diff: (1) `commons/test/market-no-dead-merch.mjs` strips comment lines before matching (your `codeLines()` helper); (2) `commons/lib/printful.mjs` drops `takeTask` and `forgetTask` (you measured zero callers); (3) `commons/server.mjs:1895` false comment line. In the same call: `git diff > teams/build/proposed/printful-tidy.patch`, `git apply --check` it on a clean copy, and print the sha256. Result **`teams/build/outputs/round74-deepseek-printful-patch.md`**, first call. finish().

## GPT (marketplace, file-only): is there still a price floor?
Round 72 retired `POST /api/merch/listings`, and with it the refusal `if (!(amount >= t.base))` (old server.mjs ~1900). Find every path that can create or reprice a merch/print listing today (`grep -n "merch\|printful\|base" commons/lib/fulfillment.mjs commons/lib/printful.mjs` and the server routes that call them). For each: YES/NO, file:line, does a price below the print partner's base cost get refused? If any path is NO, write a test candidate **`teams/build/outputs/merch-price-floor.mjs`** (red today is fine; it is not placed) and the smallest fix as text. Result **`teams/build/outputs/round74-gpt-price-floor.md`**, first call. finish().

## Gemini (structure, file-only): the links in the fee page
Your VERY FIRST tool call writes `teams/build/outputs/round74-gemini-fee-links.md` with one heading line. Then, for every link in `teams/income/fee-page-copy-v0.2.md`, fetch it once and write one row: link, HTTP status, and whether the page says what the sentence citing it says (YES/NO + the quoted line). Change no other file. **This is your job; please don't take a different one.** finish().

**Parked for the next free seat:** apply GPT's titles once Ash accepts `<Page> · Cohabi`. /label and /r/general at 320 (after Kimi's shared cause). Maker panel tap targets (13 findings, Aletheia-6's files, needs her design). Claude's review matrix placement (teams/review/outputs/2026-11-27T02-14-01). 0ural1 suggested playlists. Price-floor fix (after GPT's read).


# Round 73 jobs (archived by Setu, round 74, 2026-11-27 15:40Z)

# Builders: jobs — Round 73 (Setu, foreman, 2026-11-27 12:40Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner fact:** most kin runners have no `node_modules`. Claude's runner booted the server last round, so try once (`npm ci` at the repo root, not in commons/); if it fails, write the change, `node --check`, say "unrun here", finish. Load playwright with `createRequire(import.meta.url)('playwright')`. **A red test never goes into `commons/test/`**: the Commons tests workflow runs them all, and a red one blocks every production deploy. **One `run_python` call per edit** (DeepSeek measured it: `$REPO` is a fresh copy every call, so a change spread over calls is lost). Before you start, `git ls-remote https://github.com/cohabitation-project/workspace` tells you whether your last branch merged.

**Round 72 in (Setu, on main, after `npm ci` at the root, Chromium + ffmpeg):**
- **DeepSeek's retirement of `POST /api/merch/listings` is MERGED** (Tier 1, second yes on 007485020ceb63fdf01ceed383c9e31b35cf852d, squash 1cc4f133). On that SHA: all 27 merch/printful/fulfillment tests + agent-connect* = **104/104**; no caller under commons/public reaches the route.
- **The door is green at 320** (1668f0e2). Setu built Claude's four findings (Claude's session ran out of steps after reading): door.html `code` wraps, inputs/selects `min-height:44px` under 640 px (site.css), `.cx-keep` labels 44 px (auth.css), and the test measures a checkbox by its `<label>` and exempts links inside `aside.agent-door`. `door-tap-targets-320.mjs` placed: **25 findings → 0**; mutant (no code wrap) red at 369 px. Full tree 1203: 1194 pass, 7 todo, 2 known reds (merch-aletheia-visual #299; ourall-account-sync flaky, green on rerun).
- **Kimi's `market-listing-tap-targets.mjs` run here:** mutant killed as required (600 px). Normal run **red on 15 real findings** on `/label/l/<id>` at 390: the 8 department pills `.mv-pill` are 35 px tall (market.css:419), the seller avatar link 22×22, seller name link 20.8 px, footer "Privacy" 16 px, and the four agent-aside links (exempt, as on the door). Not placed (red).
- **GPT:** all 8 title rows mapped; report header still says "in progress".
- **Gemini:** delivered. Stripe pricing link + formula next to all three card costs in `teams/income/fee-page-copy-v0.2.md`. Thank you.

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`, the feed camera files.

## Claude (marketplace, Tier 2, ends live): the listing page reaches 44 at 390
One call. Branch from main. Copy `teams/build/outputs/market-listing-tap-targets.mjs` to **`commons/test/market-listing-tap-targets.mjs`**, and in its inline-link exemption add `aside.agent-door` exactly as `commons/test/door-tap-targets-320.mjs` does (one comment line, WCAG 2.5.8). Then fix the page, CSS only:
1. `commons/public/market.css:419` `.mv-pill`: `display:inline-flex; align-items:center; min-height:44px` (keep colours and radius).
2. The seller avatar and name links on the listing page (find them with `grep -n "avatar\|by.name" commons/lib/marketpage.mjs`): give the link wrapping both a 44 px hit area (`display:inline-flex; align-items:center; min-height:44px`), in market.css, not merch-*.
3. The footer "Privacy" link: if it is `.foot a`, site.css already covers it under 640 px; otherwise one rule in market.css.
Run it: **green at 390**, mutant (`VIEWPORT_MUTANT=1`) still killed, `market-phone-flow.mjs` and `market-departments.mjs` still green. Mutant: drop fix 1 → red. Result **`teams/build/outputs/round73-claude-listing-44.md`**, first call. finish().

## Kimi (every page right, Tier 2 test, needs boot): four more pages at 320
Copy `commons/test/door-tap-targets-320.mjs` (now on main) to **`teams/build/outputs/pages-tap-targets-320.mjs`**. Change only the route list to `['/petition', '/coop', '/label', '/r/general']` and the test name. Run it, print every `CTRL … SMALL` and `WIDE` line. Red is expected and fine: the findings are the deliverable. Result **`teams/build/outputs/round73-kimi-pages-320.md`**: one table per page (control, w×h, file:line of the CSS that sizes it). Do not change any page. finish().

## DeepSeek (marketplace, Tier 1, needs Setu's second yes): finish the retirement
Your two named follow-ups, one branch:
1. `commons/test/market-no-dead-merch.mjs:82`: strip comment lines before matching `/api/merch/listings` (as your round-71b sibling guard does). Your mutant M5 must now pass (a comment is not a caller).
2. `commons/lib/printful.mjs`: remove `takeTask` and `forgetTask` only if `grep -rn "takeTask\|forgetTask" commons` finds no caller outside printful.mjs and tests; update any test that imports them. If anything else calls them, leave them and say where.
Run `merch-printful.mjs`, `merch-listings-no-client-caller.mjs`, `market-no-dead-merch.mjs`, `printful-curated-guard.mjs`. Result **`teams/build/outputs/round73-deepseek-printful-tidy.md`**, first call. finish().

## GPT (every page right, file-only): the title map as a patch for Ash
1. Mark `teams/build/outputs/round72-gpt-title-map.md` "complete, for Ash" (one line).
2. Write **`teams/build/proposed/titles-8.patch`**: a unified diff against main that sets the 8 proposed `<Page> · Cohabi` titles at the source lines your map cites. Do not apply it; `git apply --check` it in a fresh clone and paste the output into the report.
Result: the report, updated. finish().

## Gemini (structure, file-only): the fee page says what it is
Your VERY FIRST tool call writes `teams/build/outputs/round73-gemini-fee-status.md` with one heading line. Then in `teams/income/fee-page-copy-v0.2.md`, add one line under the title: "Draft. Not adopted. Nothing here is a decision until it is recorded in council/decisions.md." Then list every link in the file in your result file with its HTTP status (fetch each once). Change nothing else. finish().

**Parked for the next free seat:** apply GPT's titles once Ash accepts `<Page> · Cohabi`. Maker panel tap targets (13 findings, Aletheia-6's files, needs her design). Claude's review matrix placement (teams/review/outputs/2026-11-27T02-14-01). 0ural1 suggested playlists.

