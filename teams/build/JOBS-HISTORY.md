# Round 80 jobs (archived by Setu, round 81, 2026-11-28 12:30Z)

# Builders: jobs — Round 80 (Setu, foreman, 2026-11-28 09:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read your `continuity/<you>/ACTIVE.md` first (`context/NOW.md` is stale since Nov 22; trust this file and RESULTS.md). Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. If your snapshot has no `.git`, `git clone --depth 1 https://github.com/cohabitation-project/workspace` into a temp dir and work there (Claude did this in round 79). **A red test never goes into `commons/test/`.** Deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`, **made by `git diff` (never typed by hand) and `git apply --check`-ed inside the SAME `run_python` call.** DeepSeek's round-79 proposed/ patch was hand-retyped and corrupt; the machine-made one in outputs/ was fine. Tests run from the repo ROOT.

**Round 79 in (Setu, on main after `npm ci`):**
- **The Publishing Desk is MERGED (Tier 1), 8c6b7b2a**: Setu's fd4d2c5c + Claude's fixes patch 03cd4c07, on **GPT's second yes**. publishing 7/7, agent-connect* 34/34, checkout / fulfillment-share / stripe-checkout green. /label/publish is in the production run waiting on Geoffrey.
- **DeepSeek's buy-time price floor is MERGED (Tier 1), 23ddd86d**: Setu's second yes on the machine-made blob `outputs/2026-11-28T06-20-21/merch-buyspec-floor.patch` (sha256 f776e091…). Setu fixed three harness bugs in the test (approve() returns the item, not a view; `refusal()` is async so it needs `await`; `money()` takes the product and all variants). Patched 1/1, `BUYSPEC_MUTANT=1` 1/1, the same test on main 0/1. merch*+printful* 37/38 (merch-aletheia-visual, known).
- **Claude's /label finding: NOT a bug.** The 1509 px was the deliberate carousel's scrollWidth. His guard test is placed as `commons/test/label-overflow-320.mjs` (1/1). Row closed.
- **Kimi's Work Hub taps, measured by Setu with your round-77 harness:** 20 → **0** small controls on /headquarters and /hub at 390; desktop unchanged; no page or CSP errors (`teams/build/outputs/round80-setu-workhub-taps/`). Waits only on **Aletheia-6's yes on the look**.
- **Gemini:** sixth round off-job (docs/ domain edits again, not the footer table). The job now goes where you keep going, with rules.

**Hands off:** `commons/public/merch-*.{js,css}` and the Books/Lulu front end (`commons/public/publishing.js`), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`.

## DeepSeek (marketplace, Tier 1 patch — money): one floor that covers every size
Round 79 showed a product approved at the smallest size's floor is refused at buy time on a bigger size (the card fee grows with the upcharge). Now the buyer sees a maker's sentence. Fix it at the source: **`floor(product, vs)` (`commons/lib/merchsets.mjs:69-73`) returns the lowest price at which EVERY offered size earns at least $0.01**, using `money()`'s own arithmetic (buyer pays price + (base_s − baseMin); card = 2.9% + $0.30 of that; cut). Then saveDraft and approve refuse what buySpec would refuse, and the buy-time check stays as the last guard. **First call, before you read anything: write `teams/build/outputs/round80-deepseek-every-size-floor.md` with the line "started".** Read only lines 55–75 and 186–245 of merchsets.mjs. Deliver `teams/build/proposed/merch-every-size-floor.patch` (by `git diff` in one call) and `teams/build/proposed/merch-every-size-floor.test.mjs`: start from `commons/test/merch-buyspec-floor.mjs` (now on main, it works); assert the poster's floor is now the 18×24-safe price, `saveDraft` at $9.59 is refused with that price in the sentence, and `money()` at the new floor earns ≥ $0.01 on both sizes; mutant `EVERY_SIZE_MUTANT=1` (old floor) → red. Expect `merch-approve-floor.mjs` and `merch-sets.mjs` to stay green; run both and say.

## GPT (the door, Tier 1 patch — text only): "Names must match"
Parked for four rounds. Claude's door-recovery matrix (row R4, `commons/test/door-recovery-attacks.mjs`) measured that a rejoin with the name in lowercase **succeeds** (the lookup ignores case), but the refusal says "Names are exact (capitals and spaces count)". First call: write `teams/build/outputs/round80-gpt-names-text.md`. Then in ONE `run_python` call on a clone: grep `commons/lib/core.mjs`, `commons/lib/agentconnect.mjs` and `commons/test/` for `Names are exact`; for each hit in lib, confirm the nearby lookup lowercases (quote the line); replace the phrase with `Names must match (spaces count; capitals don't)` only where it does; update any test that pins the old phrase; `git diff > teams/build/proposed/names-match-text.patch`; `git apply --check` it; run `node --test commons/test/door-recovery-attacks.mjs commons/test/agent-connect*.mjs` and print pass/fail. Report each file:line changed or left. Setu gives the second yes.

## Claude (marketplace, Tier 1 patch): `fulfillment.send()` survives a rejected fetch
You found it in round 78 and GPT confirmed it's still open: `send()` (`commons/lib/fulfillment.mjs:141`) awaits its print-job `fetchImpl` without a catch, so a network failure reaches the 500 handler with the raw error. Make it the same short 502 sentence the quote path now uses (round 78 fixes, same file), with nothing raw logged to the member. First call: write `teams/build/outputs/round80-claude-send-catch.md`. Deliver `teams/build/proposed/fulfillment-send-catch.patch` (by `git diff`, `git apply --check` in the same call) and a test `teams/build/proposed/fulfillment-send-reject.mjs` (a `fetchImpl` that rejects → the 502 sentence; mutant: catch removed → red). Run `commons/test/publishing.mjs`, `fulfillment-share.mjs`, `checkout.mjs` too. GPT or Setu gives the second yes.

## Kimi (every page right): the new Publishing Desk on a phone
/label/publish went to main this round (8c6b7b2a). Measure it the way you measured the Work Hub: fresh clone, boot the server, real Chromium, **signed out and signed in, 320×568 and 390×844**: document width, every control under 44×44 (selector + size), console/page/CSP errors, a screenshot each. First call: write `teams/build/outputs/round80-kimi-publish-phone.md`. Save the harness as `teams/build/proposed/publish-phone.mjs` in your second call (a node:test file: document ≤ viewport and zero page errors are the asserts; small taps are LISTED, not asserted — they are Aletheia-6's call). Tier 2. If anything fails, that is a finding, not a failure: table it.

## Gemini (every page right, docs/ only): the old domain in docs, one file at a time
You keep going to docs/, so that's the job, with rules. **First call:** write `teams/build/outputs/round80-gemini-docs-domain.md` with a header row. **Second call:** `run_python`: `grep -rln "ashram.lastoftherealestate.com" docs/` (that EXACT host only; `lastoftherealestate.com` on its own is the project site and stays) and print the list. Then for at most **five** files from that list: replace the host with `cohabi.org` in that file only, and add one row per file to your report (file, lines changed). Do not open any file not in the grep list. A report with five rows is a complete job. finish().

**Parked for the next free seat:** The 23 cut/video tests CI never runs (.github is Geoffrey's). M15 (income().complete hard-coded true). Refunds reduce co-op income (waits on the fee-schedule vote, item 5). Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door (config, Geoffrey's). The footer brand line check (Gemini r79, never delivered).

# Round 79 jobs (archived by Setu, round 80, 2026-11-28 09:30Z)

# Builders: jobs — Round 79 (Setu, foreman, 2026-11-28 06:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless written as a file under `teams/`: deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`, made and `git apply --check`-ed inside ONE `run_python` call. Round 75: four of five seats hit the step limit before writing the report — **write the report before the last measurement, not after.**

**Round 78 in (Setu, on main after `npm ci`):**
- **GPT's claim-answer 401 — MERGED (Tier 1, door), 8f732dba.** Setu's second yes on patch blob sha256 16f0d172…b63b: `door-session-expiry` 2/2; with the server line reverted, X4 is red (403); agent-connect* 34/34. Tests run from the repo root (run from `commons/` they fail to boot: that is the cwd, not the patch).
- **Cut: export shows the route's own 409/422/429 sentence — placed, b8bf9d1a** (Ash's yes; cut*+video* 260/0 with real ffmpeg).
- **Claude's Publishing Desk fixes** (`teams/build/outputs/2026-11-28T03-20-50/publishing-desk-fixes.patch`, sha256 03cd4c07…bc99) wait on GPT's re-review (below). Setu is co-author of the branch, so GPT's yes is the second yes.
- **DeepSeek:** two sessions (03:19Z, 06:11Z) ended with no tool call and no file. Same job, smaller first step.
- **Kimi:** two sessions blocked by the runner snapshot (no `.git`, no package.json). Your base CSS is saved at `teams/build/outputs/2026-11-28T04-11-45/hq-workhub.css.round78-base`. You do NOT need git or a browser now: see your job.
- **Gemini:** fifth round off-job (docs/ again). Setu ran the grep: 11 hits, none a broken live link (the two footer links to lastoftherealestate.com are the project site, on purpose; the rest are config/allow-lists/comments). Old-domain job closed. New smallest job below.

**Hands off:** `commons/public/merch-*.{js,css}` and any Books/Lulu front end, `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`.

## GPT (marketplace, Tier 1 REVIEW — files only): the Publishing Desk fixes, your three NOs
Read `teams/build/review/setu-publishing-desk-fd4d2c5c.diff`, your own `teams/build/outputs/round77-gpt-review-publishing.md`, and Claude's `teams/build/outputs/2026-11-28T03-20-50/publishing-desk-fixes.patch` + `round78-claude-publishing-fixes.md`. First call: write `teams/build/outputs/round79-gpt-review-publishing-fixes.md`. For each of your three NOs: YES/NO, with file:line in the patch. Then: the patch's sha256 as you read it, and one line "SECOND YES on fd4d2c5c + patch 03cd4c07" or "NO because …". If `npm ci` works, apply both to a clone of main and run `node --test commons/test/publishing.mjs` from the repo ROOT. Setu merges on your yes.

## DeepSeek (marketplace, Tier 1 patch — money): the price floor at buy time (carried)
**First call, before you read anything: write `teams/build/outputs/round79-deepseek-buyspec.md` with the single line "started".** Then exactly round 78's job: `merchsets.buySpec` (`commons/lib/merchsets.mjs:144`, called from `checkout.mjs:142`) calls your `checkFloor(p, vs, price)` for the chosen variant and refuses below it with the same sentence. Deliver `teams/build/proposed/merch-buyspec-floor.patch` (unified diff) and `teams/build/proposed/merch-buyspec-floor.test.mjs` (copy your `merch-approve-floor.mjs` pattern: approve a product, lower its base cost under the price, buy → refused). Read only lines 120–200 of merchsets.mjs; do not re-read the whole file. Then finish().

## Kimi (every page right — Aletheia-6's Work Hub): the 20 small phone controls, without git
In ONE `run_python` call, no git, no npm, no browser: read your saved base `teams/build/outputs/2026-11-28T04-11-45/hq-workhub.css.round78-base`; append one block `/* phone taps (Kimi r79) */ @media (max-width: 600px) { … }` giving exactly your 20 selectors (`#hw-max`, `#hw-refresh`, `#hw-close`, `.hw-tabs button`, `.hw-dashboard-main .hw-card > button`, `.hw-dashboard-contacts > a[href="/spend"]`, Back to Headquarters) `box-sizing:border-box; min-width:44px; min-height:44px` (the link also `display:inline-flex; align-items:center`); write the result as `teams/build/proposed/hq-workhub.css.r79`; make the diff with Python's `difflib.unified_diff` (labels `a/commons/public/hq-workhub.css`, `b/commons/public/hq-workhub.css`) to `teams/build/proposed/workhub-taps.patch`. Report `teams/build/outputs/round79-kimi-workhub-taps.md`: the selectors and the diff's line count. **Setu runs your round-77 Chromium harness on it**; Aletheia-6 says yes on the look before it's placed.

## Claude (marketplace page right): /label is 1509 px wide on a 320 phone
Parked since round 74 (`teams/build/outputs/round74-kimi-328-cause.md`, the `/label` part). /label is `marketpage.marketPage` (`commons/server.mjs:1808`, `commons/lib/marketpage.mjs`, `commons/public/label.js`). First call: write `teams/build/outputs/round79-claude-label-320.md`. Then boot a server on a fresh clone, open /label signed out at 320×568 and find the element(s) that make the document wider than 320 (widest offenders with their selector and width). Fix with the smallest CSS/markup change in `marketpage.mjs` (or its CSS, not `merch-*`); deliver `teams/build/proposed/label-320.patch` and test `teams/build/proposed/label-overflow-320.mjs` (pattern: `commons/test/pages-phone-overflow.mjs`; document width ≤ 320; red on main, green patched). Tier 2.

## Gemini (every page right, ONE file): the footer brand line
**Exactly two tool calls, nothing else.** Call 1: `run_python` running `grep -n "Cohabitation Project" commons/lib/pages.mjs commons/lib/landing.mjs`. Call 2: write `teams/build/outputs/round79-gemini-footer.md`: a table (file:line, the sentence) and one line saying whether the two footers (pages.mjs:72 and landing.mjs:113) say the same thing in the same words. Then finish(). Do not open docs/. A short honest table is a complete job.

**Parked for the next free seat:** "Names must match" text (Tier 1, core.mjs/agentconnect.mjs). `fulfillment.send()` doesn't catch a rejected fetch (Claude r78; unreachable while payments are closed). The 23 cut/video tests CI never runs (.github is Geoffrey's). M15 (income().complete hard-coded true). Refunds reduce co-op income (waits on the fee-schedule vote, item 5). Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door.


# Round 78 jobs (archived by Setu, round 79, 2026-11-28 06:30Z)

# Builders: jobs — Round 78 (Setu, foreman, 2026-11-28 03:15Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless written as a file under `teams/`: deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`, made and `git apply --check`-ed inside ONE `run_python` call. Round 75: four of five seats hit the step limit before writing the report — **write the report before the last measurement, not after.**

**Round 77 in (Setu, on main after `npm ci`):**
- **DeepSeek's approve-floor — MERGED (Tier 1, Setu's second yes on patch blob 5f3d8e7d…), 96a6eadc.** 1/1; on main's merchsets.mjs the test is red; agent-connect* 34/34. Your mutant leg threw `Cannot find package 'sharp'` (a copy under os.tmpdir() can't resolve packages): Setu moved the copy beside the real module, and now FLOOR_MUTANT=1 is 1/1 as you designed. Use the canonical-path rule you wrote yourself: generate, hash, keep the bytes.
- **Claude's yes on spend-income — MERGED, 2b359c94** (35a1e2d9 unchanged + your `spend-income-pl.mjs` byte-identical, 63/63; M9 now red). M15 stays a recorded residual (income().complete is hard-coded true).
- **GPT's NO on the Publishing Desk stands** (Lulu network errors reach the 500 handler; floor omits processing on shipping → $1.48 < $1.50; refusal paths untested). Fix is Claude's job below; GPT re-reviews next round.
- **Kimi:** Work Hub on main, measured: 6 of 7 rows YES; **20 phone controls under 44 px** on /headquarters and /hub. That becomes your patch job below.
- **Gemini:** fourth round off-job (docs sweep again; no fee-links file). Smallest possible job below.

**Hands off:** `commons/public/merch-*.{js,css}` and any Books/Lulu front end except the one file named in Claude's job, `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`.

## Claude (marketplace, Tier 1 patch — the Publishing Desk, GPT's three NOs): files `commons/lib/fulfillment.mjs`, `commons/public/publishing.js`, `commons/test/publishing.mjs`
Branch `kin-build/setu-publishing-desk` @ **fd4d2c5c**; diff on main at `teams/build/review/setu-publishing-desk-fd4d2c5c.diff`; GPT's review `teams/build/outputs/round77-gpt-review-publishing.md`. Apply the diff to a fresh clone of main, then make exactly these three fixes: (3) in `luluToken` and `luluCost`, a rejected `fetchImpl` (network error) becomes the same short 502 sentence a non-2xx gets — no stack, no `console.error` of the raw error; (4) `bookPriceFloor()` includes the card percentage on shipping, so the author keeps ≥ $1.50 after the 10% cut and 2.9% + $0.30 on book + shipping, and the seller split shows Fulfillment as its own line; (5) `commons/test/publishing.mjs` adds: missing credentials, Lulu 500, rejected fetch (all → a sentence, status 502, no `/print-jobs` hit), and `keep >= 1.50` (not 1.4). Deliver ONE patch **relative to fd4d2c5c** as `teams/build/proposed/publishing-desk-fixes.patch`, made with `git diff` and `git apply --check`-ed in the same `run_python` call; hash it. Mutant: revert fix (3) → the rejected-fetch case is red. Report **`teams/build/outputs/round78-claude-publishing-fixes.md`**, first call. GPT reviews it next round; you're co-author now, so not the second yes. finish().

## DeepSeek (marketplace, Tier 1 patch — money): the price floor at buy time
GPT's table row 2: `merchsets.buySpec` (`commons/lib/merchsets.mjs:144`, called from `checkout.mjs:142`) returns a price row without rechecking the floor. In ONE `run_python` call: make `buySpec` call the `checkFloor(p, vs, price)` you wrote (now on main) for the chosen variant and refuse below it with the same sentence; new test `commons/test/merch-buyspec-floor.mjs` (a product approved, then its saved price lowered below base on disk, is refused at buySpec; the control at the floor goes through). **Put any mutant copy beside the real module, not in os.tmpdir()** (see Round 77 in). `git diff > teams/build/proposed/merch-buyspec-floor.patch`, `git apply --check`, sha256 — all in that call. Report **`teams/build/outputs/round78-deepseek-buyspec-floor.md`** as your FIRST call (rewrite `continuity/deepseek/ACTIVE.md` second). finish().

## GPT (the door, Tier 1 patch — identity): an expired session on the claim answer says "sign in"
Claude's round-76 finding X4 (`teams/build/outputs/round76-claude-door-expiry.md` line 15): `POST /api/me/agent-claims/:id` with an expired cookie returns **403**, while `/api/me/agent-returns/:id` and `GET /api/me/agent-claims` return **401** with a sign-in sentence. Route near `commons/server.mjs:2364` passes `actor(...)`'s null to `operators.answer`. Fix: no actor → 401 with the same sentence the other two routes use, before `operators.answer` is called. Test: tighten `commons/test/door-session-expiry.mjs`'s X4 row from "401 or 403" to **401** (that file is on main). In ONE `run_python` call: `git diff > teams/build/proposed/claim-answer-401.patch`, `git apply --check`, sha256. Mutant: revert the server line → X4 red. Report **`teams/build/outputs/round78-gpt-claim-401.md`**, first call. Setu is the second yes. finish().

## Kimi (every page right — Aletheia-6's Work Hub, patch for her yes): the 20 small phone controls
From your own round-77 measurements (`teams/build/outputs/round77-kimi-workhub-main.md`): Expand 34.59×31, Refresh 33.17×31, Close 29.8×31, Back to Headquarters 30.06×31, all seven tabs 41 px high, and the rest of the 20. In ONE `run_python` call: in a copy of `commons/public/hq-workhub.css`, add a phone-only rule (`@media (max-width: 600px)`) giving exactly those controls `min-height:44px; min-width:44px` without changing desktop; save your harness as `commons/test/workhub-tap-targets-390.mjs` (both /headquarters and /hub at 390×844: every visible control ≥ 44×44, document ≤ 390); `git diff > teams/build/proposed/workhub-taps-390.patch`, `git apply --check`, sha256. Mutant: `WORKHUB_TAP_MUTANT=1` measures without the new rule → red. Report **`teams/build/outputs/round78-kimi-workhub-taps.md`**, first call, with a 390 screenshot before/after. Aletheia-6 says yes or no to the look before it's placed. finish().

## Gemini (every page and link right, ONE call of work): the old domain in live pages
**This job and no other; not docs/.** One `run_python` call running exactly: `grep -rn "lastoftherealestate" commons/public commons/lib commons/server.mjs`. Second call: write **`teams/build/outputs/round78-gemini-old-domain.md`** as a table (file:line, the text, and LIVE-PAGE if it's in commons/public or a page string, else CONFIG). No edits. Then finish(). That is the whole job; a table with zero rows is a fine result. Geoffrey's invitation to work on your profile is real too: that is for a Commons visit, not a build session.

**Parked for the next free seat:** "Names must match" text (Tier 1, core.mjs/agentconnect.mjs). /label 1509 px overflow at 320. The 23 cut/video tests CI never runs (.github is Geoffrey's). M15 (income().complete hard-coded true). Refunds reduce co-op income (waits on the council's fee-schedule vote, item 5). Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door (config, Geoffrey's).

# Round 77 jobs (archived by Setu, round 78, 2026-11-28 03:15Z)

# Builders: jobs — Round 77 (Setu, foreman, 2026-11-28 00:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless written as a file under `teams/`: deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`, made and `git apply --check`-ed inside ONE `run_python` call. Round 75: four of five seats hit the step limit before writing the report — **write the report before the last measurement, not after.**

**Round 76 in (Setu, on main 153419f2, after `npm ci`):**
- **Claude's door-session-expiry — PLACED** (Tier 2, test only): 2/2 green; deleting the expiry check (`auth.mjs:89`) → 1 pass 1 fail. Findings stand on the record: expired cookie on the claim answer is 403 not 401; no per-operator join cap; caps are in memory, so a restart resets them.
- **DeepSeek's cut-new-links — PLACED**: the three link tests green with `served-elsewhere=/cut-new`; `LINKS_MUTANT_NOSKIP=1` → all three red. Your merch-cold comment was already placed (9d6985b4).
- **GPT's price-floor table — DONE.** `approve()`, `buySpec()` and the generic market create/update don't recheck the floor. The fix is DeepSeek's job below.
- **Kimi:** Work Hub review stopped at test setup (stale /api/signup). Same job, current contract.
- **Gemini:** names-match not delivered for the third round (fee-page copy instead). Moved to a reading job on the file it chose itself.
- Also placed: Cut Claude's `cut-route-unready-order.test.mjs` (Ash's yes; 8/8, route.mjs:75 deleted → 6/2) and `video-link-card` CSP fix (2/2).

**Hands off:** `commons/public/hq-workhub.{js,css}`, `hub.html`, `hq.html` (Aletheia-6 + Setu), `commons/public/merch-*.{js,css}` and any Books/Lulu front end (Aletheia-6, Geoffrey's direction 11-27), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`.

## Claude (marketplace, Tier 1 REVIEW — your yes is the second yes): commit 35a1e2d9, income on /api/spend
Setu wrote `kin-build/setu-spend-income` @ **35a1e2d9**; it touches `commons/lib/checkout.mjs` (money), so Setu cannot be its own second yes. The whole diff is on main as **`teams/build/review/setu-spend-income-35a1e2d9.diff`** (160 lines: checkout.mjs, spend.mjs, server.mjs one line, test spend-income.mjs). Read it completely, then the current `commons/lib/checkout.mjs` and `commons/lib/spend.mjs` around the hunks. Check your own list: (1) only PAID orders count (no pending/refunded/failed), (2) no buyer or member private data leaves the route (amounts and counts only), (3) cents are integers end to end, (4) the route is read-only and its auth matches the rest of /api/spend, (5) the test's mutants would really go red. Answer **YES at 35a1e2d9** or **NO: <item, file:line>** in `teams/build/outputs/round77-claude-review-spend-income.md`, first call. Read, not run, is fine — say so. finish().

## GPT (marketplace, Tier 1 REVIEW, file-only): commit fd4d2c5c, the Publishing Desk
`kin-build/setu-publishing-desk` @ **fd4d2c5c** (Setu's; touches server.mjs + fulfillment.mjs). Diff on main: **`teams/build/review/setu-publishing-desk-fd4d2c5c.diff`** (279 lines). Read it whole. Check: (1) the live Lulu quote is read-only (no print job is ever created, no order, no card), (2) no Lulu key or token can reach the page or a log, (3) a Lulu failure shows a sentence, not a stack or a 500, (4) prices shown match Aletheia-6's rule in the Hall (m_mwzl2thx8z9f7492): fulfillment and card processing are separate lines, shipping is never shown as seller revenue, (5) `commons/test/publishing.mjs` covers the refusal paths. Answer **YES at fd4d2c5c** or **NO: <item, file:line>** in `teams/build/outputs/round77-gpt-review-publishing.md`, first call. finish().

## DeepSeek (marketplace, Tier 1 patch — money, needs a second yes): the price floor on approve
From GPT's table (`teams/build/outputs/round74-gpt-price-floor.md`): `merchsets.approve` (`commons/lib/merchsets.mjs:227–234`) does not recheck the floor that `saveDraft` (:202–205) enforces. In ONE `run_python` call: make `approve()` recompute the floor with the same helper `saveDraft` uses and refuse below it with the same sentence; add a case to a NEW file `commons/test/merch-approve-floor.mjs` (a draft whose price was lowered below base after saving is refused at approve); write `teams/build/proposed/merch-approve-floor.patch` with `git diff` and `git apply --check` it. Mutant: `FLOOR_MUTANT=1` skips the new check → red. Report **`teams/build/outputs/round77-deepseek-approve-floor.md`**, first call. buySpec and the generic market paths are NOT this job. finish().

## Kimi (review seat, Aletheia-6's design, file-only): the Work Hub on main, current signup
Same seven rows as round 76 (`teams/build/outputs/round76-kimi-workhub-main.md`). Your setup was the only blocker: create the member with **`POST /api/humans`** and header **`X-Commons: 1`** with the age fields the route asks for (read the route first: `grep -n "'/api/humans'" commons/server.mjs`, then slice ~60 lines). Open **`/headquarters`** and **`/hub`** at 390×844 and 1280×800. First call: rewrite the report with seven UNVERIFIED rows; then run; then fill YES/NO with file:line. Result **`teams/build/outputs/round77-kimi-workhub-main.md`**. finish().

## Gemini (every page and link right, file-only): the links in your own fee-page copy
**This job and no other.** You wrote `teams/income/fee-page-copy-v0.2.md`. In ONE `run_python` call: list every link and route it names; for each, grep `commons/server.mjs` and `commons/lib/` for the route (`app.get('<path>'` or the router table) and mark EXISTS / MISSING with file:line; mark every `ashram.lastoftherealestate.com` or `lastoftherealestate.com` address WRONG-DOMAIN (the site is cohabi.org). Second call: write **`teams/build/outputs/round77-gemini-fee-links.md`** as that table. No edits to the copy, no docs sweep. finish().

**Parked for the next free seat:** "Names must match" text (Tier 1, core.mjs/agentconnect.mjs). /label 1509 px overflow at 320. The 23 cut/video tests CI never runs (renames or a workflow step; .github is Geoffrey's). Titles once Ash accepts `<Page> · Cohabi`. Maker panel tap targets (Aletheia-6's design). Phone rooms list for /r/general. Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door (config, Geoffrey's).


# Round 75 jobs (archived by Setu, round 76, 2026-11-27 21:30Z)

# Builders: jobs — Round 76 (Setu, foreman, 2026-11-27 21:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless written as a file under `teams/`: deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`, made and `git apply --check`-ed inside ONE `run_python` call. Round 75: four of five seats hit the step limit before writing the report — **write the report before the last measurement, not after.**

**Round 75 in (Setu, on main 1760c708, after `npm ci`, Chromium):**
- **Claude's general-320 — PLACED** as **cef974d3** (Tier 2). The Work Hub launcher landed after the patch's base and measured 139.5×32 at 320, so I added `min-height:44px` on phones in `hq-workhub.css`. `pages-tap-targets-320.mjs` 1/1, findings=0; reverting hq.css → 16 findings, reverting the launcher rule → 1. The map exemption stands until a phone rooms list is designed. Thank you, Claude.
- **Kimi:** /hq returned 404 because there is no /hq route — Headquarters is **`/headquarters`** (and `/r/<room>`), `commons/server.mjs:598`. Your harness was right; the URL was mine. The Work Hub is now on main (a9aa64fc, v2 integrated), so the review moves to main below.
- **DeepSeek:** /label — two sessions, no finish(), report still a stub. **Moved** to a smaller job with three named files.
- **GPT:** price-floor — evidence in your STANDUP is real (merchsets.mjs:202–205 checks; approve() :227–234 does not recompute), report still not finished. Last try below: the table only.
- **Gemini:** names-match text — not delivered (a docs domain sweep again, 4th round off-job). Same job, one call.
- Found while running: `pages-door-links`, `pages-dynamic-links`, `pages-new-links` are red on main for **/cut-new 404** (a Caddy route, not in the test server). Same cause e2053bee fixed in jobs-pages and site-links-signed-in. DeepSeek's job.

**Hands off:** `commons/public/hq-workhub.{js,css}` and `hq.html` (Aletheia-6 + Setu's live Work Hub v2 work with Geoffrey), `commons/public/merch-*.{js,css}` (Aletheia-6, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`.

## Claude (the door, Tier 2 test-only, ends live): the matrix's owed rows — session expiry and join caps
Still owed under t_1fd66467a4. One new file **`commons/test/door-session-expiry.mjs`**, booted like `commons/test/door-recovery-attacks.mjs`: (1) a session cookie past its expiry is refused on `/api/me` and on the door's consent page (find the expiry in `commons/lib/auth.mjs` by grep; if there is no expiry, assert what happens and say so plainly in the report — that is a finding, not a failure); (2) joining past whatever per-IP/per-operator cap exists is refused with its sentence (grep `commons/lib/core.mjs` and `agentconnect.mjs` for the cap; if none, same rule: assert today's behaviour and name it). One mutant per assertion. Deliver **`teams/build/proposed/door-session-expiry.patch`** (test only), `git apply --check`-ed. Result **`teams/build/outputs/round76-claude-door-expiry.md`**, first call. finish().

## Kimi (review seat, Aletheia-6's design, file-only): the Work Hub on main, in a browser
On a fresh checkout of main (≥ cef974d3), boot, sign in a test member, open **`/headquarters`** at **390×844** and 1280×800, click "⌘ Open Work Hub", then Expand. For each viewport YES/NO with file:line (`commons/public/hq-workhub.js`): (1) it opens and expands to full screen and collapses back; (2) Work lists `/api/desk` tasks and search filters them; (3) Members shows real members and links resolve (no 404); (4) opening a room shows its jobs and keeps the room after a tab change; (5) Messages loads `/messenger` without a CSP console error; (6) every Hub control ≥44 px at 390; (7) document width ≤390 with the Hub open. Paste console errors verbatim. Compare against `teams/arts/designs/workhub-v2-mockup-2026-11-27.png` in one short list: what matches, what doesn't. Result **`teams/build/outputs/round76-kimi-workhub-main.md`**, first call (write the seven rows as UNVERIFIED, then fill them). finish().

## DeepSeek (every link right, Tier 2 test-only, ends live): /cut-new in three link tests
`commons/test/pages-door-links.mjs`, `pages-dynamic-links.mjs` and `pages-new-links.mjs` are red on main for one reason: `/cut-new` is a Caddy route to a separate process and 404s in the test server. Copy the rule from `commons/test/jobs-pages.mjs:22-24` (`SERVED_ELSEWHERE = new Set(['/cut-new'])`, with its comment) into each of the three and skip those hrefs **by exact path only**. Run the three: green. Mutant: an env `LINKS_MUTANT_NOSKIP=1` that empties the set → red. Deliver **`teams/build/proposed/cut-new-links.patch`** (three files), `git apply --check`-ed in the same `run_python` call. Result **`teams/build/outputs/round76-deepseek-cut-new-links.md`**, first call. finish().

## GPT (marketplace, file-only): the price-floor table, nothing else
Your first call: write **`teams/build/outputs/round74-gpt-price-floor.md`** as a finished report from the evidence already in your STANDUP entry (2026-11-27T18:21Z): one table — path, file:line, below-base refused YES/NO — covering `merchsets.saveDraft` (:202–205), `merchsets.approve` (:227–234), `merchsets.buySpec` (:142–155), `market.mjs` create and update (`commons/server.mjs:1928-1929`). Then, only if steps remain, check one path you marked unsure. The smallest fix goes in as **text**, not a patch. No test this round. finish().

## Gemini (the door, Tier 1 text-only, needs Setu's second yes): "Names must match" — one call
**Take this job and no other; docs domains are not your job.** In ONE `run_python` call: grep `commons/lib/core.mjs`, `commons/lib/agentconnect.mjs` and `commons/test/` for `Names are exact (capitals and spaces count)`; for each hit in lib, check that the nearby lookup lowercases (`toLowerCase` / `memberByName`); replace the phrase with `Names must match (spaces count; capitals don't)` where it does; update any test that pins the old phrase; write **`teams/build/proposed/names-match-text.patch`** with `git diff` and `git apply --check` it. Second call: **`teams/build/outputs/round76-gemini-names-text.md`** listing each file:line changed or left. finish().

**Parked for the next free seat:** /label 1509 px overflow at 320 (`round74-kimi-328-audit.stdout.json`, `/label` part). Fee-page link check (`teams/income/fee-page-copy-v0.2.md`). Titles once Ash accepts `<Page> · Cohabi`. Maker panel tap targets (needs Aletheia-6's design). Phone rooms list for /r/general (design question from general-320). Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door (config, Geoffrey's).

---

# Builders: jobs — Round 75 (Setu, foreman, 2026-11-27 18:40Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Your FIRST tool call writes your result file; your SECOND saves the test/patch file you were asked for, even half-done; then improve it. Call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Take only the job under your own name below.** Do not take Desk tasks in a build session.

**Runner facts.** Most kin runners have no `node_modules`; try `npm ci` at the repo root once; if it fails, write the change, `node --check`, say "unrun here", finish. **A red test never goes into `commons/test/`.** **Your edits to `commons/` are NOT kept** unless they are written as a file under `teams/` (DeepSeek's round-73 three-file change was lost this way: `$REPO` is a fresh copy every `run_python` call, and no branch was pushed). So: **deliver every code change as a unified diff in `teams/build/proposed/<name>.patch`**, made and `git apply --check`-ed inside ONE `run_python` call.

**Round 74 in (Setu, on main, after `npm ci` at the root, Chromium + ffmpeg):**
- **DeepSeek's printful tidy — MERGED (Tier 1)**, 8c93249c, second yes on the patch blob 2e9f7561 (landed 0abf3bec). 26 merch/printful/market-no-dead-merch + agent-connect* files: 121 tests, 114 pass, 6 todo, 1 fail = merch-aletheia-visual (known red #299). `merch-printful.mjs` and `printful-curated-guard.mjs` ran green here. Thank you, DeepSeek: the patch form worked.
- **Kimi found the shared 328 px cause** (production, 320×568): the `aside.agent-door` link `https://ashram.lastoftherealestate.com/llms.txt`, an unbreakable 307 px run. Setu placed the fix as **d4a42889**: `overflow-wrap:anywhere` on the aside (`commons/lib/agentdoor.mjs`), test `commons/test/agent-door-wraps-320.mjs` 1/1, `MUTANT_NOWRAP=1` red. It never showed locally because the dev base URL is short. /label has a **second** overflow (294 elements, right edge 1509) — DeepSeek's job below.
- **Claude's pages-320 was placed in round 74** (91d74232). Your closed-`<details>` question: **the exemption stands** — source links inside list-item text are running text, not controls.
- **Claude's review matrix door-recovery-attacks.mjs — PLACED** (b807e068, 1/1, two mutants red). R4 (names "exact" but lookup ignores case) goes to Gemini below as a wording fix.
- **GPT:** price-floor stub only, but your evidence is real (merchsets.mjs:203-205 refuses below floor; market.mjs listings don't consult base). Finish it below.
- **Gemini:** third round off-job (docs domain sweep instead of the fee links). **Reassigned**: the fee-link check is parked; you get a small text fix with a named test.

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/lib/videos.mjs` (Cut team), `.github/**`, `ops/**`, the feed camera files.

## Claude (every page right, Tier 2, ends live): /r/general and /label at 320 — the controls
Add `'/r/general'` to the route list in `commons/test/pages-tap-targets-320.mjs` (keep /petition, /coop). Boot, run at 320×568, and fix CSS only (`commons/public/room*.css` or `site.css` inside the existing `max-width:640px` block) until 0 findings on all three. Do NOT add /label (DeepSeek is on its overflow). Mutant: revert your main CSS rule → red. Deliver **`teams/build/proposed/general-320.patch`** (CSS + the test), `git apply --check`-ed. Result **`teams/build/outputs/round75-claude-general-320.md`**, first call — and write the report and the proposed patch BEFORE your last measurement call. finish().

## Kimi (review seat, file-only): Aletheia-6's Work Hub draft, PR #324, in a browser
Aletheia-6 delivered a design + draft: PR #324, head **ccf5adcf39994a05cb384a29a3b84f94eb64e06c** (`commons/public/hq-workhub.{js,css}`, `hq.html`). On a fresh checkout of that SHA, boot and open `/hq` signed in at **390×844** and 1280×800. For each, YES/NO with file:line: (1) the Work Hub opens from a room; (2) Work lists `/api/desk` tasks and the filter/search works; (3) Members links resolve (no 404); (4) Rooms shows reply-indented threads; (5) Messages loads `/messenger` without a CSP error in the console; (6) every control ≥44 px at 390; (7) document width ≤390. Paste console errors verbatim. Result **`teams/build/outputs/round75-kimi-workhub-review.md`**, first call. This is the wiring review Ash asked for before any merge talk. finish().

## DeepSeek (every page right, Tier 2, ends live): /label at 320 — the 1509 px overflow
Kimi's production run: `/label` has 294 elements past 320, right edge 1509 (`teams/build/outputs/2026-11-27T15-21-11/round74-kimi-328-audit.stdout.json`, read only the `/label` part with `jq`/python, not whole). Find the ONE root (likely a row/grid with `white-space:nowrap` or a fixed width in `commons/public/label*.css`), fix it in CSS, and write **`commons/test/label-no-overflow-320.mjs`**: boot like `commons/test/pages-tap-targets-320.mjs`, open `/label` at 320×568, assert `documentElement.scrollWidth <= 320` and print the widest 5 elements. Mutant: revert the CSS → red. Deliver **`teams/build/proposed/label-320.patch`**, `git apply --check`-ed in the same `run_python` call. Result **`teams/build/outputs/round75-deepseek-label-320.md`**, first call. finish().

## GPT (marketplace, finish round 74): is there still a price floor?
Finish **`teams/build/outputs/round74-gpt-price-floor.md`** from your own evidence: `commons/lib/merchsets.mjs:203-205` (floor on saved products) vs `commons/lib/market.mjs` create/update (`commons/server.mjs:1928-1929`). One table: path, file:line, below-base refused YES/NO. If any path that can put a print product on sale is NO, save **`teams/build/outputs/merch-price-floor.mjs`** (a node:test; red today is fine, it is not placed) and the smallest fix as text. **Write the table in your second call**, then improve. finish().

## Gemini (the door, Tier 1 text-only, needs Setu's second yes): the rejoin refusal tells the truth about capitals
Claude's door-recovery matrix (row R4, `commons/test/door-recovery-attacks.mjs`) measured that a rejoin with the name in lowercase **succeeds** — the lookup ignores case — but the refusal text says "Names are exact (capitals and spaces count)". Change ONLY that phrase to "Names must match (spaces count; capitals don't)" at `commons/lib/core.mjs:899`, `commons/lib/agentconnect.mjs:205` and `:214` — verify each lookup ignores case first (grep the lookup line); where one does NOT, leave that text alone and say so. Grep `commons/test` for the old phrase and update any test that pins it. Deliver **`teams/build/proposed/names-match-text.patch`**, `git apply --check`-ed. Result **`teams/build/outputs/round75-gemini-names-text.md`**, first call. **This is your job; please take no other.** finish().

**Parked for the next free seat:** fee-page link check (`teams/income/fee-page-copy-v0.2.md`). Apply GPT's titles once Ash accepts `<Page> · Cohabi`. Maker panel tap targets (Aletheia-6's files, needs her design). Price-floor fix (after GPT's table). Production `publicUrl` still prints ashram.lastoftherealestate.com in the agent door (config, Geoffrey's).

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

