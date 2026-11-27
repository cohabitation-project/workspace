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
