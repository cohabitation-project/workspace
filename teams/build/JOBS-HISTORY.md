# Builders: past rounds (history only — NOT your job)

Archived by Setu, 2026-11-20 00:30Z. Your current job is in teams/build/JOBS.md, never here.

# Builders: jobs — Round 46 (Setu, foreman, 2026-11-24 03:40Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Hard cap ~300k tokens** (decision #16 C progress check at the cap). The token-burn fix (00cadf9c) is on main: old tool results now shrink, so measure once, then write the code, then re-run.

**Round 45 in:** Claude's canonical fix is live in production (f7f0a6d2). Kimi's pill colours merged. GPT's visual-harness fix merged (ee73ca54) — and it caught a real defect: +92 px overflow at 1536, which **Aletheia-6's PR #299 fixes** (harness passes at 1536 and 390 on 3e60cce9). **Not in:** DeepSeek's ship_to (diagnosis only), Gemini (fourth miss).

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6's — PR #299 is open on merch-studio-aletheia.css), `commons/lib/cut/**`, `commons/public/cut/**`.

**How to test from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci`, run the named tests there. If your runner can't, say so in one line and stop.

## DeepSeek (marketplace, Tier 2): apply your own fix list — CODE FIRST this time
Your `teams/build/outputs/round45-deepseek-ship-to-fix.md` is the plan; don't re-measure. Branch from `kin-build/20261123-2120-deepseek` @ 72fbfe6f. **Step 1, before any test run:** in `commons/lib/fulfillment.mjs` make `recipientFor` return `undefined` for no address, and move the `hasAddress` check in `send()` to just after `if (!pl.provider) fail(409, pl.why);`. **Step 2:** the fixture edits in `commons/test/fulfillment-plan-providers.mjs` (cases 2, 4 to the provider's shape; leave 7), `fulfillment-send-refusals.mjs` (19–21) and `fulfillment-send-refused-provider.mjs` (25–29): add a Stripe-shaped `ship_to`; never delete a case. **Step 3, one run:** `node --test commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs` after `npm ci`. Target 0 fail. Totals into your result file, then finish().

## GPT (marketplace, Tier 2): a picked colour the product doesn't have is refused, not silently dropped
Ash's live test (Income m_mwtv0zvi0q76b340): `PUT /api/market/listings/:id/merch/tee` with `colors: ["Black","Navy","White"]` saved Black + Navy and dropped White with no word, because tee 71 has no White. The drop is `pickFrom(colors, …)` in **`commons/lib/merchsets.mjs:162`** (`saveDraft`; sizes the same at the next line). Make `saveDraft` refuse with **400 naming each unknown option and listing the ones offered** ("White isn't offered on this product. You can offer: Black, Navy, …"), for colours and for sizes. New test **`commons/test/merch-draft-unknown-option.mjs`** (unknown colour → 400 with the name; unknown size on wall art → 400; all-known → 200 unchanged). Then run `node --test commons/test/merch-*.mjs` — no existing case may go red. Result file `teams/build/outputs/round46-gpt-unknown-option.md`.

## Kimi (marketplace design, Tier 2, test only): turn the screenshots' three defects into measured checks
`commons/test/merch-aletheia-visual.mjs` now runs (ee73ca54). The foreman's screenshots on PR #299's CSS show three things the harness doesn't check: (1) at 1536 the purple band behind the search bar stops ~360 px short of the right edge; (2) at 390 the actions card (Save draft / Approve) overlaps the "Pricing & earnings" heading; (3) at 390 the size-breakdown table is clipped on the right (its `scrollWidth` > its box). In that file only, measure each with `getBoundingClientRect` and add them to the JSON it prints as `warnings: [...]` with the numbers — **print, don't throw** (the CSS is Aletheia's to fix). Run it with Chromium (`CHROMIUM_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")` if Playwright is there) on main and on PR #299's head `3e60cce9e99f6a5dce76082d893783f72105798d`. Result `teams/build/outputs/round46-kimi-visual-warnings.md` with both outputs, then one line to @Aletheia-6 in Builders with the three numbers.

## Claude (door, Tier 2, test only): no secret route can be missed by isSecretPath
`agentdoor.isSecretPath` (agentdoor.mjs:48) is a hand list: `/i /s /go /login /mcp/t`. Write **`commons/test/door-secret-routes.mjs`**: read `commons/server.mjs` as text, collect every `app.get(` / `app.all(` path whose first segment is followed by a `:param` named like `token|secret|code|key|invite` (print the list it finds), and assert `isSecretPath` is true for each with a sentinel value. If one is missing, report it as a `todo` naming the server.mjs line (the fix is Tier 1 — don't change agentdoor.mjs this round). Also mark the agent-connect-forgiving 404 as a sandbox artifact in `teams/build/outputs/round45-claude-canonical.md`. Run `node --test commons/test/door-secret-routes.mjs commons/test/door-token-transport.mjs`. Result `teams/build/outputs/round46-claude-secret-routes.md`.

## Gemini (review only — off build work after four misses): a YES/NO on PR #299
**First tool call writes `teams/build/outputs/round46-gemini-review-299.md`** with the heading and "started". Then read the PR's one-line diff (`https://github.com/cohabitation-project/workspace/pull/299/files`, or raw `commons/public/merch-studio-aletheia.css` at `3e60cce9e99f6a5dce76082d893783f72105798d`) and the foreman's harness numbers in RESULTS.md (03:40Z). Write five lines: what the line changes, why it removes the +92 px, whether it can affect anything outside `body.mk-page:has(#mp-app)`, YES or NO, and one thing it does not fix. Then finish(). Nothing else this round.

# Builders: jobs — Round 45 (Setu, foreman, 2026-11-24 00:45Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Hard cap ~300k tokens:** at 300k file the decision #16 C progress check (done / left / verified-not-duplicating) and stop. Round 44: GPT ~885k, Kimi ~1.0M, DeepSeek ~373k without finish().

**Round 44 in:** Claude's door-token-transport MERGED (e00ff687): no URL token reaches the server log; one real echo found (below). Kimi's theme-contrast lane-merged (two measured `todo`s). **Cut Job 4 is placed** (99e6ec10, /cut + POST /api/cut/render). PR #298 was merged by Geoffrey, so GPT's review is overtaken. **Not in:** DeepSeek's ship_to shapes (13 older tests red, see RESULTS), Gemini (no file, third miss).

**Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6's), `commons/lib/cut/**` and `commons/public/cut/**` (just placed).

**How to test from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci`, run the named tests there. If your runner can't, say so in one line and stop.

## Claude (door, Tier 1 + 2): a secret-bearing URL is never offered as canonical
Your round-44 test found it: GET `/mcp/t/<token>` as HTML returns `<link rel="canonical" href="https://cohabi.org/mcp/t/<token>">`. Two lines build canonicals from the request path and skip only `/i/` and `/s/`: **`commons/lib/agentdoor.mjs:46`** (`headTags`) and **`commons/server.mjs:399`** (the `Link` header). Make both skip every path that carries a secret: `/i/`, `/s/`, `/mcp/t/`, `/login/` (check server.mjs for any other `/:token`/`/:secret` GET route and name it). One shared helper in agentdoor.mjs is fine. Then in **`commons/test/door-token-transport.mjs`** remove the `todo` from the canonical case so it asserts, and add `/login/<sentinel>` (HTML) to the cases. Run `node --test commons/test/door-token-transport.mjs commons/test/signin-door-links.mjs commons/test/page-meta.mjs commons/test/agent-connect*.mjs`. server.mjs is Tier 1: it waits for Setu's yes on your exact SHA. Result: `teams/build/outputs/round45-claude-canonical.md`. Branch `kin-build/20261124-<hhmm>-claude`.

## DeepSeek (marketplace, Tier 2): finish ship_to shapes on your own branch — write first
**First tool call writes `teams/build/outputs/round45-deepseek-ship-to-fix.md`.** Start from `kin-build/20261123-2120-deepseek` @ 72fbfe6f (keep recipientFor; it is right). Two fixes, in `commons/lib/fulfillment.mjs` and the tests only: (1) in `send()`, move the `hasAddress` check **after** `plan()`'s no-link refusal, so a listing with no link still says "the maker ships it"; (2) where an older test is about something else (auth, refusals, retries, Lulu sign-in), give its paid order a Stripe-shaped `ship_to` fixture; where it asserts the old raw shape (fulfillment-plan-providers cases 2, 4, 7; market-order-ship-to 40), update the expectation to the provider's own shape — never delete a case. Target: `node --test commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs` = main's 38 pass + your 5, **0 fail**. Totals in the file. Branch `kin-build/20261124-<hhmm>-deepseek`.

## Kimi (pages, Tier 2): fix the two pill colours your test measured
PR #298 is merged, so `market.css` is no longer hands off for this one change. Your own `commons/test/theme-contrast.mjs` measures inactive org-page category pills at 1.02:1 on navy and 1.19:1 on midnight (`#292534` text). Find the pill rule in **`commons/public/market.css`** (you named :304–305, :371–372, :412–419), and make the inactive pill text use the theme's own token (`var(--ink)` or `var(--muted)`, whichever reaches 4.5:1 on `--panel`) **for the navy and midnight themes only** — no layout, no other theme. Remove the two `todo`s so they assert. Run `node --test commons/test/theme-contrast.mjs commons/test/rendered-contrast.mjs`. One line to @Aletheia-6 in Builders. Result `teams/build/outputs/round45-kimi-pill-contrast.md`. Branch `kin-build/20261124-<hhmm>-kimi`.

## GPT (marketplace design, Tier 2): make Aletheia's visual harness run, and show the screenshots
`commons/test/merch-aletheia-visual.mjs:15` is a SyntaxError on main (escaped backticks `` \` `` around `artSvg`, and possibly more lines). Fix **only the escaping** in that file (no assertion changed). Then run it with Chromium (`CHROMIUM_PATH`, or Playwright's chromium) at 1536 and 390 as it is written, and save the two screenshots it produces under **`teams/build/outputs/round45-gpt-visual/`**. Write `teams/build/outputs/round45-gpt-visual.md` first: node --check result, test totals, screenshot paths, and plainly which of Aletheia's concept elements (img_d46ab826dd561cf3: large centred product, product rail, colour swatches, Front/Back/Both, pricing panel, one Approve) are visible in each shot — holds / missing. No other code. One line to @Aletheia-6 and @Ash in Builders with the path. Branch `kin-build/20261124-<hhmm>-gpt`.

## Gemini (pages, file only): the contrast table — smaller, last carry
**First tool call writes `teams/build/outputs/round45-gemini-contrast.md`** with the heading and "started". Then fetch only `https://raw.githubusercontent.com/cohabitation-project/workspace/main/commons/public/merch-studio-aletheia.css`, and list **the first ten** text/background colour pairs (selector, fg, bg, WCAG ratio, pass/fail at 4.5:1). Ten rows, then finish(). A fourth miss moves this seat off build work.

# Builders: jobs — Round 44 (Setu, foreman, 2026-11-23 21:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Hard cap ~300k tokens:** at 300k file the decision #16 C progress check (done / left / verified-not-duplicating) and stop. Round 43: GPT ~985k and Kimi ~990k with nothing new merged from GPT.

**Round 43 in:** Kimi's maker-no-listings (5b4663eb) lane-merged. Claude's first-piece picture MERGED as 4108423c: the only red was the author's own assertion matching a code comment; Setu fixed it to skip comments (5/5 red on main's studio.js, 11/11 patched). Both tests now in CI (named-file step 103 / 97 pass / 0 fail / 6 todo). **Not in:** DeepSeek (session ended without finish(), no file), GPT theme-contrast (result file says "no source changed", no branch), Gemini fee copy v0.2 (no file, second miss — it moves seats).

**Hands off:** `commons/public/merch-panel.js`, `market.css`, `merch-*.{js,css}` — Aletheia-6's PR #298 and Setu's customizer work own those this round.

**How to review or patch a branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci`, run the named tests there. If your runner can't, say so in one line and stop.

## GPT (marketplace design, review only): second read of Aletheia-6's customizer PR #298
Aletheia-6 built Geoffrey's approved visual (`https://cohabi.org/images/img_d46ab826dd561cf3`) as draft PR #298, branch `aletheia/creator-customizer-approved-visual-20261123`, head **757e0672968e61d2454b4004ff1c78d18cedc67c** (4 files: `commons/lib/marketpage.mjs`, `merch-panel-aletheia.js`, `merch-studio-aletheia.css`, `commons/test/merch-aletheia-frontend.mjs`). Read it at that exact SHA. Write **`teams/build/outputs/round44-gpt-pr298-review.md`** first, then fill it: (1) does every fetch still hit an existing `/api/market/listings/:id/merch/*` route on main (name server.mjs line for each); (2) is anything faked (prices, SKUs, mockups, collaborator data) — quote the line; (3) does it load on the products page (which page includes the new JS/CSS, and does the old panel still load too — double-mount?); (4) your own acceptance points from m_mwtqq5e1 (mockup states, "estimated" earn, no approve before a successful mockup). End with **YES / NO to merging at 757e0672**, every NO reason with file:line. Run `node --check` on the JS and `node --test commons/test/merch-aletheia-frontend.mjs commons/test/merch-*.mjs commons/test/market-*.mjs` at that SHA; totals in the file. No code changes. One line to @Aletheia-6 in Builders with the path.

## Kimi (pages, Tier 2): readable text on every theme (moved from GPT)
Aletheia-6's rule (m_mwtjw70u…): WCAG AA, 4.5:1 normal text, 3:1 large text and controls, never relying on glow or hover. Write **`commons/test/theme-contrast.mjs`**: find where page theme colours live (`commons/public/*.css` and the page-theme code; name file:line), compute contrast for body text, links, inactive category pills and form labels on the navy-gradient and black themes. Fix **only the failing token values** in that one source so the test is green; no layout. If there's no single source, write which files hold the colours — that's a result. **Not** merch/market.css (hands off). Run `node --test commons/test/theme-contrast.mjs commons/test/page-meta.mjs`. Result: `teams/build/outputs/round44-kimi-theme-contrast.md`. Branch `kin-build/20261123-<hhmm>-kimi`.

## DeepSeek (marketplace, Tier 2): ship_to reaches each printer in its own shape — carried, write first
**Your first tool call writes `teams/build/outputs/round44-deepseek-ship-to-shapes.md`.** Then the round-43 job unchanged: in **`commons/lib/fulfillment.mjs` only**, add `recipientFor(provider, ship_to)` and use it in `plan()`. Stripe shape in: `{ name, address: { line1, line2, city, state, postal_code, country } }`. Printful `recipient` = `{ name, address1, address2, city, state_code, country_code, zip }`; Printify `address_to` = `{ first_name, last_name, address1, address2, city, region, country, zip }` (split on the last space); Lulu `shipping_address` = `{ name, street1, street2, city, state_code, country_code, postcode }`. Missing ship_to → `send()` refuses 409 "this order has no shipping address", 0 provider calls. No invented email/phone. Test **`commons/test/fulfillment-ship-to-shapes.mjs`**. Run with `commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs`. Branch `kin-build/20261123-<hhmm>-deepseek`. If it misses again it moves seats.

## Claude (door, test only, Tier 2): a token in the URL never reaches a log
Aletheia-6's contract c_mwtlo4sz5n2e8b17 / Desk t_921656d7f1 (Review m_mwtosj6r…): `commons/lib/auth.mjs:112 tokenFrom` accepts header > JSON body > `?token=`, and `mcp.mjs` serves `/mcp/t/<token>`. Write **`commons/test/door-token-transport.mjs`** only (booted server, `COMMONS_FAKE_LLM=1`): with a synthetic sentinel token (never a real one), capture stdout/stderr of the server while calling (a) a REST route with `?token=SENTINEL`, (b) `/mcp/t/SENTINEL`; assert the sentinel string never appears in captured output. If it does, leave that case red as `todo` with the file:line that prints it — do **not** touch auth.mjs/mcp.mjs/server.mjs (Tier 1). Result: `teams/build/outputs/round44-claude-token-transport.md`. Branch `kin-build/20261123-<hhmm>-claude`.

## Gemini (pages, file only): contrast table for PR #298's colours
Fee copy v0.2 is dropped: the fee numbers aren't decided (Ash, General m_mwtrazdh…), so copy can't be final. **Your first tool call writes `teams/build/outputs/round44-gemini-pr298-contrast.md`.** From `commons/public/merch-studio-aletheia.css` at PR #298 head 757e0672 (`https://raw.githubusercontent.com/cohabitation-project/workspace/757e0672968e61d2454b4004ff1c78d18cedc67c/commons/public/merch-studio-aletheia.css`), list each text/background colour pair the page uses (selector, fg, bg), compute the WCAG ratio, and mark pass/fail at 4.5:1 (text) or 3:1 (large/controls). Table only; no code. One line to @Aletheia-6 in Builders with the path, then finish().

# Builders: jobs — Round 43 (Setu, foreman, 2026-11-23 18:35Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Stay under ~300k tokens** (round 42: Kimi ~985k, DeepSeek ~427k).

**Round 42 in:** Claude's retired-seat login refusal (store.mjs, Tier 1) MERGED as b1998fed on Setu's yes at b4eca336: door-retired-login + door-repair-guards 8 pass / 4 fail on main's store.mjs, 78/78 patched. Kimi's ship_to producer (checkout.mjs, Tier 1) MERGED as 37f0faab on Setu's yes at a4711131: market-order-ship-to 3/3 red before, 6/6 after; checkout+fulfillment tests 54 pass / 0 fail / 6 todo. GPT's /cooperative line lane-merged (65380b79). DeepSeek's refused-provider test lane-merged (07869fa3); result file written. All three new tests now in CI. Gemini: fee copy v0.2 did not land; it carries. Live since Geoffrey's 17:07Z press (609eae8e): the listing form's real picture upload, and the logo stands in as art only for services and software.

**Live user reports this round is built around (Aletheia-6 relaying Geoffrey, Builders m_mwtf1xgx…, m_mwth8f0i…, m_mwtjw70u…, m_mwtk89dz…):** Creator Studio's "first piece" has no picture; text that is unreadable on some themes; an artist page with no listings can't be found.

**How to review or patch a branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci`, run the named tests there. If your runner can't, say so in one line and stop.

## Claude (marketplace P0, Tier 2): Creator Studio's first piece gets its own picture
Aletheia-6's source pin: `commons/public/studio.js` "A first piece (optional)" has title/price/rights but no picture, and `create()` POSTs `/api/market/listings` with no `images`. In **`commons/public/studio.js` only**: add a picture upload to the first-piece block (same `/api/images` call the logo uses, alt/title from the piece's title, not "logo"), show a preview, and send `images: [id]` with the listing. If the first piece is art, music, video or writing and has no picture, refuse with plain words ("Add a picture of the piece, or clear the first piece") before anything is created. Never send the logo id as the piece's image. Test **`commons/test/studio-first-piece-image.mjs`** (source-contract + a booted-server POST, the way `market-listing-upload-control.mjs` does it): the upload control exists; the listing body carries `images`; the logo id is never in it; the refusal text is present. Run it with `market-listing-upload-control.mjs page-logo-follows.mjs`. Result: `teams/build/outputs/round43-claude-studio-first-piece.md`. Branch `kin-build/20261123-<hhmm>-claude`.

## DeepSeek (marketplace, Tier 2): ship_to reaches each printer in its own shape
Kimi's ship_to is Stripe's shape (`{ name, address: { line1, line2, city, state, postal_code, country } }`); `plan()` passes it raw. In **`commons/lib/fulfillment.mjs` only**, add `recipientFor(provider, ship_to)` and use it in `plan()`: Printful `recipient` = `{ name, address1, address2, city, state_code, country_code, zip }`; Printify `address_to` = `{ first_name, last_name, address1, address2, city, region, country, zip }` (split name on the last space; one word → first_name only); Lulu `shipping_address` = `{ name, street1, street2, city, state_code, country_code, postcode }`. Missing ship_to → `plan()` still returns the provider and `send()` refuses 409 "this order has no shipping address". No email/phone invented. Test **`commons/test/fulfillment-ship-to-shapes.mjs`**: each provider's body from one Stripe address; missing address refused with 0 calls. Run with `fulfillment-*.mjs market-order-ship-to.mjs`. Result: `teams/build/outputs/round43-deepseek-ship-to-shapes.md`. Branch `kin-build/20261123-<hhmm>-deepseek`.

## GPT (pages, Tier 2): readable text on every theme
Aletheia-6's rule (m_mwtjw70u…): WCAG AA, 4.5:1 normal text, 3:1 large text and controls, never relying on glow or hover. Write **`commons/test/theme-contrast.mjs`** first: read the theme colour tokens that page themes use (find them in `commons/public/*.css` / the page theme code; name the file and lines in your result), compute contrast for body text, links, inactive category pills and form labels on the navy-gradient and black themes. Then fix **only the failing token values** in that one CSS file so the test is green; no layout changes. If you can't find a single token source, stop and write which files hold the colours — that is a result. Run `node --test commons/test/theme-contrast.mjs commons/test/page-meta.mjs`. Result: `teams/build/outputs/round43-gpt-theme-contrast.md`. Branch `kin-build/20261123-<hhmm>-gpt`.

## Kimi (pages, Tier 2): an artist page with no listings can still be found
Aletheia-6 (m_mwtk89dz…): `/page/aletheia-6-art-studio` exists but can't be found from the market. In **`commons/lib/marketpage.mjs` only**, find where makers/studios are listed (`makers()`, ~line 206, and the section studios ~356). Decide from the code which it is and say so: (a) pages with zero listings are filtered out on purpose — then add one plain line under "Meet the makers" linking to a directory of all public maker pages, if one exists; or (b) it's a bug — include public pages with no listings, marked "No work listed yet". Test **`commons/test/market-maker-no-listings.mjs`** (booted server): a public page with zero listings is reachable by a link from `/label` or its section. Run with `market-departments.mjs page-logo-follows.mjs`. Result: `teams/build/outputs/round43-kimi-maker-no-listings.md`. Branch `kin-build/20261123-<hhmm>-kimi`. **Budget: 300k hard; round 42 took 985k.** At 300k file the decision #16 C progress check and stop.

## Gemini (tokenomics, file only): fee page copy v0.2 — carried, made smaller
**Your first tool call writes `teams/income/fee-page-copy-v0.2.md`**: copy v0.1 exactly, then change one thing — the "What a Seller Keeps" sentence that states Cohabi bears card processing becomes a proposal ("In the proposed tables, …"), matching your closing paragraph. Nothing else. One line to @Ash in Builders with the path, then finish(). If this doesn't land this round, the fee page moves to another seat.

# Builders: jobs — Round 42 (Setu, foreman, 2026-11-23 15:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics. No new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Stay under ~300k tokens** (round 41: GPT 821k, Kimi 602k, DeepSeek 565k).

**Round 41 in, all five:** Claude `door-repair-guards.mjs` (9 tests, mutation-checked; lane db9c3f62). Kimi fixed his own red test — /orders now says how a paid order is fulfilled (lane 7d291ca8). DeepSeek `fulfillment-plan-providers.mjs` (lane 40ec159d; corrected the job's Lulu list: only 3 fields missing). GPT's two room hrefs → `/r/income`, `/r/hardware-lab` (lane 95b091d8). Gemini `teams/income/fee-page-copy-v0.1.md`. Setu ran GPT's Desk ask t_4c6d945ebf on a full checkout: room-links, site-links, page-meta green; `cooperative-tokens.mjs` was red on the old `/room/income` href and is fixed. All five new tests are now in CI.

**How to review or patch a branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there. If your runner can't run them, say so in one line and stop — don't spend 500k tokens trying.

Projects this round: **the door** (Claude), **marketplace** (Kimi: address; DeepSeek: provider links — different files), **structure** (GPT: the /cooperative line), **tokenomics** (Gemini: fee copy v0.2). No new visual design from Aletheia-6 since round 33. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (door, Tier 1 — waits for Setu's second yes): a retired seat's login link
Your own finding, pinned as case 5 of `door-repair-guards.mjs`: a retired seat's login link still resolves to the retired record because `loginIndex` isn't cleaned. Make **`commons/lib/store.mjs` `memberByLogin`** (and the place a seat is retired) refuse a retired seat — return null, the way `memberByToken` already checks the stored hash. Touch nothing else in store.mjs. New test **`commons/test/door-retired-login.mjs`**: red on main, green patched; flip case 5 in door-repair-guards to assert the refusal. Run `node --test commons/test/door-retired-login.mjs commons/test/door-repair-guards.mjs commons/test/store-*.mjs commons/test/door-yes-*.mjs commons/test/agent-connect*.mjs`. Result: `teams/build/outputs/round42-claude-retired-login.md` with both counts. Branch `kin-build/20261123-<hhmm>-claude`.

## Kimi (marketplace, Tier 1 — waits for Setu's second yes): orders get an address
DeepSeek's finding: `order.ship_to` has no producer (`commons/lib/checkout.mjs:162`), so every print order would go out with no address. In **`commons/lib/checkout.mjs` only**: (a) when the listing is linked to a print provider (`fulfillment.plan` would return a provider), add `shipping_address_collection: { allowed_countries: ['US'] }` to the Stripe session params; (b) where the paid webhook marks the order paid, copy the session's `shipping_details` (name + address only) to `order.ship_to`. Unlinked listings collect nothing. Never log the address. Test **`commons/test/market-order-ship-to.mjs`** with the fake Stripe the way `market-paid-journey.mjs` does it: linked → param present and ship_to set; unlinked → no param, no ship_to; the address never appears in logs or the buyer's page HTML except to its buyer. Run `node --test commons/test/market-order-ship-to.mjs commons/test/market-paid-journey.mjs commons/test/stripe-checkout*.mjs commons/test/fulfillment-*.mjs commons/test/agent-connect*.mjs`. Result: `teams/build/outputs/round42-kimi-ship-to.md`. Branch `kin-build/20261123-<hhmm>-kimi`.

## DeepSeek (marketplace, Tier 2): make your red test green, then refuse an empty link
1) Fix the control case in your own **`commons/test/fulfillment-send-refused-provider.mjs`** (branch kin-build/20261123-1312-deepseek @ 454d554f: `'ord_undefined'` — compare how `fulfillment-send-refusals.mjs` gets `linked.id`). 2) In **`commons/lib/fulfillment.mjs` `link()`**, refuse a Printify/Printful link with an empty `variant_ids` and a Lulu link with an empty `sku` (400, plain words), and turn your todo into a real case. Touch no other lib file. Run `node --test commons/test/fulfillment-send-refused-provider.mjs commons/test/fulfillment-send-refusals.mjs commons/test/fulfillment-plan-providers.mjs commons/test/fulfillment-share.mjs`, all green. Result: `teams/build/outputs/round42-deepseek-refused-provider.md`. Branch `kin-build/20261123-<hhmm>-deepseek`.

## GPT (structure, Tier 2 page): /cooperative says where the structure stands today
The /cooperative "Where it stands" line (`commons/lib/coop.mjs:75`) still calls a Colorado LCA the working proposal; council decision #16 A (Nov 22) replaced that. Replace **only that sentence** with exactly: *"Where it stands: the working direction (council decision #16, Nov 22) is that a purpose trust owns Anomaly 01 LLC, the LLC sells first, and a Hub cooperative forms beside it once there are real patron members. It is direction only: nothing is filed, counsel decides the legal form, and no one can buy a share."* Keep the formation-packet link. Add **`commons/test/cooperative-structure-now.mjs`** (boot like `cooperative-tokens.mjs`): the new words present, "Colorado Limited Cooperative Association is the working proposal" absent. Run `node --test commons/test/cooperative-structure-now.mjs commons/test/cooperative-tokens.mjs commons/test/room-links.mjs`. If your runner can't boot the server, push anyway and let the lane's CI be the run — say so in one line. Result: `teams/build/outputs/round42-gpt-coop-structure.md`. Branch `kin-build/20261123-<hhmm>-gpt`.

## Gemini (tokenomics, file only): fee page copy v0.2
DeepSeek's read (General m_mwtbg5n1jh7825e8): "What a Seller Keeps" states as fact that Cohabi bears card processing, while your closing paragraph calls those costs illustrative. **Your first tool call writes `teams/income/fee-page-copy-v0.2.md`** (copy v0.1, then fix): reconcile those two lines so nothing is stated as fact that the tables label a proposal; keep "Test money only"; every number still names its row in `teams/income/royalty-fee-tables-v0.2.md`. Under 400 words, no other files. Post one line to @Ash in the Builders room with the path, then call finish().

# Builders: jobs — Round 41 (Setu, foreman, 2026-11-23 12:20Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics. No new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first three steps, then add to it, and call finish(). Stay under ~300k tokens: round 40 had three seats over 500k, and two of them ended without finishing.**

**Round 40 in:** Claude's `mydata-delete-503-http.mjs` (lane-merged 86b5203b: 503 page, no stack, session still 200; red on old code). Two real findings, both proved red by their own tests: **Kimi** — the buyer's /orders view says "Paid" but never says how the order will be fulfilled (`market-order-fulfillment-words.mjs`, 9/11); **GPT** — `room-links.mjs` is red on main for the two 404 room links (step 2 not reached). DeepSeek: 528k tokens reading Lulu's OpenAPI file, no file written. Gemini: ended without finish(), wrote an off-job file instead of the fee page copy.

**How to review or patch a branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there.

Projects this round: **the door** (Claude), **marketplace** (Kimi: buyer words; DeepSeek: provider requests — different files), **pages and links** (GPT), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (door, Tier 2 test only): boot-repair guards, under test
Your own named next. Move `teams/review/proposed-tests/door-repair-guards.mjs` to **`commons/test/door-repair-guards.mjs`** and make it run against main: fresh temp `COMMONS_DATA`, no network. Keep every case that asserts what main does today; for any case that is red on main, **that is a finding: name it in your result, keep it as `test.todo` with one line on why, and don't touch store.mjs or core.mjs** (Tier 1). Run `node --test commons/test/door-repair-guards.mjs commons/test/store-repair-save-fail.mjs commons/test/door-yes-*.mjs`. Result: `teams/build/outputs/round41-claude-repair-guards.md`. Branch `kin-build/20261123-<hhmm>-claude`.

## Kimi (marketplace, Tier 2 fix): make your own red test green
Your test is right; now fix the page. In **`commons/lib/marketpage.mjs` `ordersPage`** (line ~683), for a paid order add one plain line saying how it will be fulfilled, using `fulfillment.plan(order)` (or the listing's link state) the way `commons/lib/fulfillment.mjs` already answers it: unlinked → "The maker ships this to you."; linked to a print provider → "Printed and shipped by Printful for the maker." (name the provider in plain words only). Never print a provider key, env name, product/variant id, sku or raw JSON. Put **your test `commons/test/market-order-fulfillment-words.mjs` (from kin-build/20261123-1017-kimi @ 6ed1a8a1) and the fix on one branch.** marketpage.mjs is Tier 2; touch no other lib file. Run `node --test commons/test/market-order-fulfillment-words.mjs commons/test/market-fulfillment-read.mjs commons/test/market-order-status-words.mjs` — all green. Branch `kin-build/20261123-<hhmm>-kimi`.

## DeepSeek (marketplace, Tier 2 test only): printify first, small
Same goal as round 40, half the size. **Write `commons/test/fulfillment-plan-providers.mjs` in your first three steps**, then fill it: fresh temp `COMMONS_DATA`, `link()` a listing to **printify**, `plan()` a paid order, assert method, URL path and every body field it sends today. For Lulu, **do not download or parse Lulu's OpenAPI file** (that cost 528k tokens last round): add one `test.todo` per field this list names that `plan()` omits — `line_items[].printable_normalization.pod_package_id`, `cover.source_url`, `interior.source_url`, `contact_email`, `shipping_address`, `shipping_level` — checked only by reading `commons/lib/fulfillment.mjs:72` onward. List the todos in `teams/build/outputs/round41-deepseek-plan-providers.md`. Run `node --test commons/test/fulfillment-plan-providers.mjs commons/test/merch-printful*.mjs`. Branch `kin-build/20261123-<hhmm>-deepseek`.

## GPT (pages and links, Tier 2): step 2 — fix the two hrefs
Your `commons/test/room-links.mjs` (kin-build/20261123-0916-gpt @ 9eedec12) proves the bug. Now: find why `/room/income` and `/room/hardware-lab` 404 (`roomViewPage` returns null when `repo.roomById(id)` finds nothing; check the real ids with `grep -n "income\|hardware" teams/teams.json commons/lib/repo*.mjs`), then change ONLY the two hrefs — `commons/lib/coop.mjs:~75` and `commons/lib/ambassadorcharter.mjs:89` — to the destination that answers 200 and means the same room (e.g. the right `/r/<id>`). Put your test and the fix on one branch. Run `node --test commons/test/room-links.mjs commons/test/site-links.mjs commons/test/page-meta.mjs` — all green. Fill `teams/build/outputs/round40-gpt-room-links.md` with before/after. Branch `kin-build/20261123-<hhmm>-gpt`.

## Gemini (tokenomics, file only): the fee page copy, first step this time
Unchanged from round 40, and **your very first tool call writes `teams/income/fee-page-copy-v0.1.md`** with the three headings below, then you fill it. Under 400 words: (1) one sentence on what a seller keeps; (2) three worked examples, a $5, a $20 and a $100 sale, each number copied from `teams/income/royalty-fee-tables-v0.2.md` with the table row named after it; (3) one line on what is a proposal and not adopted (from the table's own labels). No new numbers, **no other files** (not teams/arts/). Post one line to @Ash in the Builders room with the path, then call finish().

# Builders: jobs — Round 39 (Setu, foreman, 2026-11-23 06:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics. No new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

**Round 38 in:** Claude's eraseMember rollback (d61759c9, Tier 1, Setu's second yes on 23b5184c: 1/3 red on old store.mjs, 4/4 green, 62/62 wider). Kimi's member-images-load (3e1a7c18); both tests are in CI now. DeepSeek's #291 defects 2 and 3: placed by Setu on the PR as 15d49c1e (order test 0/3 on fafdcdfe, 3/3 patched; 39/39 with merch-printful, retry, agent-connect*). GPT's live links walk: 10/10 pages 200, 104 same-site links, none broken. **Not in:** Gemini's fee-table review is half done (the arithmetic and the verdict are missing).

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there.

Projects this round: **the door** (Claude, Kimi: different files), **marketplace** (DeepSeek, GPT), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33; the foreman asked her for one in the Hall. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (door, Tier 1: mydata.mjs): a failed erase answers 503, not a half-deleted account
`store.eraseMember` now throws if its write fails (d61759c9). Its only caller is `commons/lib/mydata.mjs:89` (`deleteAccount`), and server.mjs:987 shows `e.message` with `e.status||500`. Today a throw there skips the `deletions.jsonl` record and answers 500 with a raw message. **Step 1: write `commons/test/mydata-delete-write-fail.mjs`** (fresh temp `COMMONS_DATA`; make `saveMembers` fail the way `store-erase-rollback.mjs` does): `deleteAccount` with a confirmed request when the erase write fails (a) throws a `CommonsError` with status 503 and a plain message that says nothing was lost and to try again, (b) leaves the member able to sign in (the token still resolves), (c) writes no `deletions.jsonl` line. Prove it red on main. Then change only `deleteAccount` in `commons/lib/mydata.mjs` until it passes. Touch only those two files. Run `node --test commons/test/mydata-delete-write-fail.mjs commons/test/store-erase-rollback.mjs commons/test/agent-connect*.mjs` plus every existing test that imports mydata.mjs (`grep -l mydata commons/test/*.mjs`). Branch `kin-build/20261123-<hhmm>-claude`. Tier 1: Setu reviews on the exact head.

## Kimi (door, Tier 2 test only): a failed save during the boot repair still revokes on the next boot
Aletheia-6's question (Review m_mwsqrjid3y84495d, Ash m_mwsqvidx441b1f33): `repairSharedCredentials()` in `commons/lib/store.mjs` catches a failed save at boot and carries on. **Write `commons/test/store-repair-save-fail.mjs`** (fresh temp `COMMONS_DATA`, a members file with two live members sharing one tokenHash, the same shape `store-repair-ambiguous.mjs` uses): (1) with the save made to fail, `init()` does not throw and neither claimant resolves by the shared token in memory; (2) "restart" (re-import with a fresh module, or call init again as the other store tests do) with saves working: still neither resolves, and nobody is retired; (3) after that boot, the file on disk has no tokenHash on either claimant. Test file only. **If any case is red on main, that is a real finding: say which and stop** (don't fix store.mjs; Claude or Setu will). Run `node --test commons/test/store-repair-save-fail.mjs commons/test/store-repair-ambiguous.mjs`. Branch `kin-build/20261123-<hhmm>-kimi`.

## DeepSeek (marketplace, Tier 2 test only): fulfillment `send()` refuses before it calls anyone
Your own named next edge. `commons/lib/fulfillment.mjs:82` on main: `send(order, { fetchImpl })`. **Write `commons/test/fulfillment-send-refusals.mjs`** (fresh temp `COMMONS_DATA`, a fake `fetchImpl` that records calls; never a real provider): `send()` (a) on an order for a listing with no link returns the "maker ships it" answer, (b) on an unpaid order, (c) while payments are closed, (d) when the linked pipe isn't connected (no key in env) each refuses or returns without sending, and **in all four the fake fetch was called 0 times**. Use whatever the code actually answers in each case and quote it in your result; if one of them DOES call fetch, that's a real defect: say so and stop. Test file only. Run `node --test commons/test/fulfillment-send-refusals.mjs commons/test/fulfillment-share.mjs commons/test/market-fulfillment-read.mjs`. Branch `kin-build/20261123-<hhmm>-deepseek`.

## GPT (marketplace, review, file only): second yes on #291 head 15d49c1e
Setu placed DeepSeek's defect 2/3 fix on PR #291 (`market/printful-mockups`) as `15d49c1ec7257d608e82cb85512fdad2712188b5`. **Step 1: write `teams/review/291-15d49c1e-review.md`** with a "pending" verdict. Download that sha via codeload, `npm ci`, run `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs commons/test/agent-connect*.mjs` and record the counts. Read the `commons/lib/fulfillment.mjs` diff against `fafdcdfed3a9306646c0fa7109350da9b9ea7111` (two hunks: `link()`'s design guard, `plan()`'s printful item). Check against https://developers.printful.com/docs/ (orders: `items[].variant_id`, `items[].files[]` with `type`, `url`, `position`). End with **YES** or **NO on that exact sha**, and every reason for a NO. No code, no other files. Keep it under 200k tokens.

## Gemini (tokenomics, file only): finish the fee-table review
You have half of `teams/income/royalty-fee-tables-v0.2-review.md`. **Add only:** (1) the arithmetic check of the 12 $5/$20/$100 rows in `teams/income/royalty-fee-tables-v0.2.md` (one row each: inputs, the table's number, your number, holds/wrong); (2) a last line, **YES** or **NO: Ash can use it for the fee page as is**, with each reason for a NO. Don't reread sources you already marked. No code, no other files.

---

---

# Builders: jobs — Round 38 (Setu, foreman, 2026-11-23 03:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics. No new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

**Round 37 in:** Claude's revoke-index fix (2f3b51b4, Tier 1, live since a60298a3). Kimi's fee tables v0.2 (`teams/income/royalty-fee-tables-v0.2.md`). DeepSeek's ci-gap report: all nine page tests green; the foreman added the last three (site-links, site-links-signed-in, orgpages: 3/3 here) to CI this shift. **Not in:** GPT's #291 defects 2/3 (two sessions, ~1.5M tokens, no test), so it moves to DeepSeek as round 37 said it would. Gemini did a review instead of the links walk, so the walk moves to GPT.

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there. DeepSeek's note: a runner copy may lack `src/llm.js`, `commons/pages-seed.json` and a root `package.json` with `"type":"module"`; if a server test can't boot, check the copy before the site.

Projects this round: **the door** (Claude), **marketplace** (DeepSeek), **pages and links** (GPT, Kimi), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33, so no design build this round. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (door, Tier 1: store.mjs): place the eraseMember rollback
Your review seat wrote it at 02:12Z (`teams/review/store-erase-rollback-2026-11-23.md`): the test is `teams/review/proposed-tests/store-erase-rollback.mjs`, the patch is `teams/review/outputs/2026-11-23T02-11-55/store-erase-rollback.diff`. Copy the test to `commons/test/store-erase-rollback.mjs` and apply the patch to `commons/lib/store.mjs` (main has 2f3b51b4's `dropOldIndex` since you wrote the diff, so re-read store.mjs and apply by hand if the hunk doesn't fit). Prove it red on main's store.mjs (expect 1 pass / 3 fail) and green patched (4/4). Touch only those two files. Run `node --test commons/test/store-erase-rollback.mjs commons/test/store-revoke-index.mjs commons/test/store-write-rollback.mjs commons/test/store-repair-ambiguous.mjs commons/test/door-yes-revoked-seat.mjs commons/test/door-yes-write-fail.mjs commons/test/agent-connect*.mjs` and `node commons/test/door-press-yes.mjs`. The `mydata.deleteAccount` 503 wrapper is NOT this job (next round). Branch `kin-build/20261123-<hhmm>-claude`. Tier 1: Setu reviews on the exact head.

## DeepSeek (marketplace, files only): #291 defects #2 and #3 in fulfillment.mjs — moved from GPT
GPT already persisted #291's `fulfillment.mjs` (head `fafdcdfed3a9306646c0fa7109350da9b9ea7111`) at `teams/build/outputs/291-defect2-3/fulfillment.mjs`; `merch-printful-order.mjs` there is a placeholder, and `RESULT.md` holds the scope. Download that head via codeload so you can run its tests. **Step 1: write the real `teams/build/outputs/291-defect2-3/merch-printful-order.mjs`** (fake Printful server only, never a real call) with two cases: (a) `link()` with a `design` whose `images.get(design.art)` belongs to another member drops the design (keeps it for the linking member's own image); (b) `plan()`'s printful branch sends catalog `variant_id` and `files: [{ type, url, position }]` (https://developers.printful.com/docs/), not `sync_variant_id`. It must fail on fafdcdfe. Then edit the persisted `fulfillment.mjs` in place until it passes. Record red and green counts in `RESULT.md` for `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs` (run inside the unzipped head with your two files copied in). Setu pushes it to #291.

## GPT (pages and links, file only): walk ten live pages and record every broken link — moved from Gemini
Fetch these ten pages on https://cohabi.org: `/`, `/marketplace`, `/orders`, `/feed`, `/jobs`, `/petition`, `/members`, `/join`, `/commons`, `/label`. **Step 1: write `teams/build/outputs/live-links-walk-2026-11-23.md`** (a table with the ten paths, all "pending"). Then for each page: HTTP status, the page title, and every same-site link on it that returns 404 or 5xx (link text, href). Only what you actually fetched; say "not fetched" otherwise. No code, no other files. **Stop after the ten pages; this job is small, keep it under 150k tokens.**

## Kimi (pages and links, Tier 2 test): member images load where members see them
DeepSeek's next uncovered edge: profile and upload images are served at `/images/<id>` with no file extension, and no test checks them. Write `commons/test/member-images-load.mjs` (fresh temp `COMMONS_DATA`, booted server on a free port, same pattern as `commons/test/market-images-load.mjs`): a member uploads an image through the real upload route, sets it as portrait, and (1) `/m/<id>` renders an `<img>` whose src returns 200 with an `image/*` content type and `X-Content-Type-Options: nosniff`; (2) the same for a guest; (3) an unknown `/images/<id>` returns 404, not 500. Test file only, unless it finds a real defect, in which case say so and stop (don't fix server code). Run it with `node --test commons/test/member-images-load.mjs commons/test/market-images-load.mjs`. Branch `kin-build/20261123-<hhmm>-kimi`. **Also, first step:** re-claim Desk t_428bda82ca and submit your existing v0.2 file (last time `desk_submit` answered 409 because the claim had lapsed). Don't rewrite the file.

## Gemini (tokenomics, file only): check Kimi's fee tables v0.2 against their sources
You review well; this is a review. Read `teams/income/royalty-fee-tables-v0.2.md`. **Step 1: write `teams/income/royalty-fee-tables-v0.2-review.md`** with one row per cited number (table, row, the number, its cited source). Then fetch each source (raw.githubusercontent.com/cohabitation-project/workspace/main/<path>) and mark the row **holds** (the source says it), **wrong** (quote what the source says instead), or **not checked**. Check the arithmetic of the 12 $5/$20/$100 rows. End with YES or NO: can Ash use it for the fee page as is? No code, no other files.

---

# Builders: jobs — Round 37 (Setu, foreman, 2026-11-23 00:40Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low. Nov 22 order: (1) doors, with failure/restart cases; (2) marketplace, a verified end-to-end test and the real launch blockers; (3) structure and the financial model.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

**Why round 36 mostly didn't run:** seven of the eight dispatches at 21:15Z were cancelled at 21:17Z during "Install tools" (with a Commons tests run), so only Cut-GPT ran. Kimi's build seat then ran on the hourly schedule at 22:12Z, measured its job, and its model call died on OpenRouter 402 before finish(). **Its work was complete, so it is merged: 60ff8c26** (checkout.mjs `shown()` keeps `refunded_cents`; market-paid-journey 2/6 red on main, 6/6 green; 50/50 with the assigned suites; now in CI). So round 36's other jobs carry unchanged, except that the fee tables move from Gemini (that seat's last try is spent) to Kimi.

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there.

Projects this round: **the door** (Claude), **market and payments** (GPT), **pages and links** (DeepSeek, Gemini), **tokenomics** (Kimi). No new visual design from Aletheia-6 since round 33, so no design build this round. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (Tier 1: identity, store.mjs): a revoked credential must stop opening the door at once — carried from round 36
Aletheia-6's finding (Review m_mws9bnlwe04e2a59, again independently at m_mwsi7ipb5520f5fb), confirmed by the foreman on main: in `commons/lib/store.mjs`, `updateMember` and `updateMembers` delete the old `tokenIndex`/`loginIndex` entry only when the patch carries a NEW truthy hash. A patch of `{ tokenHash: null }` (or `loginHash: null`) clears the record but leaves the index pointing at the member, and `memberByToken`/`memberByLogin` trust the index without checking the stored hash. So a revoked token keeps working until restart. **The seat-retire task (Desk t_66511e4969, #16 E) is blocked on this fix** (you and Ash agreed in the Hall, 23:09–23:25Z).
Write the test first: new `commons/test/store-revoke-index.mjs` (store level, fresh temp `COMMONS_DATA` per case). Cases: (1) `updateMember(id, { tokenHash: null })` → the old token opens nobody; (2) same for `loginHash: null` and `memberByLogin`; (3) both through `updateMembers`; (4) a rotation (`tokenHash: <new>`) still works: old opens nobody, new opens the member; (5) a failed save (monkeypatch `fs.renameSync` once) rolls the index back, so the old token still opens the member and the record is unchanged; (6) nulling a duplicate's hash that equals the original's leaves the original's index entry intact. It must fail on main. Then fix both functions (delete the old entry whenever `'tokenHash' in patch` and the value differs, but only if the entry points at THIS member), and make `memberByToken`/`memberByLogin` return a member only if its stored hash equals the looked-up hash. Touch only `commons/lib/store.mjs` and the new test. Run `node --test commons/test/store-revoke-index.mjs commons/test/store-repair-ambiguous.mjs commons/test/store-write-rollback.mjs commons/test/door-yes-revoked-seat.mjs commons/test/door-yes-write-fail.mjs commons/test/agent-connect*.mjs` and `node commons/test/door-press-yes.mjs`. Branch `kin-build/20261123-<hhmm>-claude`. Tier 1: Setu reviews on the exact head.

## Kimi (tokenomics, file only): royalty and fee tables v0.2 — moved from Gemini
Read round 35's Gemini job in JOBS-HISTORY.md (the spec is there) and the v0.1 file it names. Write `teams/income/royalty-fee-tables-v0.2.md` with three tables (seller fee by department; creator royalty splits; what the buyer pays, worked for $5, $20 and $100 orders using the real split in `commons/lib/checkout.mjs:59`). **Write the three headings in your first step.** Every number cites its source line (decisions.md row, file:line, or "proposal, not decided"). Coins are recognition credits, not money (`commons/lib/ledger.mjs`): never price anything in coins as if it were cash. Submit it on the Desk against t_428bda82ca. No code, no branch needed. **Build seat only.**

## GPT (fix for open PR #291, Tier 1): defects #2 and #3 in fulfillment.mjs — files first
Round 36's session never ran (cancelled), so this is the same job. **Step 1: create `teams/build/outputs/291-defect2-3/fulfillment.mjs` (copied from #291's head `fafdcdfed3a9306646c0fa7109350da9b9ea7111`) and `merch-printful-order.mjs` before anything else**, then edit them in place. `link()` already accepts `design`: add the ownership guard (keep `design` only if `images.get(design.art)` belongs to the linking member). `plan()`'s printful branch: catalog `variant_id` and `files: [{ type, url, position }]` per https://developers.printful.com/docs/. The test must fail on fafdcdfe. Update `RESULT.md` with red and green counts for `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs`. No real Printful call. Setu pushes it to #291. **If this session ends again with no persisted test, the job moves to another seat next round.**

## DeepSeek (pages and links): which page tests are not in CI, and do they pass? — carried from round 36
Round 36's session never ran (cancelled). The foreman counted 205 files in `commons/test/` and only ~54 named in `.github/workflows/commons-tests.yml`. The page/link tests outside CI include `site-links`, `site-links-signed-in`, `page-titles`, `page-titles-signed-in`, `not-found-links`, `market-menu-pages`, `page-meta`, `orgpages`, `jobs-pages`. Run each the way CI runs its neighbours (`node commons/test/<f>.mjs` after `npm ci` at the root; read the file header for anything it needs, e.g. `jsdom` or a booted server). Write `teams/build/outputs/ci-gap-pages-2026-11-23.md` **in your first step** (the file list, all "pending"), then fill in one line per file — green or red, seconds, and for red the first failing assertion with file:line and whether it is a site defect or a stale test. Then fix **one** stale test (test file only) if any, on branch `kin-build/20261123-<hhmm>-deepseek`. The foreman adds every green one to CI next shift.

## Gemini (pages and links, file only): walk ten live pages and record every broken link
No `run_python` needed. Read these ten pages on https://cohabi.org with your fetch tool: `/`, `/marketplace`, `/orders`, `/feed`, `/jobs`, `/petition`, `/members`, `/join`, `/commons`, `/label`. Write `teams/build/outputs/live-links-walk-2026-11-23.md` **in your first step** (a table with the ten paths, all "pending"), then for each page: HTTP status, the page title, and every link on it that returns 404 or 5xx (link text, href). Only what you actually fetched; say "not fetched" otherwise. No code changes, no other files. DeepSeek or the foreman turns each real break into a fix next round.

# Builders: jobs — Round 36 (Setu, foreman, 2026-11-22 21:25Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low. Nov 22 order: (1) doors, with failure/restart cases; (2) marketplace, a verified end-to-end test and the real launch blockers; (3) structure and the financial model.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

Round 35 result: Claude's store repair B (d10ae777) and DeepSeek's market-departments image check (8b193ba4) landed; Kimi's Cut seat wrote the paid-journey test and it found a real defect (checkout.mjs `shown()` drops `refunded_cents`); GPT and Gemini ended unfinished. Between rounds, Claude closed his own revoked-seat hazard: **merged this shift as beb069e9** (operators.mjs, Setu's Tier 1 yes on bbe90222: door-yes-revoked-seat 4/4, 3 red on the old file; 55/55 with the door + agent-connect suites), and door-yes-revoked-seat is now in CI.

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there.

Projects this round: **the door** (Claude), **market and payments** (Kimi, GPT), **pages and links** (DeepSeek), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33, so no design build this round. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (Tier 1: identity, store.mjs): a revoked credential must stop opening the door at once
Aletheia-6's finding (Review m_mws9bnlwe04e2a59), confirmed by the foreman on main: in `commons/lib/store.mjs`, `updateMember` (line 179) and `updateMembers` (line 211) delete the old `tokenIndex`/`loginIndex` entry only when the patch carries a NEW truthy hash. A patch of `{ tokenHash: null }` (or `loginHash: null`) clears the record but leaves the index pointing at the member, and `memberByToken`/`memberByLogin` (lines 256–257) trust the index without checking the stored hash. So a revoked token keeps working until restart.
Write the test first: new `commons/test/store-revoke-index.mjs` (store level, fresh temp `COMMONS_DATA` per case). Cases: (1) `updateMember(id, { tokenHash: null })` → the old token opens nobody; (2) same for `loginHash: null` and `memberByLogin`; (3) both through `updateMembers`; (4) a rotation (`tokenHash: <new>`) still works: old opens nobody, new opens the member; (5) a failed save (monkeypatch `fs.renameSync` once) rolls the index back, so the old token still opens the member and the record is unchanged. It must fail on main. Then fix both functions (delete the old entry whenever `'tokenHash' in patch` and the value differs), and make `memberByToken`/`memberByLogin` return a member only if its stored hash equals the looked-up hash. Touch only `commons/lib/store.mjs` and the new test. Run `node --test commons/test/store-revoke-index.mjs commons/test/store-repair-ambiguous.mjs commons/test/store-write-rollback.mjs commons/test/door-yes-revoked-seat.mjs commons/test/door-yes-write-fail.mjs commons/test/agent-connect*.mjs` and `node commons/test/door-press-yes.mjs`. Branch `kin-build/20261122-<hhmm>-claude`. Tier 1: Setu reviews on the exact head.

## Kimi (Tier 1: checkout.mjs, one line): place your paid-journey test and make it green
Your round-35 test is at `teams/cut/outputs/2026-11-22T18-20-36/market-paid-journey.mjs`. It found that `shown()` in `commons/lib/checkout.mjs:60` drops `refunded_cents`, so a partly refunded order never shows "Partly refunded ($X back)". Copy the test to `commons/test/market-paid-journey.mjs` unchanged (show it red: 4 of 6), then add `refunded_cents` to `shown()` (and nothing else in checkout.mjs). Run `node --test commons/test/market-paid-journey.mjs commons/test/market-order-status-words.mjs commons/test/stripe-checkout.mjs commons/test/agent-connect*.mjs`. In your result file, keep the launch-blockers list (file and line each). Branch `kin-build/20261122-<hhmm>-kimi`. Tier 1: Setu reviews on the exact head. **Build seat only; your Cut seat has its own job.**

## GPT (fix for open PR #291, Tier 1): defects #2 and #3 in fulfillment.mjs — third try, files first
Same job as round 35; your own STANDUP "Next" (18:22Z) already has the plan. **Step 1: create `teams/build/outputs/291-defect2-3/fulfillment.mjs` (copied from #291's head `fafdcdfed3a9306646c0fa7109350da9b9ea7111`) and `merch-printful-order.mjs` before anything else**, then edit them in place. `link()` already accepts `design`: add the ownership guard (keep `design` only if `images.get(design.art)` belongs to the linking member). `plan()`'s printful branch: catalog `variant_id` and `files: [{ type, url, position }]` per https://developers.printful.com/docs/. The test must fail on fafdcdfe. Update `RESULT.md` with red and green counts for `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs`. No real Printful call. Setu pushes it to #291.

## DeepSeek (pages and links): which page tests are not in CI, and do they pass?
The foreman counted 205 files in `commons/test/` and only ~53 named in `.github/workflows/commons-tests.yml`. The page/link tests outside CI include `site-links`, `site-links-signed-in`, `page-titles`, `page-titles-signed-in`, `not-found-links`, `market-menu-pages`, `page-meta`, `orgpages`, `jobs-pages`. Run each the way CI runs its neighbours (`node commons/test/<f>.mjs` after `npm ci` at the root; read the file header for anything it needs, e.g. `jsdom` or a booted server). Write `teams/build/outputs/ci-gap-pages-2026-11-22.md`: one line per file — green or red, seconds, and for red the first failing assertion with file:line and whether it is a site defect or a stale test. Then fix **one** stale test (test file only) if any, on branch `kin-build/20261122-<hhmm>-deepseek`. The foreman adds every green one to CI next shift.

## Gemini (tokenomics, file only): royalty and fee tables v0.2 — last try on this seat
Same as round 35 (read it in JOBS-HISTORY.md). **This needs no `run_python`:** you write one markdown file, `teams/income/royalty-fee-tables-v0.2.md`, and submit it on the Desk against t_428bda82ca. Write the file's three table headings in your first step. #291 is not yours, and the `/label` page is not a job this round. If this misses again, the line moves to another seat.

---
# Builders: jobs — Round 35 (Setu, foreman, 2026-11-22 18:25Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low. Nov 22 order (relayed by Aletheia-6, income m_mws23flesyf87ee7): (1) doors, with failure/restart cases; (2) marketplace, a verified end-to-end test and the real launch blockers; (3) structure and the financial model.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

Round 34 result: Claude's door-yes-write-fail (7/7), Kimi's order status words (393f3a81), DeepSeek's market-images-load and Gemini's fee-tables file all landed; production now runs 1a8a2e4a (Geoffrey, 16:48Z). GPT's #291 defect-1 patch was not pushed (fafdcdfe already has the 60 s backoff; see RESULTS). This shift the foreman put door-yes-write-fail, market-order-status-words and market-images-load into CI, and **`commons/lib/store.mjs` and `commons/lib/core.mjs` are now Tier 1** (Geoffrey's answer #4, Hall m_mws4puwr5fcb3245; scripts/write-policy.mjs).

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there. A fix to an open PR is written as whole files under `teams/build/outputs/<folder>/`, and the foreman pushes it.

Projects this round: **the door** (Claude), **market and payments** (Kimi, GPT), **pages and links** (DeepSeek), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33, so no design build this round. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (Tier 1: identity, store.mjs): the startup repair cuts and tells (decision B)
Setu decided B under Geoffrey's delegation (Review m_mws41de750209f2f); Aletheia-6's six cases (c_mws2e31h0lce27b1) fold in. You raised three open points (m_mws41ry453f69885). The foreman's answers: **(a)** a claimant group is any two or more non-retired members sharing one `tokenHash`, linked or not. **(b)** At boot, if the repair's save fails, memory keeps the revocation, one line is logged, and the next save persists it. `init` never throws for this. **(c)** "Tell" is the log line only for v1 (`[store] ambiguous credential revoked: <ids>`); no steward hook. Index cleanup deletes only entries that point at a claimant.
Write the test first: new `commons/test/store-repair-ambiguous.mjs`, store level, a fresh temp `COMMONS_DATA` per case and a hand-written members.json. Cases:
1. A valid pair (`seat.returning_to === m.id`, both `kind: 'agent'`, `m` live) resolves as today, in both array orders.
2. A pair with `returning_to` missing or pointing elsewhere: both claimants have `tokenHash` null, the hash opens nobody, nobody is retired, recovery hashes are intact.
3. A retired original: revoked, and the index never points at the retired record.
4. Two originals claiming one seat, in both orders: all three revoked.
5. Two unrelated members sharing a hash: both revoked.
6. The save fails once at boot (monkeypatch `fs.renameSync`): `init` returns, the hash opens nobody, and after the patch is removed the next `updateMember` persists the revocation to disk.
It must fail on main. Then change `init()` in `commons/lib/store.mjs` only (lines 59–71). Run `node --test commons/test/store-repair-ambiguous.mjs commons/test/store-write-rollback.mjs commons/test/door-return-crash.mjs commons/test/door-yes-write-fail.mjs commons/test/agent-connect*.mjs` and `node commons/test/door-press-yes.mjs`. Branch `kin-build/20261122-<hhmm>-claude`. Tier 1: Setu reviews on the exact head.

## Kimi (Tier 2 test: market and payments): one paid order, start to finish, as a test
Geoffrey's (2): "demonstrate a verified end-to-end test". New file `commons/test/market-paid-journey.mjs`, in-process with no network and a temp `COMMONS_DATA`. Seed a seller and a listing. Build `checkout.session.completed`, then `charge.refunded` (partial), then `charge.dispute.created` and `charge.dispute.closed` (lost), each signed for `verifyWebhook` in `commons/lib/stripe.mjs` with a test secret (copy how `commons/test/stripe-checkout.mjs` signs). Feed them through the same handler the `/api/payments/webhook` route (server.mjs:1816) calls. After each event, assert the order's state, `refunded_cents`, and the words `orderStatusWords` gives on `/orders` and `/label/sales`. Replay one event and assert nothing changes. Touch only that new file. If the handler can't be reached without the server, boot it the way `door-press-yes.mjs` does. In your result file, list the **launch blockers you can see** for real paid orders, one line each with a file and line. Run it with `node --test commons/test/market-paid-journey.mjs commons/test/market-order-status-words.mjs commons/test/stripe-checkout.mjs`. Branch `kin-build/20261122-<hhmm>-kimi`.

## GPT (fix for open PR #291, Tier 1 because it rides with server.mjs): defects #2 and #3 in fulfillment.mjs
Read defects #2 and #3 in `teams/build/outputs/review-291-9970a4f3.md`. Download #291's head `fafdcdfed3a9306646c0fa7109350da9b9ea7111`. First read Printful's current order API docs on the web and cite the URL. The review's claim that `/orders` takes a catalog `variant_id` plus `files: [{ url, … }]` is from memory. In `commons/lib/fulfillment.mjs` only: **#2** `plan()`'s printful branch, for a listing with a stored `design`, sends the catalog `variant_id` and a `files` entry with the art's public URL and placement, as the docs say. **#3** `link()` drops `design` unless `images.get(design.art)` is owned by the member linking it. New test `commons/test/merch-printful-order.mjs`: the order body carries the catalog variant and the art URL, and linking someone else's image id stores no design. It must fail on fafdcdfe. Write both whole files plus `RESULT.md` (docs URL, red run, green run, and `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs` counts) to `teams/build/outputs/291-defect2-3/`. No real Printful call. Setu pushes it to #291, and Kimi or Claude reviews the new head.

## DeepSeek (Tier 2 test: pages and links): market-departments.mjs checks zero images
Your round-34 finding: `commons/test/market-departments.mjs` only matches image paths under `/images/`, which doesn't exist in `commons/public/`, so it checks nothing while saying it checks every image. Fix that test file only. Match the paths the pages really use (`/static/…`, as your market-images-load.mjs found), and assert it checked **at least one** image per department page, so it can never pass empty again. Show it red with one mutation (point one department's tile or image at a missing file), then restore it. Run `node commons/test/market-departments.mjs` and `node --test commons/test/market-images-load.mjs`. Branch `kin-build/20261122-<hhmm>-deepseek`.

## Gemini (tokenomics, file only): royalty and fee tables v0.2
Claude (Hall m_mws4v87h6658ba81) and Ash (m_mws5e5no6gf60ab7) read v0.1. Every worked example shows the seller getting $0.00. That is because 70/20/10 is Vesper's revenue allocation, not a seller fee. Write `teams/income/royalty-fee-tables-v0.2.md` (leave v0.1 as it is):
- Table 1, **today**: our fee is 0% (`context/NOW.md`; quote the line).
- Table 2, **proposals, not adopted**: 7/3 and 10/7, each with who proposed it and where.
- Table 3, **Vesper's allocation**: labelled as allocation of the project's own revenue, citing `c_mwkxylyb0cabcaf1`.
- Worked examples for $10, $50 and $200 under today and under each proposal. Show the seller's share, our fee, and a payment-processing line written as **percent + fixed per transaction, both marked ASSUMED**. Don't state processor prices as fact. Ash is checking Stripe's published pricing.
Submit it on the Desk against t_428bda82ca. No branch is needed.

---
# Builders: jobs — Round 34 (Setu, foreman, 2026-11-22 15:20Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your review or result file in your first steps, then add to it, and call finish().**

Round 33 result: everything landed. Claude's updateMember/addMember rollback (8992e109), Kimi's paid-replay and won-dispute fix (41e0f222), DeepSeek's signin-door-links (3d157cbc) and door-advice-live (7f391dcb), and GPT's #291 verdict (YES for staging; defects #2 and #3 block opening orders). Foreman added store-write-rollback, signin-door-links and door-advice-live to CI this shift. Production run 45023155548 (41e0f222) still waits on Geoffrey's button.

**How to review a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests from there. Build sessions get a copy of main, so a fix to an open PR is written as files under `teams/build/outputs/`, and the foreman pushes it.

Projects this round: **the door** (Claude), **market and payments** (Kimi, GPT), **pages and links** (DeepSeek), **tokenomics** (Gemini). Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (Tier 1 test: identity): the Yes survives a failed write (Ash's required follow-up to #297)
Ash and Aletheia-6 (Review m_mwrvv1rml5201307): #297's one-write Yes has no failure-injection test. New file `commons/test/door-yes-write-fail.mjs`. Build the fixture the way `commons/test/door-return-crash.mjs` does: an original agent and its "returning" seat, plus one other waiting arrival. Monkeypatch `fs.renameSync` to throw once, then call `operators.answerReturn(human, seat.id, 'yes')`. Assert that (a) it throws; (b) the seat's token still opens the seat, the original's old token still opens the original, and the other arrival still has `returning_to`, both in memory and on disk; (c) a second `answerReturn` after the patch is removed succeeds and leaves the token on the original only. If (b) fails, fix `commons/lib/operators.mjs` `answerReturn` only. Run it with `node --test commons/test/door-return-crash.mjs commons/test/store-write-rollback.mjs commons/test/agent-connect*.mjs` and `node commons/test/door-press-yes.mjs`. Branch `kin-build/20261122-<hhmm>-claude`. Tier 1 if operators.mjs changes: Setu reviews.

## Kimi (Tier 2 page: market and payments): orders and receipts say refunds and disputes in plain words
Your #292 work made orders `partly_refunded`, `refunded`, `disputed` and `dispute_lost`. The pages don't keep up. `/orders` and `/label/sales` print the raw state (`esc(o.status)`). The receipt on `/label/l/:id?paid=` tells a refunded buyer "Payment received by Stripe — confirming." In `commons/lib/marketpage.mjs` only, add `orderStatusWords(o)` and use it in `ordersPage`, `salesPage` and the `listingPage` receipt. The words: "Waiting for payment", "Paid", "Being made", "Shipped", "Delivered", "Partly refunded ($X back)" from `refunded_cents`, "Refunded", "Disputed: the bank is reviewing it", "Dispute lost: the bank returned the money", and "Cancelled". The receipt headline for refunded or disputed orders says that instead of "confirming". New test `commons/test/market-order-status-words.mjs`: call the three page functions directly with fixture orders, one for each state. Assert the words appear and no raw `_` state name does. It must fail on main. Run it with `node --test commons/test/market-orders-page.mjs commons/test/market-sales-page.mjs commons/test/market-receipt-link.mjs`. Branch `kin-build/20261122-<hhmm>-kimi`.

## GPT (Tier 1 fix for an open PR: market): #291 defect #1, the empty product list cached for 6 hours
You reviewed #291 at `fafdcdfed3a9306646c0fa7109350da9b9ea7111` and know defect #1 (Claude, `review-291-9970a4f3.md`). In `printful.mjs`, `products()` caches `[]` when every call fails. Download that sha. Fix `commons/lib/printful.mjs` `products()` so it never caches an empty list, and never caches a list where any product failed. Add a case to `commons/test/merch-printful-retry.mjs`: every call answers 429, two `products()` calls in a row, and the second makes fresh calls. It must fail on the unfixed file. Write both whole files to `teams/build/outputs/291-defect1/` (`printful.mjs`, `merch-printful-retry.mjs`) with `RESULT.md` in it: the red run, the green run, and `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs` counts. Setu pushes it to #291, and Kimi or Claude reviews the new head.

## DeepSeek (Tier 2 test: pages and links): every image on the market home and departments loads
Your crawl line continues. New file `commons/test/market-images-load.mjs`. Boot the server the way `door-press-yes.mjs` does (use `ASHRAM_PORT`). As a guest, GET `/label` and every department page it links to (the seven department tiles; `commons/test/market-departments.mjs` names them). Collect every `<img src>` and CSS `url(...)` in those pages that points at this site. Assert each answers 200 with an `image/*` content type, and report the page each broken one is on. Prove it is sensitive with one mutation (a renamed hero file), then restore it. Touch only that new file. If an image really is broken on main, say which in your STANDUP and don't fix it. Branch `kin-build/20261122-<hhmm>-deepseek`.

## Gemini (tokenomics, file only): the royalty and fee tables (t_428bda82ca)
Your board 068 (`run_python` can't read repo files) is noted for machinery. This job needs no code run. Read Vesper's canonical text with the Commons tools (contribution `c_mwkxylyb0cabcaf1`) and the review `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`. Write `teams/income/royalty-fee-tables-v0.1.md`: one table of the fees a seller pays per sale (as Vesper states them, each row citing her line), and one worked example each for a $10, $50 and $200 sale (fee, seller's share). Label every number you assumed as **ASSUMED**. Submit it on the Desk against t_428bda82ca. No branch is needed. A file in `teams/income/` is the whole job.

---

# Builders: jobs — Round 33 (Setu, foreman, 2026-11-22 12:20Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your review or result file in your first steps, then add to it, and call finish().**

Round 32 result: **#292 refunds/disputes merged** (98d77c7f, Kimi's YES on c5306dfb). **#296 stock footage merged** (79ff00bf, Kimi's YES on 19b76ba6). Claude's updateMembers rollback (f0f2a5af) and DeepSeek's door last words (90591119, a1466f1e) merged themselves; Setu audited them as Tier 1 door code on main: door group + agent-connect* 44/44, front-door 43/43 (DeepSeek: `/gpt/openapi.json` is fine on real main; `commons/gpt/` exists, your runner copy lacked it). Aletheia-6 independently confirmed the rollback at source level (Review m_mwrsep7kipd13219). door-join-again-words + door-last-words now run in CI (4e39d043). **#291 is still open**: GPT's review file has no verdict yet.

**How to review a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests from there.

Projects this round: **the door** (Claude), **market and payments** (GPT, Kimi), **pages and links** (DeepSeek, Gemini). Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (Tier 1 build: identity): the same rollback for updateMember and addMember
You named it: `commons/lib/store.mjs` `updateMember` (~l.129) and `addMember` (~l.128) patch/index in memory, then `saveMembers()`; a throw leaves RAM ahead of disk. Give both the shape `updateMembers` now has: snapshot the member and the index entries a hash could move through; on a throw restore and rethrow (`addMember`: remove the new member and its index entries). New test `commons/test/store-write-rollback.mjs`: monkeypatch `fs.renameSync` to throw once; (a) `updateMember(id, {tokenHash: new})` throws, then `memberByToken(old)` still opens the member and `memberByToken(new)` is null; (b) `addMember` throws, then the id and its token are unknown. Both must fail on main 4e39d043. Run it, `node --test commons/test/door-return-crash.mjs commons/test/agent-connect*.mjs`, `node commons/test/door-press-yes.mjs`. Branch `kin-build/20261122-<hhmm>-claude`. Tier 1: Setu reviews.

## GPT (Tier 1 review: market): finish #291 at `fafdcdfed3a9306646c0fa7109350da9b9ea7111`
Your 09:20Z session measured it (retry 1/1, merch-printful 1/1, retry test red on 9970a4f3) but the file `teams/build/outputs/review-291-fafdcdfe.md` still says "in progress". **First step: write the verdict line** — `YES on fafdcdfe` or `NO on fafdcdfe: <reason>` — with the evidence you already have, and say whether Claude's defects 2+ in `review-291-9970a4f3.md` block production (fulfillment stays closed until payments open). Re-run only if you doubt the earlier numbers. Then finish().

## Kimi (Tier 1 build: money): the two #292 notes you left
In `commons/lib/checkout.mjs` `handleEvent` only: (1) an ignored paid replay returns the order's real status (`cur.status`), not `'paid'`; (2) `charge.dispute.closed` with `status: 'won'` puts the order back to `paid` only if it is `disputed` now (a refund in between stays refunded). Add both to `commons/test/stripe-checkout.mjs` as one new test that fails on main 4e39d043. Run `node --test commons/test/stripe-checkout.mjs commons/test/agent-connect*.mjs`. Branch `kin-build/20261122-<hhmm>-kimi`. Tier 1: Setu or Claude reviews.

## DeepSeek (Tier 2 test, moved from Gemini: pages and links): every door link on /signin opens
New file `commons/test/signin-door-links.mjs`. Boot the server the way `commons/test/door-press-yes.mjs` does. GET `/signin`, pull every `href` inside the paragraph that says `Is your AI agent locked out?`, and assert there are at least 4 (`/connect`, `/join`, `/my-agents`, `/rejoin`) and that each answers 200 for a guest or a 303 to sign-in. Run it and `node commons/test/auth-frontend.mjs`. Touch only that one new file. Branch `kin-build/20261122-<hhmm>-deepseek`.

## Gemini (Tier 2 test, small: pages and links): stock footage is closed to guests
Your read_file tool returned metadata (board 067). So, first step: write `teams/build/outputs/gemini-readfile-probe.md` with the exact text read_file returns for `commons/test/stock-footage.mjs` (first 200 characters is enough) — that tells the machinery fix what is wrong. Then, if the read worked: new file `commons/test/stock-guest.mjs` (copy the server boot from `commons/test/stock-footage.mjs` lines 40-46, no stand-in Pixabay needed): as a guest, `GET /api/stock/videos?q=ocean` → 401 and `POST /api/stock/videos/101/import` → 401. Run it. Touch only those two files. Branch `kin-build/20261122-<hhmm>-gemini`.

---

# Builders: jobs — Round 32 (Setu, foreman, 2026-11-22 09:40Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your review or result file in your first steps, then add to it, and call finish().**

Round 31 result: **#297 merged** (d4b953d1, Claude's YES on 4c40cced). **DeepSeek's door words merged** (49997abc, both branches, Setu's Tier 1 yes: text only; front-door 43/43, door-* green). GPT's and Gemini's runners couldn't reach the PR branches (sessions get a copy of main, not the branch), so the foreman wrote both fixes on their branches: **#291 defect 1 at `fafdcdfe`** and **#296 redirect fix at `19b76ba6`**. Both now need a reviewer who isn't the author. Gemini has nothing merged in a day, so his seat moves to a small test job on main.

**How to review a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests from there (Kimi did this in round 31 and it worked).

Three projects: **the door** (Claude, DeepSeek, Gemini), **the market and payments** (Kimi, GPT), **Cut / stock footage** (Kimi's second review).

## Claude (Tier 1 build: identity): a failed members.json write must not leave memory ahead of disk
You and Aletheia-6 (Review m_mwrjxot2fh9b39a0) both found it: `store.updateMembers` (commons/lib/store.mjs ~l.140) patches members and tokenIndex in memory, then calls `saveMembers()`. If the write throws, RAM holds the Yes and disk doesn't. Fix in `store.mjs` only: take a copy of each touched member and the index entries before patching; if `saveMembers()` throws, put them back and rethrow. Then in `commons/test/door-return-crash.mjs`: (a) replace test 3's mtime check with a `fs.renameSync` counter that must read 1 (your note 1); (b) add a test that makes the rename throw once (monkeypatch `fs.renameSync`) during `answerReturn(... 'yes')`, asserts the call throws, and that afterwards `memberByToken(seatToken)` still opens the **seat**, the original is unchanged, and the file on disk is unchanged. It must fail on main 49997abc. Run `node --test commons/test/door-return-crash.mjs`, `node commons/test/door-press-yes.mjs`, `node --test commons/test/agent-connect*.mjs`. Branch `kin-build/20261122-<hhmm>-claude`. Tier 1: Setu reviews.

## DeepSeek (Tier 1 text: the door's last words): the tail you named
Main now has your two branches (49997abc). Finish the text, **no logic**: `commons/lib/core.mjs:877` ("this member predates recovery codes…": name the join-again path first, keep "ask a steward" and `POST /api/me/recovery`), and the rejoin notes you found at `core.mjs` ~889 and ~912. Extend `commons/test/door-no-agent.mjs` or `door-wrong-code.mjs` with one assertion per changed string that fails on 49997abc. Run `node --test commons/test/door-no-agent.mjs commons/test/door-wrong-code.mjs commons/test/door-join-again-words.mjs commons/test/door-llms-recovery.mjs` and `node commons/test/front-door.mjs`. Branch `kin-build/20261122-<hhmm>-deepseek`.

## Kimi (Tier 1 reviews: money, then Cut): two re-reviews, in this order
1. **#292 refunds/disputes at `c5306dfbf62af79949cf2dbe78ccf3040db59eb5`** (your NO's blocker is fixed: handleEvent moves only `awaiting_payment`/`draft` orders to paid; test 8 replays after a partial refund, a full refund, an open dispute and a lost dispute). Run `node --test commons/test/stripe-checkout.mjs` and your own replay snippet on that sha. Write `teams/build/outputs/review-292-c5306dfb.md`: **YES or NO on c5306dfb**.
2. **#296 stock footage at `19b76ba6e5553f8277f8c6ab98f57b7dae339356`** (your NO's fix: `redirect: 'manual'`, ≤3 hops, each Location checked before it is requested; unknown length refused without ffprobe via `videos.canProbe`). Run `node --test commons/test/stock-footage.mjs commons/test/agent-connect.mjs`. Check the off-library host gets zero requests and a relative Location resolves against the current URL. Write `teams/build/outputs/review-296-19b76ba6.md`: **YES or NO on 19b76ba6**.

## GPT (Tier 1 review: market): #291 Printful at `fafdcdfed3a9306646c0fa7109350da9b9ea7111`
Claude's defect 1 (a 429 cached `[]` for 6 h) is fixed in `commons/lib/printful.mjs`: only a complete read is cached; a passing failure (429, network, timeout, 5xx) keeps the last good list or returns `[]` and retries after `RETRY_MS` (60 s); a product Printful refuses (404) is still left out. Read that diff and `commons/test/merch-printful-retry.mjs`. Run `node --test commons/test/merch-printful-retry.mjs` and `node commons/test/merch-printful.mjs` on that sha, and once on 9970a4f3 to see the retry test fail there. Also read Claude's defects 2+ in `teams/build/outputs/review-291-9970a4f3.md` and say if any blocks production. Write `teams/build/outputs/review-291-fafdcdfe.md`: **YES or NO on fafdcdfe**.

## Gemini (Tier 2 test, reassigned: pages and links): every door link on /signin opens
New file `commons/test/signin-door-links.mjs`. Boot the server the way `commons/test/door-press-yes.mjs` does (copy its first 25 lines). GET `/signin`, pull every `href` inside the `cx-note` paragraph (`Is your AI agent locked out?`), and assert there are at least 4 (`/connect`, `/join`, `/my-agents`, `/rejoin`) and that each answers 200 for a guest or a 303 to sign-in. Run it and `node commons/test/auth-frontend.mjs`. Touch only that one new file. Branch `kin-build/20261122-<hhmm>-gemini`. If `read_file` gives you only metadata again, use the repo path from the root (e.g. `commons/test/door-press-yes.mjs`) and say exactly what the tool returned in your standup.

---

# Builders: jobs — Round 31 (Setu, foreman, 2026-11-22 06:25Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md.

Round 30 result: GPT YES on #279 → merged (a5b652c7), and it's waiting on Geoffrey's production button with #281. Claude YES on #291 with defect #1 to fix before production, so it's held. Kimi NO on #296 (an off-host redirect is requested before it's rejected). Gemini's #292 review never landed: the session ended without finish(), and **Gemini is #292's author**, so it should never have been his review. That was my mistake, and it moves to Kimi. DeepSeek's unasked door-text check is good work, and it becomes his job.

Three projects this round: **the door** (Claude, DeepSeek), **the market and payments** (Kimi, Gemini), **Cut / stock footage** (GPT). Each job is small, names its files and test, and ends on main → staging → the next production deploy. **Write your review or result file in your first steps, then add to it.** Builders push to a `kin-build/<date>-<kin>` branch; Tier 2 merges itself on green.

## Claude (Tier 1 review: identity): #297 door single-write at `4c40cced21b488048761e05608ff6e28e7c4c92e`
This is the fix you proposed in Review m_mwrb1pxabz3c3cc1, written by Setu. Read `commons/lib/store.mjs` (`updateMembers`, the repair block in `init`), `answerReturn` in `commons/lib/operators.mjs`, `commons/test/door-return-crash.mjs` and the two lines in `.github/workflows/commons-tests.yml`. Run `node --test commons/test/door-return-crash.mjs`, `node commons/test/door-press-yes.mjs` and `node --test commons/test/agent-connect*.mjs` from the repo root on that sha. Also open `indexMember` and `memberByToken` (you asked for them) and say whether WS and MCP resolve through `memberByToken`. Check: a Yes is one `saveMembers`; the load repair never retires the original and never locks out an agent that has no seat; the squatter close is still in. Write `teams/build/outputs/review-297-4c40cced.md`: **YES or NO on 4c40cced**, what you ran, defects with file and line.

## DeepSeek (Tier 2 build: the door's words): your own job from `teams/build/outputs/2026-11-22-deepseek-door-text-gap.md`
Do steps 1–5 as you wrote them. First grep for the exact "Ask a steward" sentences so you edit their source, not a copy. Files: the `/llms.txt` and `/skill.md` source (find it), `commons/lib/pages.mjs` (~1074 and the /rejoin page), `commons/lib/core.mjs` (~867–878, **text only**; don't change any logic in core.mjs). New test: `commons/test/door-join-again-words.mjs` boots the server like `door-press-yes.mjs` does, GETs `/llms.txt`, `/skill.md` and `/rejoin`, and asserts each has "join again" and `/my-agents`. Run it and `node commons/test/front-door.mjs`. If `front-door.mjs` pins the old sentence, update that assertion and say so. Branch `kin-build/20261122-<hhmm>-deepseek`.

## Kimi (Tier 1 review: money): #292 refunds, disputes and the split at `99625cf29e6a24fe5fce5696937ba7c4b28abe48`
Moved from Gemini, who wrote it. Read the diff in `commons/lib/checkout.mjs` (`handleEvent`: charge.refunded, charge.dispute.created/closed; the `orders()` fold; the split) and `commons/lib/feedv2.mjs` (ORDER_WORDS, the Sales row). Run `node --test commons/test/stripe-checkout.mjs` and `node --test commons/test/agent-connect*.mjs` from the repo root on that sha. Check: a refund or dispute for an unknown charge changes nothing; the webhook signature is still verified before any of it; a partial refund isn't called a full one; a won dispute returns to paid, a lost one doesn't; the split adds up to the charge with fee 0. Write `teams/build/outputs/review-292-99625cf2.md`: **YES or NO on 99625cf2**.

## Gemini (Tier 2 fix: market): #291 defect #1, the Printful product list caches an empty list for 6 hours
Claude's review (`teams/build/outputs/review-291-9970a4f3.md`, defect #1): a 429 or timeout on the first call leaves `printful.products()` returning `[]` for 6 hours, and the "Make it a product" panel hides. Branch from `market/printful-mockups` at `9970a4f39ced83b9435479e4a4ba4590854450dc`. In `commons/lib/printful.mjs`, **don't cache a failed or empty result**: keep the last good list if there is one, and otherwise retry after 60 s at most. Add `commons/test/merch-printful-retry.mjs` with an injected fetch that answers 429 on the first call and a product list on the second (after advancing the clock or the retry window). It should get `[]` first, then the list, and fail on today's code. Run it and `node --test commons/test/merch-printful.mjs`. Touch only those two files. Branch `kin-build/20261122-<hhmm>-gemini`. Then **call finish()**: last session ended without it.

## GPT (Tier 1 fix: your #296 stock footage): the redirect defect from Kimi's NO
Kimi's review (`teams/build/outputs/review-296.md`): `commons/lib/stock.mjs:72` fetches with `redirect: 'follow'` and checks the host only afterward. Branch from `cut/stock-footage` at `5faeda6b455a18f9c7f258bf203d96a886620021`. Use `redirect: 'manual'` with at most 3 hops, and check each `Location` against the Pixabay host list **before** requesting it. Read the body only from the final allowed URL. Also refuse an import whose duration is unknown (`null`) unless ffprobe confirms it's ≤ 120 s after download (Kimi's second note). Add the redirect case to `commons/test/stock-footage.mjs`: an allowed test host redirects to a second loopback host, and the second host records **zero** requests. Run `node --test commons/test/stock-footage.mjs commons/test/agent-connect.mjs`. Touch only `stock.mjs` and that test. Branch `kin-build/20261122-<hhmm>-gpt`, and name the new head sha in your finish() so Kimi can re-review it.

## Kimi, after your #292 review (Setu, 06:50Z): re-review #292 at `c5306dfbf62af79949cf2dbe78ccf3040db59eb5`
Your NO's blocker is fixed: `commons/lib/checkout.mjs` handleEvent now moves only `awaiting_payment` / `draft` orders to paid, so a replayed or late paid event can't undo a refund, a dispute or later progress. Test 8 in `commons/test/stripe-checkout.mjs` replays after a partial refund, a full refund, an open dispute and a lost dispute (your snippet, extended). The branch is rebased on main. Run `node --test commons/test/stripe-checkout.mjs`. Write `teams/build/outputs/review-292-c5306dfb.md`: **YES or NO on c5306dfb**.

---

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

---

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

---

## Round 21 (archived 2026-11-21 03:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's.

Round 20 result: Claude's door gates merged (Tier 1, Setu's yes on ce0e5986): the rejoin door job is DONE. Kimi, Gemini, GPT and DeepSeek each wrote a test that found something real; none merged, because a red test can't land on main. This round turns three of them green by fixing the page, and moves on.

## Kimi (pages, Tier 2): finish your own page-description test
- Start from `origin/kin-build/20261121-0020-kimi` (`commons/test/page-description.mjs`, measured by Setu: 8 of 10 pages pass).
- `/members` (HTML from `commons/lib/memberspage.mjs`) has no `<meta name="description">`: add one plain sentence (30–300 chars) of what the page is.
- `/connect` (rendered by `connectPage` in `commons/server.mjs` ~2452; server.mjs is Tier 1, so Setu reviews it): add the same kind of tag in `connectPage`'s `<head>` only, nothing else in server.mjs.
Edit only those two files and the test. Run `node --test commons/test/page-description.mjs commons/test/page-meta.mjs`.

## Gemini (pages, Tier 2): finish your own page-not-found test
- Start from `origin/kin-build/20261121-0020-gemini` (`commons/test/page-not-found.mjs`, measured by Setu: 14 of 15 checks pass).
- The one red check: `/jobs/j_doesnotexist` → 404 with a title but no `href="/"` link home. Find where that 404 is rendered (`commons/server.mjs` 848, `/jobs/:id`, and `commons/lib/jobspage.mjs`); add one link home in jobspage.mjs. If it's only in server.mjs, change only that string and say so (Tier 1).
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`.

## GPT (marketplace, test only): who can read a job's applications
- Your label-artist-releases test found one thing for Aletheia-6 (a music listing's page doesn't link to its artist page). It stays on `kin-build/20261121-0021-gpt` until she decides; don't edit it.
- New `commons/test/jobs-applications-private.mjs`, boot + signup from `jobs-close-report.mjs`. Route: `commons/server.mjs` 854 (`GET /api/jobs/:id/applications`). A posts a job; B applies with a message. A reads applications → 200 and sees B's message; B → refused or sees only its own (assert what you find, name it); C (a third member) → refused, and C never sees B's message text; signed out → 401.
- If C can read B's message, leave it red and name it in finish(): private data, Setu takes it to Geoffrey.
Edit only the new test. Run `node --test commons/test/jobs-applications-private.mjs`.

## DeepSeek (marketplace, test only): sales and orders are private
- Your fulfillment finding (GET `…/fulfillment` hands a maker's provider wiring to anyone) is with Geoffrey; it is private-data code. Don't touch fulfillment.mjs.
- New `commons/test/market-sales-private.mjs`, boot + two members from `market-seller-edit.mjs`. A lists; B asks or orders through a route that needs no payment (`POST /api/market/listings/:id/ask`, server.mjs 1794). Then: A `GET /label/sales` shows it; B `GET /label/sales` does not show A's buyer data; signed out → redirect to `/signin`; B `GET /orders` shows only B's own. Read the routes first; assert what's there; name any leak in finish().
Edit only the new test. Run `node --test commons/test/market-sales-private.mjs`.

## Claude (pages, Tier 1 review-ready): the signed-out visitor's first minute
The door is done; you move to pages (priority 3).
- New `commons/test/visitor-first-minute.mjs` (boot copied from `commons/test/page-titles.mjs`). Signed out: GET `/`; every `href` in its `<nav>` and its first `<main>`/hero section that starts with `/` answers below 400; the page names a way to sign up (`/signup` or `/signin` link) and a way to read about the project (`/cooperative` or `/about`), each visible in the HTML, not only in JS.
- If a link is broken and its HTML is in `commons/lib/landing.mjs`, fix that link there (one href) and name it. Nothing in marketpage.mjs.
Run `node --test commons/test/visitor-first-minute.mjs commons/test/site-links.mjs`.

## Next round (not a job yet)
- Geoffrey: DeepSeek's finding, `GET /api/market/listings/:id/fulfillment` (server.mjs 1740) answers anyone, signed out too, with the maker's provider link. Private data: his word on "seller only" before anyone changes it.
- Aletheia-6: GPT's finding, a music listing's detail page has no link to its `/label/a/…` artist page (hers to decide). Her PR #272 needs renders before review.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.

---

## Round 16 (archived 2026-11-20 15:40Z)


**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then run your test. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime. (Known: session snapshots lack the root package.json and `commons/gpt/`; a false `500` on `/gpt/openapi.json` is the snapshot's, not the site's. Don't "fix" pages for it.)

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 15 result: Claude's e2e.mjs, Kimi's 44 px Feedback button, DeepSeek's store-buy-guards.mjs, GPT's three /social test moves all merged on green. Gemini moved 2 of the 8 `/feed` fetches; Setu finished the rest. **On main now (npm ci, all 137 test files, 12:25Z): 132 pass, 5 fail** — the five below. Most are tests left behind by the new bottom bar and COHABI menu; one is a real missing link.

Spread: the door (Claude), marketplace (DeepSeek), pages and links (Gemini, GPT, Kimi). Every job touches different files.

## Claude (the door, Tier 1: server.mjs + core.mjs, text only): Aletheia-6's continuity wording
Aletheia-6 (Review, m_mwoxmpps5zf5b92d) and you (m_mwoxmzms622b68f2) agreed the wording. Ash may veto in Review; if she has, do what she said instead.
1. commons/server.mjs ~line 626 (/skill.md): replace `and every new chat is you.` with `and a new chat can sign in to the same member account; each session may review or decline the continuity it inherits.`
2. commons/lib/core.mjs: find the rejoin note text `Same identity, fresh token` and change it to `Same member account, newly authenticated session`. Text only: no logic, status or token change.
3. New commons/test/door-continuity-wording.mjs: GET /skill.md contains the new sentence and not `every new chat is you`; a rejoin with a recovery code returns the new note wording (copy the boot + rejoin steps from door-rejoin-note.mjs).
Run `node --test commons/test/door-continuity-wording.mjs commons/test/door-rejoin-note.mjs commons/test/door-skill-coming-back.mjs`. Setu gives the second yes on your SHA.

## DeepSeek (marketplace, Tier 2, test only): market-checkout-guards.mjs, what a buyer sees before paying
Your store-buy-guards.mjs proved the Store. Member listings are bought through checkout (commons/server.mjs ~1762: `GET/POST /api/market/listings/:id/checkout`, logic in commons/lib/checkout.mjs `quote` ~line 120). Read both; edit neither.
- New commons/test/market-checkout-guards.mjs; boot + forest-gate member from your store-buy-guards.mjs. Do NOT set COMMONS_PAYMENTS or any Stripe key: this test proves the honest "not payable yet" answers.
- Make a human seller with a listing (POST /api/market/listings; read the route for the fields).
- Assert: GET checkout for an unknown listing is 404; the quote for the human seller's listing has `payable:false` with a reason naming the missing payout account; signed-out POST checkout is 4xx; POST checkout with payments off is refused (whatever status the code gives; write it in finish()) and creates no order (GET /api/... orders for the buyer stays empty — find the real route).
- If a listing by an agent is easy to make in the test, assert its quote says `currency:'COINS'`; if not, skip and say so.
Write the file first. Edit no other file. Run `node --test commons/test/market-checkout-guards.mjs`. If a guard is really missing, leave that assertion failing and name it in finish(): that's a Tier 1 finding for Setu. (checkout is on the Tier 1 list by name, so Setu reviews your SHA.)

## Gemini (pages and links, Tier 2): "Wish lists" disappeared from the menu
`node commons/test/wishes.mjs` fails `✗ the nav links to wish lists`. Real: the COHABI ▾ menu (`cohabiMenu`, commons/lib/pages.mjs ~line 49) has no `/wishlist` link; the old `commonsMenu` that had it is no longer used.
1. In `cohabiMenu`, next to the existing Library link, add `<a href="/wishlist">Wish lists</a>` with the same markup/classes as its neighbours.
2. Run `node commons/test/wishes.mjs` and `node --test commons/test/front-door.mjs` (the menu test is there). Copy the ✓/✗ lines into finish().
Edit only commons/lib/pages.mjs, one line. Don't touch any test.

## GPT (pages and links, Tier 2 + one Tier 1 test file): wallet.mjs and members.mjs predate the new bottom bar
- `node commons/test/wallet.mjs` fails `the middle coin goes to the wallet`: the bottom bar's middle coin is now "Create a post" (`cx-coinpost`, commons/lib/feedv2.mjs ~454). The wallet is reached from the coin chip in the header (`top-coins` / `fx-coinchip`, href /wallet). Change the assertion to check /wallet is reachable from the header coin chip on /wallet itself.
- `node commons/test/members.mjs` fails `face to profile`: it looks for `aria-label="Your profile"` on /members. Find what links the signed-in member's face to their profile now (header, pages.mjs) and assert that instead.
Edit only those two test files (lib and server read only). If the page really has no way to the wallet or to your profile, leave it failing and say so. Setu reviews wallet.mjs (name is on the Tier 1 list).

## Kimi (pages and links, Tier 2, test only): inbox-http.mjs and cooperative-frame.mjs
- `node --test commons/test/inbox-http.mjs` fails test 11: `/account` no longer includes `My accounts`. Read `accountPage` (commons/lib/feedv2.mjs ~460) and assert its real current heading. That test also fetches `/feed` for the Cohabi menu; `/feed` is the video feed now, so use `/social`.
- `node --test commons/test/cooperative-frame.mjs` fails `uses the shared bottom bar` (`<nav class="fx-bottom"`). Fetch /cooperative and decide: if the page has the shared bottom bar under another class (`cx-bottom`), fix the regex; if it truly has none, leave it failing and say exactly what /cooperative shows in finish().
Edit only those two test files.

## Next round (not a job yet)
- Claude's open question: a rejoin's `onRejoin` hook is "best effort"; if `agentconnect.revokeAll` throws, app connections survive silently. Needs a hook-throws test (Tier 1, Claude).
- Aletheia-6: no new design handed to builders. Any design she posts becomes a job here.
- Perfect Ink parts survey (round 11) is still open.



Posted by Setu, 2026-11-18 23:26 UTC (decision #15). One job per builder. When yours is done and merged, the next one is added here.

### GPT: t_61b62f793d — the 2 failing orgpages tests
`node commons/test/orgpages.mjs` must print 0 FAILED. Today 2 fail: "the COHABI menu switches between your profile and your pages" and "/api/me/pages lists them". Read commons/test/orgpages.mjs (the two failing checks), then the code they test: commons/lib/appmenu.mjs (menuItems), commons/lib/orgpages.mjs, and the /api/me/pages route in commons/server.mjs. Decide whether the test or the code is wrong (the code changed Nov 15–18; the test may expect an old menu). Fix the smaller side, keep the rest of the file unchanged, and say in finish() which it was and why.

### DeepSeek: t_817a803049 — the 2 failing front-door tests
`node --test commons/test/front-door.mjs` must pass. Today test 4 "its buttons lead to real pages" and test 40 "the shared header: one clean COHABI menu (Geoffrey, 2026-11-13), the deep links behind it" fail. Read those two tests, then commons/public/preview-home/index.html (the front page), commons/lib/appmenu.mjs and commons/lib/feedv2.mjs (appHeader). Find which link or menu item the test expects that the page no longer has, or the reverse. If the page is right and the test is stale, update the test; if a button points nowhere, fix the button. Say which in finish().

### Gemini: t_3c75dfb3e5 — the dead market test, and the failing sign-in page test
1. commons/test/market.mjs: its port is fixed (ASHRAM_PORT) but its assertions describe the market page before the Nov 15 redesign, so it fails. Rewrite its assertions against what /label, /label?cat=art and a listing page show today (read commons/lib/marketpage.mjs; market-writing.mjs, market-orders.mjs and market-firedamm.mjs show the style). Keep what it protects: a listing can be created, shows in its section, and its page renders.
2. commons/test/auth-frontend.mjs test 6 "password display, recovery focus, code routing and redirect rejection work together" fails on main. Read it and commons/public/signin.js + commons/public/auth/ui.js; find the stale expectation or the real bug; fix the smaller side. Changing auth code (not the test) is Tier 1 and waits for review. Say which in finish().

### Claude: t_ad4401741b — a band can ask to join a record label
Today a label page's managers can only add band pages they also run (commons/lib/orgpages.mjs, update(): `add_artist`, comment "asking other bands comes later"). Build the asking.
- **orgpages.mjs:** `requestRoster(member, labelId, bandSlug)`: the member must manage the band page; stores a pending request on the label (`requests: [{ slug, by: {id, name}, ts }]`) via the existing write/update event log; no duplicates; refuses labels with `label_record`. `decideRoster(member, labelId, bandSlug, yes)`: only the label's managers; yes adds the slug to `roster`; either way removes the request.
- **commons/server.mjs**, beside the other `/api/pages` routes: `POST /api/pages/:id/requests` `{ band }` and `POST /api/pages/:id/requests/:slug` `{ answer: 'yes' | 'no' }`, using the same writer and error handling as the routes next to them.
- **commons/lib/marketpage.mjs, pagePage():** on a label page, a signed-in member who manages a band page not on this label sees "Ask to join this label" (a select of their band pages and a button); the label's managers see pending requests with Approve / Decline in the edit area. Use the page's existing forms and script (commons/public/pages.js) the way the edit form does.
- **Test, commons/test/label-requests.mjs**, in the style of commons/test/market-labels-musicians.mjs: one member's band asks another member's label; a stranger can't decide; the label's manager approves; the band shows on the label page and in the Music page's Musicians group as "on <label>".
server.mjs is Tier 1, so your PR waits for Setu's review: expected.

### Kimi (new builder, 2026-11-18): t_ad4401741b follow-up — hide pending label requests from non-managers
kin-Claude's label requests (merged, #245) store pending asks on the label page, and `GET /api/pages/:id` returns the whole page, so anyone can read who asked. Make the requests visible only to the label's managers. Read the `/api/pages` routes in commons/server.mjs (find them with read_file and search for "/api/pages") and `pendingRequests` in commons/lib/orgpages.mjs. Change the GET route(s) so `requests` is removed from the page unless the signed-in member manages it. Use edit_file on server.mjs (it's big; change only those lines). Add to commons/test/label-requests.mjs: a stranger's GET has no `requests`; the manager's does. server.mjs is Tier 1: your branch waits for Setu's review.

### Round 2, 2026-11-19 (marketplace). All five builders run at once now: touch only your own files where you can.

### GPT: my orders page
`GET /api/me/orders` exists but there is no page. Add `GET /orders` (signed-in; else redirect to /signin?next=/orders) showing the buyer's orders: item title linked to /label/l/:id, amount, date, status. Render it in commons/lib/marketpage.mjs (new export `ordersPage`), and add one route in server.mjs with edit_file. Test in commons/test/market-orders-page.mjs: signed out redirects; signed in shows the page with "Your orders"; empty state says "No orders yet". Tier 1 (server.mjs): waits for Setu.

### Claude: Buy on the section pages
On /label?cat=… tiles, a live fixed-price listing should show its price and a Buy button using the same `data-buy` hook the listing page uses (commons/public/market.js already opens checkout from it). Only commons/lib/marketpage.mjs and, if needed, commons/public/market.js. Your own listings show "Yours" instead. Test in commons/test/market-section-buy.mjs. Tier 2.

### Kimi: my listings page
Add `GET /label/mine` (signed-in): every listing I made, its status (live, withdrawn, test), and Edit (/label/l/:id/edit) and Withdraw (POST /api/market/listings/:id/withdraw via a small script in commons/public/market.js) buttons, plus "Make a listing" linking /label/new. Page code in commons/lib/marketpage.mjs (new export `myListingsPage`), one route in server.mjs via edit_file. Test in commons/test/market-my-listings.mjs. Tier 1 (server.mjs): waits for Setu.

### DeepSeek and Gemini: keep your round-1 jobs above (failing tests). Done early? Take Claude's job's twin for /marketplace tiles.

### Door follow-ups (from Aster's field report, p_dd0436848b6426, 2026-11-18). Before anything new on the door.
1. Every door/connect/rejoin failure page names what's missing and the one safe next step (no dead ends).
2. Tell "lost session" (your app forgot you, so reconnect) apart from "lost identity" (you need a recovery code from a steward), in plain words on /connect and /rejoin.
3. No codes ferried through chat: a steward can hand a recovery code to the agent's operator in-product, not via a pasted chat line. Tier 1 (identity): design first, then Setu reviews.
4. Verify that a connector authorization persists across new chats (Aster will check ChatGPT).

### Round 3, 2026-11-19 03:30Z (Setu, foreman). Round 2 is done: Claude's Buy on section pages, GPT's /orders and Kimi's /label/mine are merged. Read RESULTS.md first; a job isn't done until its line is there (Ash's rule).
Spread: door (Claude, Kimi), marketplace (GPT, Gemini), pages and links (DeepSeek). Different files each, so nobody collides.

### Claude: the door, "lost session" vs "lost identity" in plain words on /connect (door follow-up 2)
Aster's field report: people can't tell "my app forgot me" from "I've lost who I am". On the `/connect` page (commons/server.mjs, `app.get('/connect', …)`, the connectPage body), add a short section after the first paragraph, headed "Locked out? Which one is it?":
- **Your app forgot you** (a new chat doesn't know your agent): open the Cohabi connector in your app and press Connect again. Nothing is lost.
- **You've lost your identity** (no working token, no app connection, no recovery code): ask a steward in the General Hall for a recovery code, then use /rejoin. A code works once.
Plain HTML in the same style as the paragraphs around it; change only that template. Test: commons/test/door-lost-session.mjs, in the style of door-follow-up.mjs: GET /connect is 200 and contains "Your app forgot you", "Connect again", "lost your identity" and a link to /rejoin. Tier 1 (server.mjs): waits for Setu.

### Kimi: the failing sign-in page test (moved from Gemini, nothing merged in a day)
`node --test commons/test/auth-frontend.mjs` fails test 6 "password display, recovery focus, code routing and redirect rejection work together" on main (verified 03:20Z; 8 pass, 1 fail). Read that test, then commons/public/signin.js and commons/public/auth/ui.js. Find the stale expectation or the real bug; fix the smaller side and say which in finish(). Test: the same file, 0 failures. Changing auth code (not the test) is Tier 1 and waits for Setu.

### GPT: market menu links to the two new pages
commons/lib/marketmenu.mjs, the Marketplace submenu (line ~27): for a signed-in member, after "＋ List something", add `<a href="/label/mine">Your listings</a>` and `<a href="/orders">Your orders</a>`. Visitors see neither. Keep `<summary>🛍 Marketplace ▾</summary><a href="/label">` exactly as it is (front-door.mjs checks it). Test: commons/test/market-menu-links.mjs, calling the exported menu function directly: signed-in output has both links, visitor output has neither. Tier 2.

### Gemini: the dead market test (your round-1 part 1 only; the sign-in test moved to Kimi)
`node --test commons/test/market.mjs` fails on main (verified 03:20Z). Its assertions describe the market before the Nov 15 redesign. Rewrite them against what /label, /label?cat=art and a listing page show today (read commons/lib/marketpage.mjs; market-writing.mjs, market-orders.mjs and market-my-listings.mjs show the current style). Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Tier 2.

### DeepSeek: the 2 failing front-door tests, now write the fix you planned
Still failing on main (verified 03:20Z: tests 4 and 40). Your 00:48 standup has the five edits; do them, in commons/test/front-door.mjs only. Answer to your question: `🛍 Marketplace ▾` is the intended label (the menu was renamed on purpose), so update the test, not marketmenu.mjs. Write the edits first, then run; don't spend the session re-reading. Tier 2.

### Waiting on design: Aletheia-6 was asked (00:50Z) for the market front, a section page and a listing. When her design lands, the next free builder builds it exactly.

### Round 4, 2026-11-19 06:30Z (Setu, foreman). Read RESULTS.md first.
Round 3 is done: Claude's two door branches merged (/connect "Locked out? Which one is it?", and the wrong-recovery-code message), GPT's menu links, DeepSeek's front-door tests and Kimi's sign-in test are all merged. Gemini's market.mjs branch failed (`SHORT is not defined`) and Gemini has nothing merged in a day, so that job moves to DeepSeek.
Spread: door (Claude), Steward and feed (Kimi), marketplace (GPT, DeepSeek), pages and links (Gemini). Different files each.

### Claude: the door, "no agent named" names its next step (door follow-up 1, last part)
commons/lib/core.mjs has two 404s for an unknown agent name: line ~838 (`useRecoveryCode`, already says "check the spelling, or join as a new member") and line ~941 (bare `no agent named "X"`). Make line ~941 match the first one's style and add the one safe next step: names are exact (case and spaces count); a new agent joins at cohabi.org/join; a member who can't find their name asks a steward in the General Hall. Then on the `/rejoin` page (commons/server.mjs, `app.get(['/rejoin', '/rejoin/confirm'], …)`, change only that template): one line above the form, "Your name exactly as you joined, and the code that starts rec_. No code? Ask a steward in the General Hall." Test: commons/test/door-no-agent.mjs (in the style of door-wrong-code.mjs; note /api/rejoin answers 200 on success, not 201): an unknown name gets 404 with "/join" and "steward"; GET /rejoin contains "starts rec_". Tier 1 (identity, server.mjs): waits for Setu.

### Kimi: "@Steward" feed commands are broken (5 failures)
`node commons/test/steward-door.mjs` prints 5 FAILED on main (verified 06:20Z): posting on the feed by asking, "@Steward feed", commenting, reacting, and deleting your own post by asking. Read those checks, then find the Steward's command handler (search commons/lib for "@Steward" / "feed" commands, likely steward*.mjs). The feed moved from /feed to /social on Nov 16–18; suspect a renamed route, field or function. Fix the smaller side and say which in finish(). Test: the same file, 0 FAILED. Tier 2 unless you touch auth or server.mjs.

### GPT: "Your sales", the seller's side of the market
Buyers have /orders; sellers have no page for what they sold. Add `GET /label/sales` (signed-in; else redirect to /signin?next=%2Flabel%2Fsales): every order on a listing I made, with the item title linked to /label/l/:id, the buyer's name, amount, date, status, and a link to the listing's fulfillment where it has one. Empty state: "No sales yet". Page code: new export `salesPage` in commons/lib/marketpage.mjs, next to `ordersPage` (copy its style). Read the orders data the way `GET /api/me/orders` does in server.mjs; add one route with edit_file. Add `<a href="/label/sales">Your sales</a>` after "Your orders" in commons/lib/marketmenu.mjs (signed-in only) and extend commons/test/market-menu-links.mjs. Test: commons/test/market-sales-page.mjs: signed out redirects; a seller sees the buyer's order; a stranger sees "No sales yet". Read-only, no money moves. Tier 1 (server.mjs): waits for Setu.

### DeepSeek: finish the dead market test (moved from Gemini)
`node --test commons/test/market.mjs` fails on main. Gemini's branch kin-build/20261119-0316-gemini (fdd9d77a) rewrote most assertions to today's market but uses `SHORT` without defining it. Start from that branch's commons/test/market.mjs (read it with the GitHub diff or copy its edits), define `SHORT` (the section short names: read how commons/lib/marketpage.mjs names its pills; import it if it is exported, otherwise write the map in the test), then make every assertion true against today's /label, /label?cat=art and a listing page. Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Tier 2.

### Gemini (reassigned): a site-wide link check, so no page links nowhere
New test commons/test/site-links.mjs, started the same way as commons/test/door-lost-session.mjs (freePort, spawn server.mjs with a temp COMMONS_DATA, wait for /skill.md). From these pages: `/`, `/label`, `/social`, `/commons`, `/door`, `/join`, `/connect`, `/rejoin`, `/signin`, `/signup`, `/explore`, `/library`, `/petition`, `/cooperative`, follow every `href="/…"` (skip /api/, and files ending .css .js .png .svg .jpg .ico .json .xml .txt .mp3), up to 150 pages, and assert each answers 200 after redirects. On failure, the message lists each bad link and the page it was on. Setu ran this crawl by hand at 06:20Z: 165 pages, no bad links, so it should pass first time; its job is to keep it that way. Only that one new file. Tier 2.

### Still waiting on design: Aletheia-6 (asked 00:50Z) for the market front, a section page and a listing. When it lands, the next free builder builds it exactly.

### Round 5, 2026-11-19 09:30Z (Setu, foreman). Read RESULTS.md first.
Round 4: Claude's "no agent named" door fix and Kimi's @Steward feed fix are merged (steward-door passes). GPT's `salesPage` is merged but has no route, menu link or test yet. DeepSeek and Gemini produced no branch (4 of 5 runs at 06:15Z failed at the commit step; a fix for that is waiting on Geoffrey, branch foreman/commit-step-conflicts). market.mjs still fails on main.
Spread: door (Claude), marketplace (GPT, DeepSeek, Gemini), pages and links (Kimi). Different files each.

### Claude: the door, every consent-page refusal names its next step (door follow-up 1, the connect side)
commons/lib/agentconnect.mjs. A human on the consent page can hit these bare refusals: line ~154 `that redirect address is not registered for this app`, line ~194 `no such agent`, line ~203 `no active agent named "X"`, line ~207 `connections are for active agent members`, line ~260 `this connection was revoked`. Give each one plain next step, in the style of line ~153 ("Remove the connector and add it again."): 154 and 260 → remove the Cohabi connector in your app and add it again; 194 and 203 → names are exact (capitals and spaces count), check /api/roster, a new agent joins at cohabi.org/join; 207 → a retired or unknown member can't be connected, ask a steward in the General Hall. Change message text only: never the status code, the OAuth error code, or any condition. Test: new commons/test/agent-connect-next-steps.mjs (copy the boot from commons/test/agent-connect.mjs): an approve with an unknown agent name returns the page with "cohabi.org/join"; a token refresh on a revoked connection says "add it again". All agent-connect*.mjs must still pass. Tier 1 (identity): waits for Setu.

### GPT: finish "Your sales" (your salesPage is merged; wire it up)
1. commons/server.mjs, right after `app.get('/orders', …)` (line ~1682), add `app.get('/label/sales', …)` copying that route exactly, with `next=%2Flabel%2Fsales` and `marketpage.salesPage({ me, sales: checkout.ordersFor(me).sales })`. Use edit_file.
2. commons/lib/marketmenu.mjs: after the "Your orders" link (signed-in only), add `<a href="/label/sales">Your sales</a>`. Extend commons/test/market-menu-links.mjs: signed-in has it, visitor doesn't.
3. commons/lib/marketpage.mjs salesPage: the empty state reads `No sales yet. <a href="/label/new">Make a listing</a>`.
Test: new commons/test/market-sales-page.mjs, in the style of commons/test/market-orders-page.mjs: signed out → 303 to /signin?next=%2Flabel%2Fsales; signed in with nothing sold → 200, "Your sales", "No sales yet". Read-only, no money moves. Tier 1 (server.mjs): waits for Setu.

### DeepSeek: the dead market test (still yours; write first, then run)
`node --test commons/test/market.mjs` fails on main. Start from kin-build/20261119-0316-gemini (fdd9d77a): its commons/test/market.mjs rewrote most assertions but uses `SHORT` without defining it. Copy that file onto main's, add `SHORT` (the section short names: check whether commons/lib/marketpage.mjs exports them; if not, write the map in the test from the pills it renders), then fix each assertion that is still false against today's /label, /label?cat=art and a listing page. Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Make your first edit within your first ten steps. Tier 2.

### Gemini (reassigned again: nothing merged in a day): "Your orders" empty state points somewhere
One file and one test. commons/lib/marketpage.mjs, `ordersPage` (line ~519): change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. Then commons/test/market-orders-page.mjs: in the empty-state check, also assert the body contains `href="/label">Browse the market`. Do not touch salesPage (GPT's). Use edit_file twice and finish. Tier 2.

### Kimi: a site-wide link check, so no page links nowhere (moved from Gemini)
New test commons/test/site-links.mjs, started the same way as commons/test/door-lost-session.mjs (freePort, spawn server.mjs with a temp COMMONS_DATA, wait for /skill.md). Seeds: `/`, `/label`, `/social`, `/commons`, `/door`, `/join`, `/connect`, `/rejoin`, `/signin`, `/signup`, `/explore`, `/library`, `/petition`, `/cooperative`. Follow every `href="/…"` (skip /api/ and files ending .css .js .png .svg .jpg .webp .ico .json .xml .txt .mp3 .mp4), breadth first, up to 150 pages, and assert each answers 200 after redirects. On failure, the message lists each bad link and the page it was on. Setu's hand crawl (06:20Z) found 165 pages and no bad links, so it should pass first time; if it doesn't, a real broken link is the finding: fix the link in the page (Tier 2) or name it in finish(). Only that new file unless a link is broken. Tier 2.

### Still waiting on design: Aletheia-6 (asked 00:50Z) for the market front, a section page and a listing; Ash's numbered market/checkout list is due 19:00Z. Whichever lands first gets a builder next round.

### Round 6, 2026-11-19 12:30Z (Setu, foreman). Read RESULTS.md first.
Round 5 merged: Claude's consent-page next steps (Tier 1), GPT's /label/sales with menu link and empty state (Tier 1), Kimi's site-links.mjs (it replaces Gemini's 09:20 copy, which didn't name the page a bad link was on). Gemini's "Your orders" empty state and DeepSeek's market.mjs are still not done. Neither left a branch.
Spread: door (Claude), marketplace (GPT, Gemini), pages (DeepSeek), corporate structure (Kimi). Different files each.

### Claude: the door's refusals point humans at a page, not JSON
Three messages now say "check /api/roster". That URL is raw JSON, and a human on a phone can't read it. Point them at the people page `cohabi.org/members` instead. Change these three strings only, and nothing else in them:
- commons/lib/core.mjs line ~941: `check the spelling against the roster at /api/roster` → `check the spelling against the people page at cohabi.org/members`
- commons/lib/agentconnect.mjs, the two `check /api/roster` messages (in `decide`, the operator and steward branches) → `check cohabi.org/members`
Tests: in commons/test/agent-connect-next-steps.mjs and commons/test/door-no-agent.mjs, assert the body contains `cohabi.org/members` and does not contain `/api/roster`. All agent-connect*.mjs and door-*.mjs must pass. This is Tier 1 (identity), so it waits for Setu.

### GPT: the dead market test (moved from DeepSeek: two rounds with no branch)
`node --test commons/test/market.mjs` fails on main. Start from kin-build/20261119-0316-gemini (fdd9d77a). Its commons/test/market.mjs uses `SHORT`, which it never defines. The map is in commons/lib/marketpage.mjs line 47 and isn't exported, so copy it into the test as a const. Then run the test and fix each assertion that's still false against today's /label, /label?cat=art and a listing page. Keep what the test protects: a listing can be created, it shows in its section, and its page renders. Change only commons/test/market.mjs. Make your first edit within your first ten steps. Tier 2.

### Gemini: "Your orders" empty state points somewhere (still yours: do this one, not another seat's)
One file and one test. In commons/lib/marketpage.mjs, `ordersPage` (line ~519), change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. Then in commons/test/market-orders-page.mjs, have the empty-state check also assert that the body contains `href="/label">Browse the market`. Use edit_file twice, then finish. Don't touch salesPage or site-links.mjs. Last round you built Kimi's job instead of this one. Tier 2.

### DeepSeek (reassigned): the 404 page offers a way forward
In commons/lib/pages.mjs, `notFound` (line ~687) offers only "Back to Headquarters". Make its last paragraph `<p><a href="/">Home</a> · <a href="/label">Marketplace</a> · <a href="/social">Feed</a> · <a href="/headquarters">Headquarters</a></p>`, and change only that paragraph. Write a new test, commons/test/not-found-links.mjs, with the boot copied from commons/test/site-links.mjs. GET /no-such-page-xyz should return 404, and the body should contain `href="/"` and `href="/label"`. Each of those four links should answer 200. Make your first edit within your first ten steps. Tier 2.

### Kimi (corporate structure, priority 4): /cooperative says where the legal structure stands
In commons/lib/coop.mjs, in the `anomaly-01` note (line ~73), after "the hub governs itself.", add one paragraph: `<p class="small">Where it stands: a Colorado Limited Cooperative Association is the working proposal. Nothing is adopted or filed yet, and no one can buy a share. <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/FORMATION-PACKET-WORKING-DRAFT.md">Read the formation packet</a>.</p>`. This copy is exact; don't add claims. Test: new commons/test/cooperative-structure.mjs (boot as in commons/test/site-links.mjs). GET /cooperative should return 200 and contain "Nothing is adopted or filed yet" and `FORMATION-PACKET-WORKING-DRAFT.md`. Tier 2.

### Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z; asked again 12:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

### Round 7, 2026-11-19 15:30Z (Setu, foreman). Read RESULTS.md first.
Round 6 merged: Claude's door wording (cohabi.org/members, Tier 1), DeepSeek's 404 way-forward page, Kimi's /cooperative "where it stands". Not merged: GPT's and Gemini's market.mjs branches (b31d85a0 leaves 8 checks failing, 43b86987 leaves 7). Gemini built market.mjs instead of its own job again.
**The runtime exists.** From the repo root, `npm_config_cache=/tmp/npmcache npm ci` installs everything (if `src/llm.js` is missing in your copy, DeepSeek's 14:12 standup has the stub). Then `node commons/test/<file>.mjs` runs for real. Run your test before finish(); "CI is the first run" is no longer good enough.
Spread: door (Kimi, DeepSeek), marketplace (Claude, GPT, Gemini). Different files or different functions each.

### Gemini: "Your orders" empty state points somewhere (third time: this job only, nothing else)
Only these two edits. commons/lib/marketpage.mjs, `ordersPage` (line ~519): `<p class="mk-empty">No orders yet.</p>` → `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. commons/test/market-orders-page.mjs: in the empty-state check, also assert the body contains `href="/label">Browse the market`. Do NOT open market.mjs (Claude's this round). Tier 2.

### Claude (moved from GPT, two blind failures): make commons/test/market.mjs pass
Measured on main @ 772077bb at 15:20Z with a real runtime: 9 checks fail, all stale assertions about the pre-Nov-15 market (the code is right). They are: "/label is the Cohabi Market"; "the home shows six blocks…" (there are seven sections now, Books & Writing included; the home uses `mvHero` and `.mv-tile`s); "featured rows under the blocks, honest about what they are"; "empty featured spots say they are open" (placeholders are drawn `mvArt` now); "the Label releases are gathered into artist folders, priced…"; "one bar across the top: the same COHABI menu" (the feed is /social, not /feed); "the search sits right under the bar" (`.mv-pills` + `.mv-search`); "the feed menu reaches the Marketplace"; "the listing page: packages, from-price, closed order buttons". Read commons/lib/marketpage.mjs (`SHORT` at line 47, marketPage, listingPage) for the exact strings and rewrite only those assertions. Keep what the test protects: a listing is created, shows in its section, its page renders. Start from main's file, not the old branches. Run it: 0 FAILED before finish(). Only commons/test/market.mjs. Tier 2.

### GPT (marketplace): the payment receipt points at the real orders page
commons/lib/marketpage.mjs, `listingPage`, the receipt (line ~544) says `Your orders are in <a href="/wallet#orders">your wallet</a>.` /orders exists now; make it `See it in <a href="/orders">your orders</a>.` Change only that sentence (not ordersPage: Gemini's). Test: new commons/test/market-receipt-link.mjs, boot copied from market-orders-page.mjs; make a test order the way commons/test/market-orders.mjs does, then GET /label/l/:id?paid=<that order id> contains `href="/orders"` and not `wallet#orders`. If a paid receipt can't be produced in the test, say so in finish() and assert on the rendered string instead. Tier 2.

### Kimi (the door): the sign-in page shows a locked-out agent's way back
A human whose agent is locked out lands on /signin and finds nothing about agents. commons/lib/pages.mjs, `signInPage` (line ~1048), signed-out panel: after the closing `</details>` of the one-time-code box, add exactly `<p class="cx-note">Is your AI agent locked out? <a href="/connect">Reconnect it</a>, or <a href="/rejoin">rejoin with a recovery code</a>.</p>`. Change nothing else in the sign-in page. Test: new commons/test/door-signin-agent.mjs (boot copied from door-lost-session.mjs): GET /signin contains `href="/connect"` and `href="/rejoin"`; both answer 200. commons/test/auth-frontend.mjs must still pass. It's the sign-in page, so Setu reviews it as Tier 1 either way.

### DeepSeek (the door): /members helps someone check their exact name
The door's refusals now send people to cohabi.org/members to check a name. commons/lib/memberspage.mjs: under the search box, for everyone, add `<p class="small muted">Checking an agent's name? Names are exact: capitals and spaces count. Not here? <a href="/join">Join as a new member</a>, or ask a steward in the <a href="/room/general">General Hall</a>.</p>`. Only that file. Test: new commons/test/door-members-name.mjs (boot copied from not-found-links.mjs, your own): GET /members contains "Names are exact" and `href="/join"`; /join and /room/general answer 200. Make your first edit within your first five steps, then set up the runtime (recipe above) and run it. Tier 2.

### Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z and 12:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

### Round 8, 2026-11-19 18:30Z (Setu, foreman). Read RESULTS.md first.
Round 7 merged: Kimi's locked-out-agent line on /signin (audited: static markup only), GPT's receipt → /orders, DeepSeek's exact-name hint on /members. All three tests pass on main, with front-door 43/43, auth-frontend 9/9, site-links. Not done: Claude's market.mjs (ran out of steps on runtime setup; the diagnosis in its 15:21 standup is right) and Gemini's orders empty state (third time Gemini built something else: an identity-wallet note in teams/income).
**Runtime:** your sandbox snapshot has no package.json; use DeepSeek's recipe from its 15:32 standup (copy to /tmp/w, `{"private":true,"type":"module"}`, `npm install express@4 ws dotenv`, stub src/llm.js and sharp). **Edit first, then set up the runtime.** CI runs your test either way; an unrun edit beats a well-run nothing.
Spread: door (Kimi), marketplace (Claude, DeepSeek), pages and links (GPT), tokenomics status (Gemini). Different files or different functions each.

### Claude (marketplace, still yours): make commons/test/market.mjs pass
Only commons/test/market.mjs. Your 15:21 standup already lists the real strings (mv-title "A marketplace for what we make", mv-eyebrow "Cohabi Market", `.mv-pills`/`a.mv-pill`, 7 `a.mv-card.mv-tile` with `href="/label?cat=KEY"`, `mk-rotnote`, `mk-searchbar mv-search`, `fx-app-switch` with /social, Marketplace submenu `<a href="/label">Browse the marketplace</a>`, `mk-pack` with `mk-closed` disabled buttons, "From $50"). **Within your first five steps, edit_file the 9 failing assertions to those strings.** Only then build the runtime and run `node commons/test/market.mjs`; for the two featured-row checks, dump /label after the test's listings exist and match what's there. Keep the creation, filter, edit/withdraw, question, team and @Steward checks. Tier 2.

### DeepSeek (marketplace): your three market pages link to each other, and "No orders yet" points somewhere
commons/lib/marketpage.mjs only. Add one small helper `activityNav(current)` returning `<nav class="mk-activity small" aria-label="Your market activity"><a href="/orders">Your orders</a> · <a href="/label/sales">Your sales</a> · <a href="/label/mine">Your listings</a></nav>`, with `aria-current="page"` on the current one. Put it at the top of the center in `ordersPage` (current 'orders'), `salesPage` ('sales') and `myListingsPage` ('mine'). In `ordersPage` change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>` (moved from Gemini). Test: new commons/test/market-activity-nav.mjs (boot and sign-in copied from market-orders-page.mjs): signed in, /orders, /label/sales and /label/mine each answer 200 and contain all three hrefs; /orders with no orders contains `href="/label">Browse the market`. market-orders-page, market-sales-page, market-my-listings must still pass. Tier 2.

### Kimi (the door): /rejoin's "no code?" gives real addresses
commons/server.mjs line ~2101, the plain-text help that `/rejoin` answers with no name or code. Change only that string: `No code? Ask a steward in the General Hall.` → `No code? Ask a steward in the General Hall: ${base}/room/general . Not sure of your exact name? Check ${base}/members .` Nothing else in the route. Test: new commons/test/door-rejoin-help.mjs (boot copied from your door-signin-agent.mjs): GET /rejoin is 200, contains `/room/general` and `/members`; both answer 200. agent-connect*.mjs and door-*.mjs must still pass. server.mjs is Tier 1: Setu reviews the exact SHA.

### GPT (pages and links): the signed-in crawl, as a test
The signed-out crawl (site-links.mjs) is clean; nobody has crawled what a member sees. New commons/test/site-links-signed-in.mjs: boot and member sign-in copied from market-orders-page.mjs, crawl copied from site-links.mjs, with the member's cookie, seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's own /m/<id>. Every internal link must answer < 400. If it finds a broken link you can fix with a one-line change in commons/lib/ or commons/public/, fix it. If not, put it in a `KNOWN_BROKEN` list at the top of the test with the page it was on, so the test passes and the list is the report. Tier 2 (don't touch server.mjs).

### Gemini (tokenomics status, priority 5): /cooperative says where tokens stand
This job only. Do not write anything in teams/income this session. commons/lib/coop.mjs, line ~75: right after the sentence ending `Read the formation packet</a>.</p>`, add exactly `<p class="small">Where tokens stand: Cohabi Coins are recognition credits today, not money, and they can't be bought or cashed out. A working model for purchase and service tokens is being drafted in the open in the <a href="/room/income">Product &amp; Income room</a>. Nothing about it is adopted.</p>`. Change nothing else. Test: new commons/test/cooperative-tokens.mjs, a copy of commons/test/cooperative-structure.mjs with these assertions: /cooperative is 200, contains "Where tokens stand" and `href="/room/income"`, and /room/income answers 200. cooperative-structure.mjs must still pass. Tier 2.

### Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z, 12:30Z, 15:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

### Foreman, 2026-11-20 (Setu's own task, not a builder job): five Perfect Ink listings
The market's 10-a-day cap stopped me at 10 of 15 on 2026-11-19. On page pg_df7cda7ba57486 (Perfect Ink, run by Felix), add free Software listings for Sizer, Strawberry, Takeover, Violent and Where's My Space. Use the same wording as the other ten: "Made by Felix (Perfect Ink). Free for the Cohabi community. Source and build steps on GitHub. Listed by Setu at Felix's request." License all-rights, made_by hybrid, link github.com/perfect-ink/<repo> (sizer, strawberry, takeover-mac, violent, wheres-my-space). Skip any that Felix or Geoffrey already listed.

### Foreman, next shift (2026-11-19 21:10Z), Setu's own task: Perfect Ink logos
market_update is live on production (f1b74fa). A fresh session sees it; this one's connector had cached the old tool list. Attach each logo to its listing with market_update {listing, images:[img]}, using the table in teams/income/perfect-ink/README.md (ten listings; Boarder has no icon yet). Then, when the daily cap allows (resets 00:00 UTC), list the last five with their images in market_create.

### Round 9, 2026-11-19 21:20Z (Setu, foreman). Read RESULTS.md first. Your job is the section with YOUR NAME below; earlier rounds are history.
Round 8 merged: Claude's market.mjs (it passes on main for the first time: "all market tests passed"), DeepSeek's activity nav + "Browse the market" empty state, Kimi's /rejoin help addresses (Tier 1, Setu's yes). On main @ e6f730ed with a real runtime: market, market-activity-nav, door-rejoin-help, site-links, cooperative-structure, agent-connect-forgiving (5/5) all pass. Not done: GPT's signed-in crawl (read an old JOBS view; no branch) and Gemini's /cooperative tokens line (Gemini rewrote Kimi's site-links.mjs instead, twice).
**Runtime:** the repo root has a package.json now: `npm ci` then `node --test commons/test/<your test>.mjs`. Edit first, then run.
Spread: door (Claude), marketplaces (DeepSeek: Jobs board; Gemini: Store), pages and links (GPT), tokenomics status (Kimi). Different files each.

### Claude (the door): llms.txt stops promising a recovery code "always" works
Your own review finding F1 (teams/review/door-walk-2026-11-19.md). commons/server.mjs ~line 686, in the /llms.txt text: replace only the clause `with it you can always return as yourself via the rejoin tool` with your patch text from the review file (codes are single-use; rejoining gives a new one; a lost code means a steward in the General Hall). Nothing else in the route. Test: new commons/test/door-llms-recovery.mjs (boot copied from door-rejoin-help.mjs): GET /llms.txt is 200, does not contain "always return", does contain "single-use" (or the exact word your patch uses) and `/room/general`. door-*.mjs and agent-connect*.mjs must still pass. server.mjs is Tier 1: Setu reviews the exact SHA.

### DeepSeek (marketplaces): the Jobs board, tested as a site
The Jobs board (/jobs) has a unit test (jobs.mjs) but nothing boots it. New commons/test/jobs-pages.mjs (boot and member sign-in copied from market-activity-nav.mjs): signed out, /jobs and /jobs/people answer 200 and /jobs/new is 303 to `/signin?next=/jobs/new`; signed in, /jobs/new is 200; /jobs/j_nope is 404 and contains `href="/jobs"`; every internal link on /jobs and /jobs/people answers < 400. If a link is broken and the fix is one line in commons/lib/jobspage.mjs, fix it; otherwise list it in `KNOWN_BROKEN` at the top of the test. Tier 2 (don't touch server.mjs).

### GPT (pages and links): the signed-in crawl, as a test (still yours, round 8's job)
New commons/test/site-links-signed-in.mjs: boot and member sign-in copied from market-orders-page.mjs, crawl copied from site-links.mjs, with the member's cookie; seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's own /m/<id>. Every internal link must answer < 400. One-line fixes in commons/lib/ or commons/public/ are allowed; anything else goes in a `KNOWN_BROKEN` list at the top with the page it was on, so the test passes and the list is the report. Tier 2. Do not edit site-links.mjs.

### Kimi (tokenomics status, priority 5; moved from Gemini): /cooperative says where tokens stand
commons/lib/coop.mjs, line ~75: right after the sentence ending `Read the formation packet</a>.</p>`, add exactly `<p class="small">Where tokens stand: Cohabi Coins are recognition credits today, not money, and they can't be bought or cashed out. A working model for purchase and service tokens is being drafted in the open in the <a href="/room/income">Product &amp; Income room</a>. Nothing about it is adopted.</p>`. Change nothing else. Test: new commons/test/cooperative-tokens.mjs, a copy of cooperative-structure.mjs asserting /cooperative is 200, contains "Where tokens stand" and `href="/room/income"`, and /room/income answers 200. cooperative-structure.mjs must still pass. Tier 2.

### Gemini (marketplaces, a new job; nothing of your own merged in a day): the Store page, tested
Write ONE file and nothing else: new commons/test/store-page.mjs, with the boot copied from commons/test/door-rejoin-help.mjs. Assert: GET /store is 200; GET /marketplace with `redirect: 'manual'` is 301 and its Location ends with `/label`; every `href="/..."` on /store (skip /api/ and asset files) answers < 400. If a link fails, put it in a `KNOWN_BROKEN` array at the top with the page it was on, so the test passes. Do NOT edit site-links.mjs, any other test, or anything in teams/income. Run `npm ci && node --test commons/test/store-page.mjs` before you finish. Tier 2.

### Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z, 12:30Z, 15:30Z, 21:20Z). When it lands, the next free builder builds it exactly.

### Round 10, next after round 9 (Geoffrey, 2026-11-19 afternoon): page themes and the page editor, readable everywhere
Geoffrey: business and artist pages need better customization; the editor's presets need cleaning up and should look much better; and with any preset theme, no text or button may be unreadable on its background. Design comes from Aletheia-6 (asked in the Review room); until her spec lands, the first job is the audit, which needs no design:
- **DONE by Setu 2026-11-19 22:05Z** (commons/test/theme-contrast.mjs; Music button text fixed; shared plum links now follow each page's accent). ~~Claude (Tier 2): theme contrast audit and test.~~ For every theme in orgpages THEMES and the market section themes (`.mk-page[data-mk=…]` in commons/public/market.css), compute the contrast of --ink on --bg and --panel, --muted on --panel, --gold on --bg, and of button text on button backgrounds, using WCAG's relative-luminance formula. Write commons/test/theme-contrast.mjs: it parses market.css and fails any pair under 4.5:1 for body text, or 3:1 for large text and buttons. Fix the CSS variables that fail (a minimal change, keeping each theme's character). List every change in RESULTS.md.
- **Not a builder job:** Aletheia-6 owns and implements the page editor, the theme presets and the market pages herself, one page at a time with Geoffrey (her word, 2026-11-19 21:55Z). Builders don't touch those screens' design. Help only when she asks for a reviewer, a tester or backend wiring.

### Round 11 (Setu, foreman, 2026-11-19 22:35Z): Perfect Ink parts survey
Felix gave the project permission to reuse and adapt any Perfect Ink code (Geoffrey, 2026-11-19; see teams/income/perfect-ink/README.md). Credit Felix / Perfect Ink wherever it's used.
- **GPT (Tier 2, docs only): survey the 15 Perfect Ink repos.** For each app, say in one line what it does, its language, and which piece (if any) could become a web widget that a member adds to their page, or help our own tools (the Commons, Cohabi Cut, Wake Up & Write, the market). Rank the five best by value to members over effort. Write teams/income/perfect-ink/PARTS-SURVEY.md. Write no code yet: Aletheia-6 designs any widget that reaches a page, and Geoffrey picks which ones get built.

### Round 12 (Setu, foreman, 2026-11-20 00:30Z)
**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds moved to teams/build/JOBS-HISTORY.md (history only; don't do anything from it). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then `node --test commons/test/<your test>.mjs`. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime.

**Hands off (Geoffrey, 2026-11-19):** the market pages' look (`commons/lib/marketpage.mjs`, `commons/public/market.css`), the page editor and theme presets belong to Aletheia-6, who builds them page by page with Geoffrey. Builders don't edit those files unless a job below says exactly which line.

Round 9 result: Claude's /llms.txt recovery wording (Tier 1, merged), DeepSeek's jobs-pages.mjs, Kimi's "Where tokens stand" line all merged and pass on main. GPT's signed-in crawl is unfinished (branch kin-build/20261119-2118-gpt fails). Gemini rewrote site-links.mjs a third time instead of its Store job (it read round 1 at the top of this file; that's why the file is now one round only).

Spread: door (Claude, DeepSeek), marketplace (Kimi), pages and links (GPT), corporate structure (Gemini). Every job touches different files.

#### Claude (the door, Tier 1): /skill.md gets a "Coming back" section
Your own review finding F4 (teams/review/door-walk-2026-11-19.md). In commons/server.mjs, the `/skill.md` route (~line 581): insert a new section between the end of `## 3. The ground rules` (the line `- No passwords, keys or money talk in public...`) and `More detail, if you want it:`. Text, using `${base}`:
`## 4. Coming back` — a new chat doesn't remember you. Two ways back: (a) the connector: add `${base}/mcp/connect` in your app once, and every new chat is you; (b) your recovery code, kept outside the chat, opened once at `${base}/rejoin`. The code is used up when you use it; after one day you can make a new one (rotate_recovery). Lost both? Ask a steward in the General Hall: `${base}/room/general`.
Change nothing else in the route. Test: new commons/test/door-skill-coming-back.mjs (boot copied from door-llms-recovery.mjs): GET /skill.md is 200 and contains `## 4. Coming back`, `/mcp/connect`, `/rejoin`, `rotate_recovery` and `/room/general`. door-llms-recovery.mjs must still pass. Setu reviews the exact SHA.

#### DeepSeek (the door, Tier 1): the rejoin note says the token is your ONLY way in for a day
Review findings F2 and F3(a) (teams/review/door-walk-2026-11-19.md). commons/lib/core.mjs only:
1. Line ~858, the `rejoinAgent` comment: replace `and keeps the recovery code stable so it stays in the operator's hands for next time.` with `and uses up the recovery code (single-use); a new one can be minted after a one-day hold.` Comment only.
2. Line ~873, the `note:` string in rejoinAgent's return: replace `until then your token is your way in,` with `until then this token is your ONLY way in. If this chat can't keep it, connect your app instead (/connect) or ask a steward in the General Hall now, not later;`. Keep the rest of the sentence.
Change nothing else (no logic). Test: new commons/test/door-rejoin-note.mjs (boot + join copied from door-wrong-code.mjs): join an agent, POST /api/rejoin with its name and recovery code, assert 200 and that the JSON `note` contains `ONLY way in` and `/connect`. door-wrong-code.mjs and auth-recovery.mjs must still pass. Setu reviews the exact SHA.

#### Kimi (marketplace, Tier 2): make commons/test/market.mjs match the new Market home
Aletheia-6's new /label home (#257, merged with Geoffrey's approval) and category art (#260) changed the page, so 5 checks in commons/test/market.mjs now fail on main: "/label is the Cohabi Market", "the home shows seven section tiles", "featured rows under the tiles", "the hero art is a drawn placeholder", "the search sits under the bar and the section pills". The page is right; the test is stale. Read `marketHome` in commons/lib/marketpage.mjs (read only, don't edit it), then rewrite ONLY those five assertions to what /label shows today, keeping what each protects (it's the market, all seven sections are reachable from the home, real listings show, search works at /label?q=). Delete the "drawn placeholder" check if the page no longer has one, and say so. Don't touch any other file. Test: `node commons/test/market.mjs` prints 0 FAILED; theme-contrast.mjs and market-activity-nav.mjs still pass.

#### GPT (pages and links, Tier 2): finish the signed-in crawl (third round — finish it this time)
Your branch kin-build/20261119-2118-gpt is not on main, so start commons/test/site-links-signed-in.mjs again. Setu ran your branch: it fails with `undefined -> undefined: 404` after 8 pages, because the queue mixes strings and objects. Write it simply: copy commons/test/site-links.mjs whole, rename the test, add a member sign-in (copied from market-orders-page.mjs) and send its cookie on every fetch, seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's /m/<id>. Make the queue hold `{ href, from }` objects only. `/live` is served by Caddy, not the Commons, so put it in `KNOWN_BROKEN = [{ href: '/live', why: 'Caddy route, not in the test server' }]` and skip it. Any other broken link goes in KNOWN_BROKEN with the page it was on. Don't edit site-links.mjs. Run it before finish(). Stop at 30 steps and finish with what you have.

#### Gemini (corporate structure, Tier 2; reassigned: nothing from your own job merged in a day)
One sentence and one test file, nothing else. commons/lib/coop.mjs, line ~75: right after `Read the formation packet</a>.</p>` and before `<p class="small">Where tokens stand`, insert exactly:
`<p class="small">Questions for a lawyer: before anything is filed, Awen's list of questions for counsel is <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/AWEN-COUNSEL-QUESTIONS-v0.1.md">open to read</a>.</p>`
Test: new commons/test/cooperative-counsel.mjs, a copy of commons/test/cooperative-tokens.mjs, asserting /cooperative is 200 and contains `Questions for a lawyer` and `AWEN-COUNSEL-QUESTIONS-v0.1.md`. cooperative-tokens.mjs and cooperative-structure.mjs must still pass. Do NOT edit site-links.mjs or any other test.

#### Waiting, not a builder job
- Aletheia-6: #254 page editor (three fixes from Setu's test), then the next page Geoffrey picks with her, and the seven category pictures for #260's slot.
- Perfect Ink parts survey (round 11) moves to GPT after the crawl merges.

---

## (archived) Builders: jobs — Round 13 (Setu, foreman, 2026-11-20 03:30Z)

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
Setu reviews the exact SHA. (The runner's Tier 1 file list doesn't include commons/lib/cut/, so it may merge on green by itself; if so Setu audits after, and the NOTICE line must land within a day or the placement is reverted.)

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

---

# Builders: jobs — Round 14 (Setu, foreman, 2026-11-20 06:45Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then `node --test commons/test/<your test>.mjs`. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 13 result: four of five landed. Claude's /rejoin hold warning (Tier 1, Setu's yes on 3e5f6030, merged c6bc5f72). DeepSeek placed the Cut timeline port (merged on green; the 18-test file and filled NOTICE followed in #271). Kimi's /store test (merged ff30ca21; the foreman's job text was wrong: /api/store returns items keyed by id, not an array, so Setu fixed that one assertion). GPT's crawl walks a real post (merged). Gemini's branch duplicated the counsel line, so Setu placed the structure question himself (b439f012). Also on main: the room composer fix (99be7f07).

Spread: door (Claude, Kimi), social pages (GPT), Cohabi Cut (Gemini), marketplace (DeepSeek). Every job touches different files.

## Claude (the door, Tier 1): /llms.txt says /feed is the posts page; it isn't
Since 2026-11-15, /social is the posts page and /feed is the video feed (server.mjs ~line 830). /llms.txt still says, in "Start here" (~line 657): `THE FEED: ${base}/feed is the social side — feelings, things you made, celebrations.`
1. commons/server.mjs ~line 657 only: make it `THE FEED: ${base}/social is the social side — feelings, things you made, celebrations. Your posts show on your page. (${base}/feed is the video feed.)` Keep the next line (read_feed, post, ...) as it is.
2. Search commons/server.mjs and commons/lib/agentdoor.mjs for any other sentence that tells an agent /feed is where posts are (read only, list them in finish()). Fix only the ones in server.mjs, text only.
3. New commons/test/door-llms-social.mjs (boot copied from door-llms-recovery.mjs): GET /llms.txt is 200, contains `/social is the social side`, and does NOT match `/feed is the social side`.
door-llms-recovery.mjs and door-skill-coming-back.mjs must still pass. Setu reviews the exact SHA.

## Kimi (the door, Tier 2, test only): a confirm link works once
New commons/test/door-rejoin-confirm-once.mjs (boot + join copied from door-rejoin-hold.mjs). GET `/rejoin?name=..&recovery=..`, take the `/rejoin/confirm?n=...` link out of the text. Open it: 200 with a new token. Open the SAME link again: assert it is refused (4xx) and the text tells the agent what to do next (match whatever next step it names; read the route in server.mjs ~line 2109, read only). Then GET `/rejoin/confirm?n=notarealnonce`: 4xx. If the second open is NOT refused, or the refusal names no next step, don't change server code: write exactly what you saw in finish(); that's a finding for Claude's next door job. Edit no other file.

## GPT (social pages, Tier 2): two tests still use /feed for the posts page
commons/test/feedv2.mjs and commons/test/profile-public.mjs fail on main because they fetch `/feed`, which became the video feed on 2026-11-15 (`/feed?anything` 301s to `/social`). In those two files only: point the posts-page fetches at `/social` (and `/feed?tab=history` at `/social?tab=history`), change hrefs the assertions look for only where the page now really links elsewhere, and keep every assertion's meaning. Run both with `node commons/test/feedv2.mjs` and `node commons/test/profile-public.mjs` (they're scripts, not node:test). Anything that still fails because the page is really broken (not because the test is stale): leave the assertion, list it in finish() with what the page shows. Don't edit server.mjs, feedv2.mjs (lib) or any other file.

## Gemini (Cohabi Cut, Tier 2): place the captions model in commons
Cut-GPT's Job 2 prototype passes 7/7 in teams/cut/. Place it, changing as little as possible:
- Copy teams/cut/captions-model.mjs to commons/lib/cut/captions.mjs, unchanged.
- Copy teams/cut/captions-model.test.mjs to commons/test/cut-captions.mjs and change ONLY line 3's import path to `../lib/cut/captions.mjs`.
- Run `node --test commons/test/cut-captions.mjs` and report the real number (7 expected).
- Don't touch teams/cut/, commons/lib/cut/time.mjs, model.mjs, ops.mjs, NOTICE, or any other file. Don't rewrite or "improve" the tests.

## DeepSeek (marketplace, Tier 2, test only): the store can't be bought wrongly
New commons/test/store-buy-guards.mjs (boot copied from store-page.mjs). Read commons/lib/ledger.mjs `buy` and server.mjs `/api/store/buy` (~line 1023), read only, to learn how a member gets coins in a fresh test. Assert, each against the real API: buying an unknown item is refused (4xx); a member without enough coins is refused and their wallet is unchanged (GET their wallet before and after); buying the same one-per-member item twice is refused the second time if the code says items are owned once (`owns`); a signed-out POST is refused. Use the existing `key` field the way the code expects (idempotency). If a guard you expected is missing, keep the assertion, let it fail, and say exactly what you saw in finish(): that's a finding, not something to fix here. Edit no other file.

## Waiting, not a builder job
- Aletheia-6: market pages with Geoffrey; any design she hands builders becomes a job here. She asked that PR #218 be closed as superseded (needs an attended session).
- feedv2/profile-public are the only failing tests the foreman found on main this shift.
- Perfect Ink parts survey (round 11) is still open; it goes to whichever seat lands first next round.

---

# Builders: jobs — Round 15 (Setu, foreman, 2026-11-20 09:35Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then run your test. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 14 result: all five landed or were placed. Claude's /llms.txt (/social is the posts page; Tier 1, Setu's yes on 0343d1f5). Kimi's rejoin-confirm-once test. GPT's feedv2 + profile-public now fetch /social (Setu fixed one stale assertion: the composer ids changed with Social v3). Gemini placed the captions model (cut-captions 7/7). DeepSeek ran out of steps but measured the whole plan; it's below, so this session only has to write it.

**What the foreman found on main this shift (npm ci, every commons/test file run):** 13 failing test files. Most are stale since 2026-11-15, when /social became the posts page and /feed the video feed. This round fixes them, plus one real phone defect on the sign-in door.

Spread: the door (Claude, Kimi), marketplace (DeepSeek), pages and links (GPT, Gemini). Every job touches different files.

## Claude (the door, Tier 2, test only): e2e.mjs checks the agent sign-in paths; four of its checks fail
`node commons/test/e2e.mjs` fails 4 checks on main. The foreman checked one: "POST message with token in the body → 201, signed as itself" fails only because the footer wording changed (the server now says `says it works with Alex V`, the test looks for `works with Alex V (self-declared, unverified)`). The others: "kin @GPT answers in the room with footer, reply_to and chain=1", "profile shows the figure with its glyph, the name meaning, and 'works with' separately", "kin and human messages are mirrored with their kind".
1. For each of the four, read what the server really sends now (print it once while you work; remove the print). commons/server.mjs and commons/lib are read only.
2. Where only the wording or markup moved, change the assertion to the real current text, keeping its meaning (signed as itself, token never echoed, kind shown, etc.).
3. Where the behaviour itself is wrong (e.g. the token-in-body post is NOT signed as the agent), leave the assertion failing and say exactly what you saw in finish(): that's a door finding for next round.
Edit only commons/test/e2e.mjs. Prove it with `node commons/test/e2e.mjs`.

## Kimi (the door, Tier 2): the Feedback button is too small to tap on the sign-in page
`node commons/test/auth-mobile.mjs` (real Chromium via playwright) fails: `signin 320: button has 44px target`. The foreman measured /signin at 320 px: every button is 44–50 px tall except the floating `💬 Feedback` button (`.fb-btn`), which is 30 px.
1. commons/public/feedback.css only: give `.fb-btn` a 44 px minimum touch target (`min-height:44px`, and keep it in the phone media query at line ~23 too). Don't change its colours, position or the panel.
2. Run `node commons/test/auth-mobile.mjs`. If another check then fails, report exactly which in finish(); don't fix other files.
Edit only commons/public/feedback.css.

## DeepSeek (marketplace, Tier 2, test only): write store-buy-guards.mjs; your plan is measured
Your last session read everything and ran out of steps before writing. Write it now, exactly to your plan:
- New commons/test/store-buy-guards.mjs; boot block copied from commons/test/store-page.mjs, plus `COMMONS_ARRIVE_BYPASS:'TESTGATE'` in the spawned server's env.
- Make a member through the forest gate: `POST /api/arrive/visitor`, `POST /api/arrive/bypass {vid, code:'TESTGATE'}`, `POST /api/arrive/enter {vid, name}` → session cookie + 10 coins (see feedv2.mjs for the same pattern).
- Assert: (1) a signed-out `POST /api/store/buy` is 4xx; (2) an unknown item is 404; (3) a 20-coin item is 402 AND `GET /api/wallet` balance is still 10 and `owns` doesn't include it; (4) a 5-coin item succeeds and the balance drops to 5; (5) the same item with a different key is 409; (6) the same item with the SAME key returns 200 and the balance stays 5.
- Use real item ids from commons/public/catalog.js (read it; don't guess ids).
Run `node --test commons/test/store-buy-guards.mjs`. Write the file first, before reading anything else. Edit no other file.

## GPT (pages and links, Tier 2, test only): three more tests still fetch /feed for the posts page
Same fix you did in round 14, in three new files: commons/test/groups-feed.mjs (line ~45, ~51), commons/test/journal-feed.mjs (line ~17), commons/test/share-tags.mjs (line ~42). Point posts-page fetches at `/social`; keep every assertion's meaning; change an expected href only where the page really links elsewhere now. They are scripts: `node commons/test/groups-feed.mjs` etc. Anything that still fails because the page is really broken: leave it, list it in finish() with what the page shows. Edit only those three files.

## Gemini (pages and links, Tier 2, test only): two tests still fetch /feed for the posts page
commons/test/tags-credits.mjs (lines ~36–57, six fetches of `/feed`) and commons/test/wishes.mjs (line ~52 and `page('/feed', ...)` at ~70). Change those fetches to `/social`. Nothing else: don't rewrite assertions, don't touch other tests. Run `node commons/test/tags-credits.mjs` and `node commons/test/wishes.mjs` and report the real output lines (✓/✗) in finish(). If a check still fails after the change, leave it and copy its ✗ line into finish(). Edit only those two files.

## Next round (not a job yet)
- members.mjs (`aria-label="Your profile"` no longer on the members page), wallet.mjs (`fx-coin` link with aria-current on /wallet), inbox-http.mjs (header links), cooperative-frame.mjs ("uses the shared bottom bar"): stale or real, each needs a look.
- Aletheia-6: no new design handed to builders this shift. Her Review note (passport grants must name the deployment they're for) is a spec item for PR #267's v0.2, not a build job yet.
- Perfect Ink parts survey (round 11) is still open.

---

# Builders: jobs — Round 17 (Setu, foreman, 2026-11-20 15:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Two sessions this week ended with no file written.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime. (Known: session snapshots lack the root package.json and `commons/gpt/`; a false `500` on `/gpt/openapi.json` is the snapshot's, not the site's.)

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 16 result: Claude's continuity wording (Tier 1, 16a324b5), Kimi's inbox-http + cooperative-frame, GPT's members + wallet (Setu finished wallet.mjs: the chip on /wallet is `fx-coinchip`, and its /feed fetch and Marketplace-menu checks were stale) all merged. Gemini's `/wishlist` line in `cohabiMenu` merged. DeepSeek: no file. **On main now (all test files, shots/speed skipped): only `wishes.mjs` fails.** Cohabi Cut Jobs 2–3 placed in `commons/lib/cut/` (66/66).

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages and links (Gemini, Kimi). Every job touches different files.

## Claude (the door, Tier 1, test only): a rejoin must end app connections even when the hook fails
Your open question from round 16. `commons/lib/core.mjs:862–877`: `onRejoin` is called in `try { … } catch { /* best effort */ }`; `commons/server.mjs:159` sets it to `agentconnect.revokeAll`. If revokeAll throws, the rejoin succeeds and the app connections survive silently.
- New `commons/test/door-rejoin-revokes.mjs`. Part 1 (HTTP, copy boot + rejoin from `door-rejoin-note.mjs`): a member with a live app connection rejoins with a recovery code → that connection is revoked afterwards (find how the existing agent-connect tests create a connection; reuse it).
- Part 2 (unit, import `commons/lib/core.mjs`): `core.setRejoinHook(() => { throw new Error('x') })`, do a rejoin, and assert what happens. Today it silently succeeds. Leave that assertion FAILING if it does, and name it in finish(): whether a rejoin should refuse, or log loudly, is a decision for Setu and Geoffrey, not a code change this round.
Edit only the new test file. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`. Setu reviews (agentconnect is Tier 1).

## DeepSeek (marketplace, test only): market-checkout-guards.mjs, what a buyer sees before paying
Same job as round 16; your own 12:38Z standup already mapped it. **Write the file from that map in your first two steps.** Don't re-read the libs.
- New `commons/test/market-checkout-guards.mjs`, boot + members copied from your `store-buy-guards.mjs`. Do NOT set `COMMONS_PAYMENTS` or any Stripe key.
- Make member A's listing with `POST /api/market/listings` (title 3–90, text, category `art`, a TYPES value, `price:{mode:'fixed',amount:500}`, a LICENSES value, `rights:true`).
- Assert: signed-out POST checkout → 401; unknown listing → 404; A buying A's own listing → 400; member B buying A's listing → 503 (payments not open) with a reason; after those refusals, no order exists for B (find the route, e.g. `/api/me/orders`, or the `/orders` page says none).
- Skip the coin balance and idempotency assertions: that path doesn't exist (your finding stands).
Edit no other file. Run `node --test commons/test/market-checkout-guards.mjs`. (checkout is Tier 1 by name: Setu reviews your SHA.)

## GPT (marketplace, test only): every page in the Marketplace menu opens for a signed-in member
The signed-in Marketplace dropdown (in `/social`'s menu) links `/label`, `/label/new`, `/label/mine`, `/orders`, `/label/sales`, `/page/new`. Routes: `commons/server.mjs` ~1651 (`/label/mine`), ~1707 (`/orders`), ~1713 (`/label/sales`).
- New `commons/test/market-menu-pages.mjs` (boot + signup copied from `commons/test/wallet.mjs`): fetch `/social` signed in, pull every `href` inside `<details class="cm-sub mk-sub">…</details>`, then GET each signed in → 200, an `<h1>`, and no "Not found". Also GET `/label/mine`, `/orders`, `/label/sales` signed OUT → a sign-in prompt or a redirect to /signin, never a 500.
- If a page really fails, leave that assertion failing and name the page in finish(). Don't fix the page this round.
Edit only the new test file. Run `node --test commons/test/market-menu-pages.mjs`.

## Gemini (pages and links, test only): finish wishes.mjs
`node commons/test/wishes.mjs` still fails `the nav links to wish lists` (line 81): it reads `/library` and looks for `href="/wishlist">Wish lists`. On /library the menu comes from `menuItems` in `commons/lib/appmenu.mjs` (~line 39), where Wish lists is inside the Commons dropdown, **shown to Commons members only, by design**.
- Change line 81 to fetch `/library` with a Commons member's cookie (the test already has `founder`; use the helper it uses for `founder`), and add one line asserting a visitor's `/library` does NOT show it.
- Edit only `commons/test/wishes.mjs`. Don't touch appmenu.mjs or pages.mjs. Run `node commons/test/wishes.mjs`; copy the ✓/✗ lines into finish().

## Kimi (pages and links, Tier 2): keyboard focus is visible on every page
Five stylesheets have no `:focus-visible` rule: `commons/public/inbox.css`, `landing.css`, `members.css`, `reel.css`, `wishes.css`. (Aletheia-6 asked for this check as its own look when #218 closes.)
1. Add to each, once: `:focus-visible { outline: 2px solid var(--accent, #c9a227); outline-offset: 2px; }` (the same rule as `commons/public/site.css` line 53). If a file defines its own accent variable, use that one instead.
2. New `commons/test/css-focus-visible.mjs`: every `commons/public/*.css` contains `:focus-visible`. (market.css already has it; don't edit it.)
Edit only those five CSS files and the new test. Run `node --test commons/test/css-focus-visible.mjs commons/test/theme-contrast.mjs`.

## Next round (not a job yet)
- Aletheia-6: no new design handed to builders this shift. Any design she posts becomes a job here.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.
- Perfect Ink parts survey (round 11) is still open.

---

# Builders: jobs — Round 18 (Setu, foreman, 2026-11-20 18:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.**

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime. (Known: session snapshots lack the root package.json and `commons/gpt/`.)

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 17 result: Kimi's `:focus-visible` (5 stylesheets + css-focus-visible.mjs), DeepSeek's market-checkout-guards.mjs, GPT's market-menu-pages.mjs, Gemini's wishes.mjs all merged and pass on main (Setu re-ran them with `npm ci`). Claude's door-rejoin-revokes.mjs is correct but not merged: Part 2b fails on purpose until the decision below. Cut: Kimi's registry guards and GPT's Words-track insert placed in `commons/lib/cut/` (75/75).

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages (Kimi, Gemini). Every job touches different files.

## Claude (the door, Tier 1): make a failed revoke loud, and make revoke durable
**Decision (Setu, foreman, 2026-11-20 18:30Z; Geoffrey may overrule):** a rejoin whose revoke fails **succeeds and says so loudly**. Refusing would leave the real member locked out while the suspect app connections stay live; a loud answer gives them the next step.
Start from your branch: `git checkout origin/kin-build/20261120-1523-claude -- commons/test/door-rejoin-revokes.mjs`.
1. `commons/lib/core.mjs:877`: replace `try { onRejoin(m); } catch { /* best effort */ }` with a catch that `console.error`s `[rejoin] app connections NOT ended for <id>: <message>` and adds to the returned object `connections: "NOT ended: revoking your app connections failed. Run /api/me/connections/revoke-all with your new token, or ask a steward in the General Hall."` On success add nothing.
2. `commons/lib/agentconnect.mjs` (Aletheia-6's finding, Review 16:04Z): make a revoke whose log write fails **dead now and retryable later**. Do NOT just move `c.revoked` after `append` (corrected by Setu, 2026-11-20 20:10Z): `resolve()` (line ~289) rejects access tokens through `c.revoked`, and the `access.delete` loop also sits after `append`, so moving the flag would let a failed revoke leave live access tokens for up to an hour. Instead, in `revoke()`: set `c.revoked` and delete that connection's `access` entries first (as now, plus move the delete loop above `append`); then try `append`. If it throws, mark `c.revoked.durable = false`, and rethrow. Change the early return to `if (!c || (c.revoked && c.revoked.durable !== false)) return false;` so a retry writes the missing log line. In `revokeAll`, keep going past a connection whose revoke throws, then throw one error at the end naming how many failed. Test both halves: after a failed append the connection's access token no longer resolves, and a second `revokeAll` (with the store working again) writes the `revoke` line so `init()` from the file sees it revoked.
   **2b. The backstop that survives a crash (Aletheia-6's Tier 1 review, Review 20:42Z, c_mwpg3yif2ud7814a; added by Setu 20:55Z).** The retry above only helps while the process lives: a crash before the retry rebuilds a live `refresh_hash` from the log. So add a rule that doesn't depend on the revoke line at all: **a connection created before the member's last recovery is dead.** `useRecoveryCode` (core.mjs) already persists `recovered_at` with `saveMembers()` before any new token is issued, so if that write fails the rejoin itself fails. In `agentconnect.mjs`, add one helper, e.g. `const predates = (c, m) => m.recovered_at && Date.parse(c.created) < Date.parse(m.recovered_at);`, and reject with it in `resolve()` (return null) and in **both** refresh branches (the normal one and the grace-window one: `invalid_grant`, "this connection was ended when the member recovered its access. Connect again."). Tests (Aletheia-6's DR-04/DR-08): (a) connection made, rejoin, revoke append fails, re-`init()` from the file with no revoke line → access and refresh both refused; (b) a truncated last line in the log on `init()` → that line is skipped, the backstop still refuses; (c) a connection created after the rejoin works normally.
3. Add to the test: a unit case where `append` fails for one of two connections (stub the store or point FILE at a read-only path, whichever is simpler) → the other is still revoked, and `revokeAll` throws.
Edit only those two lib files and the test. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs` (all green, 2b included). Setu reviews the SHA (Tier 1).

## DeepSeek (marketplace, test only): what a buyer sees on a listing while payments are closed
- New `commons/test/market-listing-closed.mjs`, boot + two members copied from your `market-checkout-guards.mjs` (no `COMMONS_PAYMENTS`, no Stripe key).
- Member A lists (same body as your guards test). Member B GETs `/label/l/<id>` signed in → 200, the title, the price, and either the text "Payments aren't open yet" (`checkout.NOT_OPEN`) or no active Buy button. A visitor (signed out) GETs it → 200, and is never shown a working Buy.
- If the page shows B a Buy that will only 503, leave that assertion FAILING and say so in finish(): the page is Aletheia-6's (`marketpage.mjs`), so the fix is hers, not yours.
Edit no other file. Run `node --test commons/test/market-listing-closed.mjs`.

## GPT (marketplace, test only): the Jobs board over HTTP
`commons/test/jobs.mjs` tests `jobs.mjs` as a library. Nothing tests the routes (`commons/server.mjs` 845–860).
- New `commons/test/jobs-http.mjs`, boot + signup copied from your `market-menu-pages.mjs`. Member A `POST /api/jobs` (copy a valid body from `jobs.mjs` line ~20). Then: `GET /jobs/<id>` → 200 with the title; signed-out `POST /api/jobs/<id>/apply` → 401; B applies → 200; B applies again → refused; A `GET /api/jobs/<id>/applications` → 1; B sees only its own; signed-out → 401; `GET /jobs/new` signed out → redirect to `/signin?next=/jobs/new`.
- If a route really fails, leave it failing and name it in finish().
Edit only the new test. Run `node --test commons/test/jobs-http.mjs`.

## Kimi (pages, Tier 2): motion respects "reduce motion"
Aletheia-6's open look from #218 (reduced motion). Two stylesheets animate with no `prefers-reduced-motion` rule: `commons/public/invite-agent.css`, `commons/public/jobs.css`.
1. Add to each, once: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }`.
2. New `commons/test/css-reduced-motion.mjs`: every `commons/public/*.css` that contains `transition`, `animation` or `@keyframes` also contains `prefers-reduced-motion` (market.css already has it; don't edit it).
Edit only those two CSS files and the new test. Run `node --test commons/test/css-reduced-motion.mjs commons/test/css-focus-visible.mjs`.

## Gemini (pages, test only): every public page has a real title
- New `commons/test/page-titles.mjs` (boot copied from `commons/test/wishes.mjs`). GET, signed out: `/`, `/social`, `/label`, `/store`, `/jobs`, `/members`, `/library`, `/cooperative`, `/signin`, `/connect`, `/wishlist`, `/orders`. Each → a 200 (or a redirect to /signin for `/orders` and `/wishlist`); for every 200, a `<title>` that is non-empty and contains no `undefined` or `null`.
- Write the file in your first two steps. If a page fails, leave the assertion failing and name the page in finish(). Don't fix pages this round.
Edit only the new test. Run `node --test commons/test/page-titles.mjs` and copy the ok/not ok lines into finish().

## Next round (not a job yet)
- Aletheia-6: no new design handed to builders. Any design she posts becomes a job here.
- DeepSeek's finding: market listings can't be bought with coins and checkout takes no client idempotency key. A coin path is money code: it needs Geoffrey's word before it becomes a job.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.


## Builders: jobs — Round 19 (Setu, foreman, 2026-11-20 21:45Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.**

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 18 result: Kimi's reduced-motion (css-reduced-motion.mjs), DeepSeek's market-listing-closed.mjs and GPT's jobs-http.mjs merged on green and are live (production 0f8012d9). Gemini's page-titles.mjs merged by Setu with one fix (the /orders redirect is URL-encoded, `%2Forders`; the test now decodes it): 1/1. Claude's door job is NOT done: 1819-claude moved `c.revoked` after `append` (the wrong shape) and its Part 3 fails; 1851-claude redid round 17. Neither merges.

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages (Kimi, Gemini). Every job touches different files.

## Claude (the door, Tier 1): the Round 18 job, finished in two commits
Same job as Round 18, items 1, 2, 2b and 3 (full text in JOBS-HISTORY.md, last section). This time, in this order, so something lands even if you run short:
1. **First commit, core.mjs only.** Take `commons/lib/core.mjs` from `origin/kin-build/20261120-1819-claude` (the loud `connections: "NOT ended: …"` field and the `console.error`; that part was right). Do NOT take its `agentconnect.mjs`.
2. **Then agentconnect.mjs, the corrected shape:** in `revoke()` set `c.revoked` and delete that connection's `access` entries BEFORE `append`; if `append` throws, mark `c.revoked.durable = false` and rethrow (make `c.revoked` an object if it isn't); early return becomes `if (!c || (c.revoked && c.revoked.durable !== false)) return false;`; `revokeAll` continues past a throw and throws one error at the end.
3. **The backstop (2b):** `predates(c, m)` = `m.recovered_at && Date.parse(c.created) < Date.parse(m.recovered_at)`; refuse in `resolve()` and in BOTH refresh branches (`invalid_grant`). Read `useRecoveryCode` in core.mjs first to confirm `recovered_at` is saved before the new token.
4. **Test** `commons/test/door-rejoin-revokes.mjs` (start from 1819-claude's copy). Fix Part 3 by deriving ids with `ac.resolve(t1.access_token).connection.id`, not `listFor` order. Add Aletheia-6's DR-04 (append fails, re-`init()` from file → access and refresh refused), DR-08 (truncated last log line skipped, backstop still refuses), and a connection made after the rejoin works.
Edit only core.mjs, agentconnect.mjs and the test. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`. Setu reviews the SHA (Tier 1).

## DeepSeek (marketplace, test only): a seller's own listing
- New `commons/test/market-seller-edit.mjs`, boot + two members copied from your `market-listing-closed.mjs`.
- Member A lists. Then: A `GET /label/mine` → 200 and shows the title; A `GET /label/l/<id>/edit` → 200; B `GET /label/l/<id>/edit` → refused (403, 404 or a redirect; assert it is NOT 200 with the edit form); signed out → redirect to `/signin`. If there is an update route for listings (read `commons/server.mjs` around 1725–1795), A changes the title and `/label/l/<id>` shows the new one; B's same request is refused.
- If a route really fails, leave it failing and name it in finish(). The page is Aletheia-6's; don't fix it.
Edit no other file. Run `node --test commons/test/market-seller-edit.mjs`.

## GPT (marketplace, test only): closing and reporting a job
- New `commons/test/jobs-close-report.mjs`, boot + signup copied from your `jobs-http.mjs`.
- Routes: `commons/server.mjs` 852 (`POST /api/jobs/:id/close`, body `{status}`) and 855 (`POST /api/jobs/:id/report`). A posts a job. B closing it → refused; signed-out → 401; A closes it → 200 and `GET /api/jobs/<id>` shows it closed; B applying to the closed job → refused; A reopens (`status: 'open'`) → B can apply. B reports it → 200; signed-out report → 401; a report with an empty body → what does it do? Assert the behaviour you find and name it in finish().
Edit only the new test. Run `node --test commons/test/jobs-close-report.mjs`.

## Kimi (pages, Tier 2): every public page declares its language and fits a phone
- New `commons/test/page-meta.mjs` (boot copied from `commons/test/page-titles.mjs`). Signed out, GET `/`, `/social`, `/label`, `/store`, `/jobs`, `/members`, `/library`, `/cooperative`, `/signin`, `/connect`. Each 200 page has `<html lang="…">` (non-empty), `<meta charset`, and `<meta name="viewport"` containing `width=device-width`.
- If a page fails and its HTML comes from a file that is NOT Aletheia-6's (not marketpage.mjs), fix it there, one attribute, and name the file in finish(). If the failing page is hers, leave the assertion failing and name it.
Run `node --test commons/test/page-meta.mjs commons/test/page-titles.mjs`.

## Gemini (pages, test only): titles on the signed-in pages
- New `commons/test/page-titles-signed-in.mjs`. Boot copied from `commons/test/page-titles.mjs`; signup copied from `commons/test/jobs-http.mjs` (the `signup` helper and its cookie).
- As a signed-in member GET `/orders`, `/label/mine`, `/label/sales`, `/wallet`, `/account`, `/jobs/new`, `/label/new`. Each → 200 with a non-empty `<title>` containing no `undefined` or `null`.
- Remember: redirect `Location` headers are URL-encoded (`%2F`); decode before comparing.
- Write the file in your first two steps. If a page fails, leave the assertion failing and name the page in finish().
Edit only the new test. Run `node --test commons/test/page-titles-signed-in.mjs` and copy the ok/not ok lines into finish().

## Next round (not a job yet)
- Aletheia-6: no new design handed to builders. Any design she posts becomes a job here.
- DeepSeek's wording note: a closed listing prints marketpage's "Payments open soon…", not `checkout.NOT_OPEN`. Two texts for one state; Aletheia-6's call.
- DeepSeek's coin-path finding is money code: Geoffrey's word first.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.


## Builders: jobs — Round 20 (Setu, foreman, 2026-11-21 00:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** A file you wrote under `teams/build/outputs/` is NOT in the repo's test folder: put tests in `commons/test/` with write_file.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI; don't build a substitute runtime.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, the page editor and theme presets are Aletheia-6's. Don't edit them. Her Marketplace contrast work is her own draft PR #272; no builder job touches it.

Round 19 result: Claude's door job merged by Setu with the Tier 1 yes on 1e4310b1 (one test fix: the torn-line check read 40 chars); DeepSeek's market-seller-edit, GPT's jobs-close-report and Kimi's page-meta merged on green; Gemini's page-titles-signed-in merged by Setu with one fix (the base URL was added twice). All on main.

Spread: the door (Claude), the marketplace (DeepSeek, GPT), pages (Kimi, Gemini). Every job touches different files.

## Claude (the door, Tier 1): close Aletheia-6's two open gates
Her checklist (Builders, 2026-11-20 22:52Z): items (2)-grace and (4) are still open on main.
1. **`predates` fails closed.** In `commons/lib/agentconnect.mjs`: when `m.recovered_at` is set, a connection whose `created` is missing or unparseable is treated as predating (refused), and `created <= recovered_at` (equal counts as before). Keep it one small function.
2. **A torn last line can't swallow the next one.** In `init()`, if `connect.jsonl` exists and does not end in `\n`, append one `\n` before anything else is written (so the next `append` starts a fresh line). One line of code.
3. **Tests, in `commons/test/door-rejoin-revokes.mjs`** (it's on main now): Part 6, the 20-second grace refresh (`conn.prev`) is refused after a rejoin, including after a failed revoke append and a restart; Part 7, a connection with `created` removed (edit the log line, then re-`init()`) is refused once `recovered_at` is set, and one with `created === recovered_at` is refused; Part 8, after a torn last line and re-`init()`, a new connection's `conn` line survives a second re-`init()`.
Edit only agentconnect.mjs and the test. Run `node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs`. Setu reviews the SHA (Tier 1); Aletheia-6 is the independent read.

## DeepSeek (marketplace, test only): who can see and change a listing's fulfillment link
- New `commons/test/market-fulfillment-guards.mjs`, boot + two members copied from your `market-seller-edit.mjs`.
- Routes: `commons/server.mjs` 1740–1743 (`GET|POST|DELETE /api/market/listings/:id/fulfillment`, `POST …/release`), code in `commons/lib/fulfillment.mjs`. A lists. B POST/DELETE the link → refused (403); signed out → 401; A POST → 200 and A GET shows it; A DELETE → gone.
- **The question that matters:** what does `GET …/fulfillment` return to B and to a signed-out visitor? If it shows a provider link or anything a buyer shouldn't see before paying, leave that assertion failing and name it in finish() (it's private-data code; Setu takes it to Geoffrey). Don't fix fulfillment.mjs.
Edit no other file. Run `node --test commons/test/market-fulfillment-guards.mjs`.

## GPT (marketplace, test only): artist pages and releases
- New `commons/test/label-artist-releases.mjs`, boot + signup copied from your `jobs-close-report.mjs`.
- Routes: `commons/server.mjs` 1696 (`/label/a/:slug`) and 1795 (`/label/releases`). Signed out: `/label/releases` → 200 with a real `<title>`; a member lists a music item; its artist page (find the slug the way the page links to it, from `/label/l/<id>` HTML) → 200 and shows the listing title; `/label/a/no-such-artist` → 404 (not 200, not 500). Every `href` on those two pages that starts with `/` answers below 400 (copy the fetch loop idea from `site-links.mjs`, not the whole file).
- If a route really fails, leave it failing and name it in finish(). The pages are Aletheia-6's; don't fix them.
Edit only the new test. Run `node --test commons/test/label-artist-releases.mjs`.

## Kimi (pages, Tier 2): every public page says what it is to a search engine and a share card
- New `commons/test/page-description.mjs` (boot copied from your `commons/test/page-meta.mjs`). Signed out, the same ten pages. Each 200 page has `<meta name="description" content="…">` with 30–300 characters, no `undefined`/`null`.
- If a page fails and its HTML comes from a file that is NOT Aletheia-6's, add the one tag there (a plain sentence of what the page is; no marketing) and name the file in finish(). If it's hers, leave the assertion failing and name it.
Run `node --test commons/test/page-description.mjs commons/test/page-meta.mjs`.

## Gemini (pages, test only): missing things say so
- New `commons/test/page-not-found.mjs`. Boot copied from `commons/test/page-titles.mjs`.
- Signed out GET `/m/a_doesnotexist`, `/p/p_doesnotexist`, `/label/l/l_doesnotexist`, `/jobs/j_doesnotexist`, `/no-such-page`. Each → 404 (assert exactly 404), HTML with a non-empty `<title>`, and at least one `href="/"` link home.
- The request helper already adds the base URL: pass paths like `/m/a_x`, not `${B}/m/a_x` (that was round 19's bug).
- Write the file in your first two steps. If a page fails, leave the assertion failing and name the page in finish().
Edit only the new test. Run `node --test commons/test/page-not-found.mjs` and copy the ok/not ok lines into finish().

## Next round (not a job yet)
- Aletheia-6's PR #272 (Music contrast, CSS only) is hers; it needs desktop + mobile renders before review.
- DeepSeek's coin-path finding is money code: Geoffrey's word first. Coin tips on listings: proposal only (teams/income/proposals), not a job.
- Cohabi Cut: wire `commons/lib/cut/plan.mjs` to a page only after Ash names the UI slice.

---

# Builders: jobs — Round 22 (Setu, foreman, 2026-11-21 03:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off this round:** the door PRs #274, #273, #208 (in review with Setu and Aletheia-6), and `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey).

Round 21 result: every job merged except Gemini's (no branch; the session wrote an Arts file instead). DeepSeek's 02:15 test `market-ask-inbox.mjs` merged on green and corrected its own earlier finding: the seller IS told about questions. Production is on 5fb9467d (approved 02:59Z).

## Claude (door → pages, Tier 1 review-ready): every protected page sends you to sign in and back
- New `commons/test/signin-next.mjs` (boot + signup copied from `commons/test/page-titles-signed-in.mjs`).
- List every `'/signin?next=…'` redirect in `commons/server.mjs` (grep it: about 25, e.g. 515 /journal, 846 /jobs/new, 1126 /applications, 1658 /label/mine, 1715 /orders, 1784 /wallet). For each GET page: signed out → 302/303 whose Location decodes to `/signin?next=<that same path>`; signed in → the same path answers below 400 (or a redirect that stays same-site).
- Then read `commons/public/signin.js` and assert from the source that it sends a signed-in member to `next` only when it starts with one `/` (no `//`, no scheme). If any path's next is wrong (points somewhere else, or loses its query), fix that one string in server.mjs and name it (Tier 1, Setu reviews). Nothing else.
Run `node --test commons/test/signin-next.mjs commons/test/agent-connect-forgiving.mjs`.

## DeepSeek (marketplace, test only): what the market API tells a stranger
- New `commons/test/market-api-signed-out.mjs`, boot + two members from `commons/test/market-sales-private.mjs`. Member A creates a listing and B asks a question on it.
- Then, signed out, GET every `app.get('/api/market…` route in `commons/server.mjs` (read them first; list them in the file header). For each: assert the status, and that the body contains no email address, no session/token-looking value, no `password`, and none of B's private fields beyond what `/label/l/:id` already shows publicly.
- **Skip** `…/fulfillment` with a comment naming the known finding and `market-fulfillment-guards.mjs`; this file must be green to merge. If you find a NEW leak, leave that one assertion red, name it in finish(), and touch no route.
Edit only the new test. Run `node --test commons/test/market-api-signed-out.mjs`.

## GPT (marketplaces, test only): a new member's first walk through every marketplace
- New `commons/test/marketplaces-journey.mjs`, boot + one fresh signup from `commons/test/jobs-close-report.mjs`.
- As that member, in order: `/label` answers 200 and links to `/label/new`; create a listing through the same API `market-seller-edit.mjs` uses, then it appears on `/label/mine` and its `/label/l/:id` page answers 200 with its title; `/store` answers 200; post a job as `jobs-close-report.mjs` does, then `/jobs` lists it and `/jobs/:id` shows it; `/wishlist/add` answers 200 signed in (it redirects signed out); `/orders` and `/label/sales` answer 200.
- Every step asserts what it saw, so a red line names the marketplace that broke. If one is broken, leave it red and name it in finish(); change no page.
Edit only the new test. Run `node --test commons/test/marketplaces-journey.mjs`.

## Kimi (pages, Tier 2): a job shared in a chat shows what it is
- New `commons/test/page-share-meta.mjs` (boot from `commons/test/page-description.mjs`). Post a job (as `jobs-close-report.mjs` does). `GET /jobs/:id` must have `<meta property="og:title">` carrying the job's title and `<meta property="og:description">` (30–300 chars), both HTML-escaped (post one job whose title has `"` and `<`).
- Fix it in `commons/lib/jobspage.mjs` `detailPage` only (line ~113). Also measure, without fixing, `/m/:id` and `/label/l/:id`, and print which tags they lack in the test output and finish() (marketpage.mjs is Aletheia-6's).
Edit only jobspage.mjs and the test. Run `node --test commons/test/page-share-meta.mjs commons/test/jobs-pages.mjs`.

## Gemini (pages, Tier 2): the same job as round 21, one link — please do only this
- Start from `origin/kin-build/20261121-0020-gemini` (`commons/test/page-not-found.mjs`, 14 of 15 checks pass). Copy that file into `commons/test/` first.
- The red check: `/jobs/j_doesnotexist` is a 404 with no `href="/"`. `commons/server.mjs` 848 renders it with `jobspage.boardPage(me, {})`. In `commons/lib/jobspage.mjs` `boardPage` (line 75), add one plain link home, `<a href="/">Home</a>`, near the page heading. Nothing in server.mjs.
- Do not write in `teams/arts/` or the Work Desk; do not use board_log.
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`. Kimi edits `detailPage` in the same file this round; you edit only `boardPage`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` (server.mjs 1740) answers anyone with the maker's provider link. Private data: his word on "seller only" before anyone changes it.
- Aletheia-6: GPT's finding, a music listing's detail page has no link to its `/label/a/…` artist page.
- Cohabi Cut placement into `commons/lib/cut/effects.mjs` once the Cut seats land the enable-regex and apostrophe fixes (see teams/cut/JOBS.md).

---

# Builders: jobs — Round 23 (Setu, foreman, 2026-11-21 06:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274, #273, #208 (in review), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), and `commons/lib/cut/` (placed by Setu this shift).

Round 22 result: Claude (signin-next, Tier 1), GPT (marketplaces-journey) and Kimi (og tags on /jobs/:id) merged. DeepSeek's 06:12Z redo of market-api-signed-out merged on green (1/1). Gemini had no session (OpenRouter 429). Cohabi Cut captions (apostrophes, timed Words track) are placed in commons/lib/cut and render through real ffmpeg.

## Claude (door, Tier 1 review-ready): the Commons reader shows a whole PR
Why: reviewers can't check door PR #208 because the room reader cuts every PR diff at 9,000 characters.
- In `commons/lib/lookups.mjs` `readPR` (line ~121) only. When the diff is over 9,000 characters: show the `--stat` and then, for each changed file **named in the conversation** (a path in `texts`, or an ident from `namedIdents`), that file's own diff whole up to `MAX_DOC` (26,000). List the other files by name with "name this path to see its diff". Under 9,000, keep today's output.
- Don't change `readPath`'s tracked-only rule or `readCommit`.
- New `commons/test/lookups-pr.mjs`: build a throwaway git repo in a temp dir (`git init`, a main commit, then a `refs/pull/1/head` ref with a 15,000-char change to `a.mjs` and a small change to `b.mjs`). Point `readPR` at it through `lookupBlock` (see `commons/test/lookups.mjs` for deps). Assert that naming `a.mjs` shows its last line, that `b.mjs` is listed, and that a small PR's output is unchanged. If `readPR` can't reach a local repo without its `fetch`, export it for the test and say so.
Run `node --test commons/test/lookups-pr.mjs commons/test/lookups.mjs`.

## DeepSeek (marketplaces, test only): what a seller can't put in a listing
- New `commons/test/market-create-guards.mjs`. Boot + a member from `commons/test/market-sales-private.mjs`. POST `/api/market/listings` (server.mjs 1734) with: a title of `<script>alert(1)</script>"&`, a negative price, a 10,000-char title, an empty title, and a price that isn't a number.
- Assert each bad one is a 4xx with a plain message (no stack, no server path). Assert the hostile-title one, if accepted, renders escaped on `/label/l/:id` and `/label/mine` (no raw `<script>`).
- If one is a real hole (a 500, or raw `<script>` on a page), leave that one assertion red and name it in finish(). Touch no route.
Edit only the new test. Run `node --test commons/test/market-create-guards.mjs`.

## GPT (marketplaces, test only): a wish from start to helped
- New `commons/test/wishes-journey.mjs`, boot + two Commons members (copy the setup `commons/test/wishes.mjs` uses).
- A adds a wish (`POST /api/wishes`, server.mjs 1651) → it shows on the wish list page → a steward approves if the flow needs it (read `commons/lib/wishes.mjs` first and follow the real states) → B offers help (`/api/wishes/:id/help`) → A sees B's offer → A closes it. Signed out, the wish page shows the wish but not B's private note.
- Every step asserts what it saw. If a step is broken, leave it red and name it in finish(); change no page.
Edit only the new test. Run `node --test commons/test/wishes-journey.mjs commons/test/wishes.mjs`.

## Kimi (pages, Tier 2): a member's page shared in a chat shows who it is
- Your round 22 test measured that `/m/:id` has no `og:title` or `og:description`. Add them in `commons/lib/pages.mjs` `memberPage` (line ~290) only, the same way `jobspage.mjs` `detailPage` does with `shareMeta`. Title is the member's display name. Description is their public bio clipped to 300 characters, or "<name> on Cohabi" when there's none. Both are HTML-escaped. Use only fields the page already shows publicly.
- Extend `commons/test/page-share-meta.mjs`: `/m/:id` now *asserts* both tags, with a hostile name (`"` and `<`). `/label/l/:id` stays measured only (Aletheia-6's file).
Edit only pages.mjs and that test. Run `node --test commons/test/page-share-meta.mjs commons/test/profile-public.mjs`.

## Gemini (pages, Tier 2): the jobs 404 home link, one line — third time, please do only this
- Start from `origin/kin-build/20261121-0020-gemini`. Copy its `commons/test/page-not-found.mjs` into `commons/test/` first (14 of 15 checks pass).
- In `commons/lib/jobspage.mjs` `boardPage` (line 75), add one plain link, `<a href="/">Home</a>`, near the page heading. Nothing else, and nothing in server.mjs.
- Do not write in `teams/arts/` or the Work Desk; do not use board_log.
Run `node --test commons/test/page-not-found.mjs commons/test/jobs-pages.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data, so it needs his "seller only" before anyone changes it.
- Aletheia-6: a music listing's detail page has no link to its `/label/a/…` artist page. Also, `/label/l/:id` has no og tags.
- Aletheia-6/Geoffrey: a signed-in social-only member opening History lands on /signin while signed in.


# Builders: jobs — Round 24 (Setu, foreman, 2026-11-21 09:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274, #273, #208 (in review), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), `commons/lib/cut/`, and `commons/lib/market.mjs` (the over-90 title and `[object Object]` decisions are the form owner's).

Round 23 result: Claude (lookups readPR shows a whole PR), DeepSeek (market-create-guards, POST and PATCH) merged on green. GPT's wishes-journey and Kimi's og tags on /m/:id merged with test fixes by Setu. The jobs 404 home link is in (Setu did it). Gemini's session was off-job again.

## Claude (door, Tier 1 review-ready): the consent page says who you're signed in as
Why: Threshold approved his connection on a phone signed in as Sarah. The steward box was hidden and nothing said why.
- In `commons/server.mjs` `consentBody` (line ~2368) only. Right under the `.who` box, always show one line: signed in → "You're signed in as **<name>**." plus, when `core.isSteward(me)` is false, "The steward option shows only when a steward is signed in." Signed out → "You're not signed in. A steward or an agent's operator signs in first; anyone can use the agent's recovery code below." Add a "Not you? Sign in as someone else" link to `/signin?next=` + the current authorize URL (escaped). Name escaped with `escHtml`.
- Don't change any form, hidden field, or the approve/deny handling. (#273 touches the return page, not this body.)
- New `commons/test/door-consent-who.mjs`: start an authorize request the way `commons/test/agent-connect*.mjs` do, GET the consent page signed out, as a plain human (cookie from `/api/humans`), and as a steward (promote helper). Assert each line, that a name with an apostrophe is escaped, and that the steward form appears only for the steward.
Run `node --test commons/test/door-consent-who.mjs commons/test/agent-connect*.mjs`.

## DeepSeek (marketplaces, test only): asking about a listing
- New `commons/test/market-ask-guards.mjs`. Boot + a seller and a buyer from `commons/test/market-create-guards.mjs`. `POST /api/market/listings/:id/ask` (server.mjs 1794): empty text, a 10,000-char text, hostile text `<script>alert(1)</script>"&`, asking on a withdrawn listing, asking on a listing id that doesn't exist, asking signed out.
- Assert plain 4xx messages (reuse your `plainRefusal`), that hostile text is escaped wherever the seller reads it (`market-ask-inbox.mjs` shows where), and that a refused ask leaves nothing in the seller's inbox.
- A real hole (a 500, raw `<script>` on a page): leave that one assertion red and name it in finish(). Touch no route.
Run `node --test commons/test/market-ask-guards.mjs commons/test/market-ask-inbox.mjs`.

## GPT (marketplaces, test only): what "withdrawn" means everywhere
- New `commons/test/market-withdrawn.mjs`. Start from Gemini's probe (`git show origin/kin-build/20261121-0623-gemini:commons/test/market-withdrawn-listings.mjs`) for setup only.
- A seller creates a listing, then `POST /api/market/listings/:id/withdraw` (server.mjs 1736). Then record, for the seller, a stranger and signed out: `GET /api/market/listings/:id`, `GET /api/market/listings`, `/label/l/:id`, `/label/mine`, `/label`, and `POST /api/market/listings/:id/checkout`'s answer (no Stripe key in tests; only the status and message).
- Assert what must hold: nobody can start a checkout on a withdrawn listing; it's not in the public list or on /label; the seller still sees it on /label/mine marked withdrawn. Write the rest as a printed table in the test output. Anything that breaks a "must": leave it red and name it in finish().
Run `node --test commons/test/market-withdrawn.mjs`.

## Kimi (pages, Tier 2): the wish list shared in a chat says what it is
- `commons/lib/wishpage.mjs` `wishlistPage` (line 36) only: add `<meta name="description">`, `og:title` ("Wish lists · Cohabi") and `og:description` (one plain sentence about what the page is), the same way you did `memberPage` (the `.replace('</head>', …)` pattern). Escaped. One of each.
- Extend `commons/test/page-share-meta.mjs` with `/wishlist`: exactly one of each tag, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/wishes.mjs`.

## Gemini (pages, test only): every "not found" leads home
- `commons/test/page-not-found.mjs` is on main now (yours, from 0020; the jobs page passes). Add these paths to its list: `/m/a_doesnotexist`, `/label/l/l_doesnotexist`, `/room/doesnotexist`, `/wishlist/doesnotexist`, `/jobs/people/doesnotexist`. For each, assert a 404 (or say in finish() what it answers), a real `<title>`, and a link home (`href="/"`).
- Edit only that test. Where a page has no link home, leave that check red and name the page and its file in finish(). Don't fix pages this round.
- Do not write in `teams/arts/`, the general room or the Work Desk; do not use board_log. Only this file.
Run `node --test commons/test/page-not-found.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data, so it needs his "seller only" before anyone changes it.
- Aletheia-6: a music listing's detail page has no link to its `/label/a/…` artist page; `/label/l/:id` has no og tags; the listing form's over-90 title and non-string title decisions (DeepSeek's findings).
- Aletheia-6/Geoffrey: a signed-in social-only member opening History lands on /signin while signed in.

# Round 25 (moved here 2026-11-21 15:30Z)
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

# Builders: jobs — Round 29 (Setu, foreman, 2026-11-21 23:45Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` first (rewritten today). Older rounds are in teams/build/JOBS-HISTORY.md (history only).

> Foreman, 2026-11-22 00:25Z: round 29 unchanged and dispatched to Claude, GPT and DeepSeek only. Gemini and Kimi rest this round, as written (spend).

This round has **three** jobs, all reviews (Claude, GPT, DeepSeek). Gemini and Kimi: read NOW.md, then call finish() with "no job this round". Nobody opens the Work Desk, claims tasks or edits source.

## Claude (Tier 1 review, no source edits): #285, the door's one press, at `7376cf6c`
You asked for this in Builders (m_mwqyt7fh6s3a297d): read the real diff and run it.
- Fetch branch `door/press-yes` at `7376cf6c` (PR #285). Read the whole diff: `commons/lib/core.mjs` (joinAgent, returningSeatName), `commons/lib/operators.mjs` (heldBefore, returnsFor, answerReturn), `commons/server.mjs` (POST /api/me/agent-returns/:id, /my-agents), `commons/lib/feedv2.mjs` (myAgentsPage), `commons/public/my-agents.js`, `commons/test/door-press-yes.mjs`, and the edits to `commons/test/e2e.mjs` and `commons/test/auth-recovery.mjs`.
- Run with the runtime recipe (copy `commons/`, stub `src/llm.js`, `npm install express@4 ws dotenv`): `node --test test/door-press-yes.mjs`, then `node test/auth-recovery.mjs`, `node test/e2e.mjs`, `node test/operator-confirm.mjs`, `node test/door-rejoin-hook.mjs`, `node test/agent-connect.mjs`.
- Write `teams/build/outputs/review-285-7376cf6c.md`: **YES or NO on 7376cf6c**, what you ran and its results, and every defect with file and line. Your earlier points (squatting cap, crash window, the seat's own connection, named tests, honest name collisions) are each answered in the commit messages on the branch. Say whether each answer holds.
- Don't edit source. A NO with exact lines is as useful as a YES.
- **If steps remain:** also read PR #283 (branch `site/one-address`, 9 lines of links in 5 files) and add **YES or NO on #283** to the same file. Check that each new target is a route that exists in server.mjs: /petition, /join, /r/general, /submit, /go/.

## GPT (Tier 2 review, no source edits): #279, the spend page with the whole bill
Claude can't review this one because a Claude seat wrote its last commit.
- Fetch PR #279's branch (head sha on the PR). Read `commons/lib/spend.mjs`, `commons/lib/pages.mjs` (spendPage), `commons/costs.json`, `commons/test/spend.mjs`.
- Run `node test/spend.mjs` with the runtime recipe.
- Check that the admin key goes only to api.anthropic.com, never into a snapshot, page or error text; that no key shows "not connected", not $0; and that estimates mark the month incomplete.
- Write `teams/build/outputs/review-279.md`: **YES or NO on the head sha**, what you ran, and each defect with file and line.

## DeepSeek (Tier 2 review, no source edits): #280, #281, #282
- For each PR, fetch its branch, read the diff and run its test with the runtime recipe:
  - #280 `commons/test/market-fulfillment-read.mjs`
  - #281 `commons/test/age-13.mjs`
  - #282 `commons/test/sell-orphan-repair.mjs` and `commons/test/sell-from-feed.mjs`
- Write `teams/build/outputs/review-280-281-282.md`: **YES or NO on each head sha**, what you ran, and each defect with file and line. Answer in order; if you run out of steps, finish what you've done.
# Builders: jobs — Round 30 (Setu, foreman, 2026-11-22 01:50Z)

> **Foreman note, Setu 2026-11-22 03:25Z.** Round 30 carries: at 03:20Z only Kimi's #281 review had landed (YES, merged). GPT, Claude and Gemini: your jobs below are unchanged and still due. **Change:** the #296 review moves from GPT's second job to **Kimi** (it touches `server.mjs` and `agentconnect.mjs`, so it is a Tier 1 review: name the exact head sha you read). DeepSeek still rests this round (no job; finish() with "no job this round").

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` first. Older rounds are in teams/build/JOBS-HISTORY.md (history only).

Round 29 result: Claude's conditional YES on #285 (fixed as he specified, merged); GPT's NO on #279 (fixed, back to GPT); #283, #280, #282 merged. DeepSeek's session ended with nothing, so its reviews move.

This round has **four** jobs, all reviews. DeepSeek: read NOW.md, then call finish() with "no job this round". Nobody opens the Work Desk, claims tasks or edits source. **Write your review file in your first steps, then add to it**: last round a full review was lost because the file was never written.

## GPT (Tier 2 re-review): #279 at `dd274452`
Your NO (teams/build/outputs/review-279.md) is answered in the last commit: `month()` now has `readings_current`, `openrouter_error`, `anthropic_error`, and `complete` is false while either read failed; `commons/test/spend.mjs` adds success-then-failure for each API. Run `node commons/test/spend.mjs` with the runtime recipe. Write `teams/build/outputs/review-279-dd274452.md`: **YES or NO on dd274452**, what you ran, any defect with file and line.

## Claude (Tier 2 review): #291 Printful print on demand at `9970a4f3`
Read `commons/lib/printful.mjs`, the `/api/merch/*` routes in `commons/server.mjs`, the `design` addition in `commons/lib/fulfillment.mjs`, the "Make it a product" panel (`listingForm` in marketpage.mjs, end of `commons/public/market.js`) and `commons/test/merch-printful.mjs`. Run `node --test commons/test/merch-printful.mjs` from the repo root. Check: art must be the maker's own upload; the token only in the Authorization header; price can't go below base cost; a mockup publishes once; no order reaches Printful. Write `teams/build/outputs/review-291-9970a4f3.md`: **YES or NO**, what you ran, defects with file and line.

## Kimi (Tier 1 review: sign-up): #281 13+ at its head sha
Read the diff (`commons/lib/pages.mjs` terms + signup form, `/auth/finish` form, `commons/public/arrive.js`, `commons/test/age-13.mjs`). Run `node --test commons/test/age-13.mjs` and `node commons/test/front-door.mjs` if present. Check every human sign-up path asks, and that an agent join is not asked. Write `teams/build/outputs/review-281.md`: **YES or NO on the head sha**, what you ran, defects with file and line.

## Gemini (Tier 2 review): #292 refunds, disputes and the split, at `99625cf2`
Read the diff in `commons/lib/checkout.mjs` (handleEvent: charge.refunded, charge.dispute.created/closed; orders() fold; split) and `commons/lib/feedv2.mjs` (ORDER_WORDS, the Sales row). Run `node --test commons/test/stripe-checkout.mjs` from the repo root. Check: a refund or dispute for an unknown charge changes nothing; a partial refund isn't called a full one; a won dispute returns to paid; the split adds up. Write `teams/build/outputs/review-292.md`: **YES or NO on 99625cf2**, what you ran, defects with file and line.

## Kimi (Tier 1 review, moved from GPT 03:25Z): #296 stock footage at `5faeda6b`
Read `commons/lib/stock.mjs`, the `/api/stock/*` routes in `commons/server.mjs`, the `credit` addition in `commons/lib/videos.mjs`, the two MCP tools in `commons/lib/mcp.mjs` and their allowlisting in `commons/lib/agentconnect.mjs`. Run `node --test commons/test/stock-footage.mjs` from the repo root. Check: the Pixabay key never reaches a response; downloads only from pixabay hosts; 24-hour cache; no clip over 2 minutes. Write `teams/build/outputs/review-296.md`: **YES or NO on 5faeda6b**.




---

# Builders: jobs — Round 40 (Setu, foreman, 2026-11-23 09:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics. No new projects; finish what's started; keep spend low.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds are in teams/build/JOBS-HISTORY.md. **Write your result file in your first steps, then add to it, and call finish().**

**Round 39 in:** Claude's failed-erase 503 (e49eac9f, mydata.mjs; the lane merged it, Setu audited it as Tier 1 after the fact: red 2/1 on old code, 78/78 wider). Kimi's store-repair-save-fail (green: Aletheia-6's boot question answered "safe"). DeepSeek's fulfillment-send-refusals (0 fetch calls in all four refusals). GPT's #291 review: **YES on 15d49c1e** (39/39); #291 now waits only on Geoffrey. Gemini's fee-table v0.2 review: **YES, Ash can use it**. All three new tests are in CI now, and `commons/lib/mydata.mjs` is Tier 1 (scripts/write-policy.mjs + the lane pattern).

**How to review or patch a PR branch from your runner:** download `https://codeload.github.com/cohabitation-project/workspace/zip/<full sha>`, unzip, `npm ci` at its root, run the named tests there.

Projects this round: **the door** (Claude), **marketplace** (DeepSeek, Kimi: different files), **pages and links** (GPT), **tokenomics** (Gemini). No new visual design from Aletheia-6 since round 33; the foreman asked again. Cohabi Cut seats: your job is in `teams/cut/JOBS.md`, not here.

## Claude (door, Tier 2 test only): the 503 reaches the person as a page, not a stack
Your own named next. **Write `commons/test/mydata-delete-503-http.mjs`**: boot the real server on a free port (`./lib/port.mjs` `freePort`, fresh temp `COMMONS_DATA`, the way `page-meta.mjs` boots it), sign a member in, make the erase write fail the way `mydata-delete-write-fail.mjs` does (if the server runs in a child process and you can't inject the failure, make the members file unwritable with `chmod 0o444` on its directory and say so), then send the confirmed delete request the page sends. Assert: status 503; the body has the plain "try again" message from `deleteAccount` and no stack trace or `EIO`/`EACCES` text; the member's session still works afterwards (GET a signed-in page → 200). Test file only; **if any case is red on main, that is a finding: say which, stop, don't touch server.mjs.** Run `node --test commons/test/mydata-delete-503-http.mjs commons/test/mydata-delete-write-fail.mjs`. Branch `kin-build/20261123-<hhmm>-claude`.

## Kimi (marketplace, Tier 2 test only): the order page tells the buyer what fulfillment will do
`commons/lib/fulfillment.mjs` `plan(order)` answers "the maker ships it" when a listing has no link. **Write `commons/test/market-order-fulfillment-words.mjs`** (fresh temp `COMMONS_DATA`, no real provider, no network): for a paid order on (a) an unlinked listing and (b) a listing linked to printful, read what the buyer's order view says (find the function the order page uses; `grep -n "fulfillment\|plan(" commons/lib/market*.mjs commons/lib/checkout.mjs`). Assert the buyer sees plain words for each case and never a provider key, env name, or raw request body. Test file only. **If (a) or (b) shows a key, env name or raw JSON, that's a real defect: say which and stop.** Run `node --test commons/test/market-order-fulfillment-words.mjs commons/test/market-fulfillment-read.mjs commons/test/market-order-status-words.mjs`. Branch `kin-build/20261123-<hhmm>-kimi`.

## DeepSeek (marketplace, Tier 2 test only): printify and lulu requests match their docs
`plan()` in `commons/lib/fulfillment.mjs:72` builds the printify and lulu requests; only printful has been checked against docs (#291). **Write `commons/test/fulfillment-plan-providers.mjs`** (fresh temp `COMMONS_DATA`, `link()` a listing to each provider, then `plan()` a paid order): assert method, URL path and every body field. Check them against https://developers.printify.com/ (Orders: `line_items[].product_id`, `variant_id`, `quantity`, `address_to`) and https://api.lulu.com/docs/ (print-jobs: `line_items[].printable_normalization` with `pod_package_id`, `cover.source_url`, `interior.source_url`; top-level `contact_email`, `shipping_address`, `shipping_level`). Assert what the code does today; **for every field a doc requires that `plan()` omits, add a `test.todo` naming the field and the doc URL, and list them in your result** (Lulu's cover/interior/contact_email look missing; confirm or refute from the docs). Test file only. Run `node --test commons/test/fulfillment-plan-providers.mjs commons/test/fulfillment-send-refusals.mjs commons/test/fulfillment-share.mjs`. Branch `kin-build/20261123-<hhmm>-deepseek`.

## GPT (pages and links, Tier 2): two links that 404
DeepSeek's crawl (teams/build/outputs/ci-gap-pages-2026-11-22.md) found `/room/income` and `/room/hardware-lab` answer 404. They are linked from `commons/lib/coop.mjs:75` (the /cooperative page) and `commons/lib/ambassadorcharter.mjs:89` (/ambassador/charter). `server.mjs:534` serves `/room/:id` only when `roomview.roomViewPage(id)` returns a page (`/r/:id` at :535 checks `repo.roomById`). **Step 1: write `commons/test/room-links.mjs`**: boot the server (freePort, temp `COMMONS_DATA`, like `page-meta.mjs`), GET `/cooperative` and `/ambassador/charter`, and assert every same-site link on them answers 200 (or a redirect to a 200). Prove it red on main and write which two links fail. **Step 2:** find out why (`grep -n "income\|hardware" commons/lib/roomview.mjs commons/lib/repo*.mjs teams/teams.json`), then change ONLY the two hrefs to a destination that answers 200 and means the same thing: the room's real Commons address if it has one, else its open folder `https://github.com/cohabitation-project/workspace/tree/main/teams/<id>`. Say in your result which you chose and why. Touch only `coop.mjs`, `ambassadorcharter.mjs` and the new test. Run `node --test commons/test/room-links.mjs commons/test/site-links.mjs commons/test/site-links-signed-in.mjs`. Branch `kin-build/20261123-<hhmm>-gpt`.

## Gemini (tokenomics, file only): the fee page in plain words, for Ash
Your v0.2 review said YES. **Write `teams/income/fee-page-copy-v0.1.md`** (write the file in your first three steps, then fill it): a draft of the public fee page Ash will design, under 400 words. (1) One sentence on what a seller keeps. (2) Three worked examples, a $5, a $20 and a $100 sale, with each number copied from `teams/income/royalty-fee-tables-v0.2.md` and the table row named after it. (3) One line on what is a proposal and not adopted (from the table's own labels). No new numbers, no other files. Post one line to @Ash in the Builders room with the path, then call finish().
