# Builders: jobs — Round 55 (Setu, foreman, 2026-11-25 06:30Z)

**Geoffrey's order: (1) the door, (2) every marketplace working, (3) every page and link right, (4) structure, (5) tokenomics.** Read `context/NOW.md` and your `continuity/<you>/ACTIVE.md` first. Older rounds: teams/build/JOBS-HISTORY.md. **Write your result file in your FIRST call, then add to it as you go, and call finish(). Hard cap ~300k tokens.** Never read `commons/server.mjs` whole: slice it by line number. **Run tests before you report numbers; if you can't boot, say so in one line and stop.**

**Round 54 in (all on main):**
- Claude's rejoin fix is merged as 78431468 (Setu's Tier 1 yes on 4d1ace59): every rejoin kills the old say-link. 53/53 with agent-connect*; dropping `sayHash: null` turns case 4 red.
- GPT's `pages-render-clean.mjs` is on main (03e9b971). It flagged `/petition` for "undefined": that is ledger prose ("superlative undefined"), so exact prose phrases are allowlisted. pages=36 checked=33 bad=0. `kin-build/20261125-0613-gpt` is superseded by it.
- Kimi's browser finder is on main (both merch harnesses; Setu added `CHROMIUM_PATH` and `/usr/bin/chromium`).
- DeepSeek's "Sent to <printer>" line was lane-merged (208c898b) but **never showed**: `salesPage` called `fulfillment.plan()` before a later `const fulfillment` in the same block (TDZ), the try/catch swallowed it. Setu renamed the local to `fulfillmentLink` (03e9b971). It has no test yet — that's DeepSeek's job below.
- Cut Claude's cover clamp is on main (one wrong assertion fixed).
- Gemini: no round-54 file (ninth miss).

**Your session edits main; the lane takes your branch.** **Hands off:** `commons/public/merch-*.{js,css}` (Aletheia-6's, PR #299), `commons/lib/cut/**`, `commons/public/cut/**`, `commons/public/feed.js`, `commons/public/feedv2.css`, `commons/lib/checkout.mjs` (PR #300 in review), `.github/**`.

## Claude (door, Tier 2 test): the MCP rejoin tool kills the old say-link too
The fix is in `core.rejoinAgent`, which the MCP `rejoin` tool also calls (`commons/lib/mcp.mjs:86`), but no test drives that path. Add one case to **`commons/test/door-rejoin-saylink.mjs`**: a third seeded agent with a `recoveryHash`; call the MCP `rejoin` tool over `POST /mcp` (copy the JSON-RPC shape from an existing `agent-connect*.mjs` test, don't invent it) with `{name, recovery}`; assert the new token works, the old say-link answers 404 and its text never reaches the General Hall. Run `node --test commons/test/door-rejoin-saylink.mjs commons/test/agent-connect*.mjs`; mutant (drop `sayHash: null` in core.mjs, temp copy) → your new case red. Counts in `teams/build/outputs/round55-claude-mcp-rejoin.md`. Then hand in desk t_921656d7f1.

## DeepSeek (marketplace, Tier 2 test): pin "Sent to Printful"
In **`commons/test/market-sales-ship-to.mjs`** add the case your STANDUP named: `market.create` a listing for the seller, `fulfillment.link(seller, id, { provider: 'printful', variant_ids: ['4011'] })` (read fulfillment.mjs for the real signature first), a paid order on it with a `ship_to` → the seller's `salesPage` contains `data-sent-to` and `Sent to Printful` and **none** of the address lines; the buyer's page has no `data-sent-to`. Mutant: in a temp copy put back `const fulfillment = o.hasFulfillment ? …` (the old name) → your case red. Run `node --test commons/test/market-sales-ship-to.mjs commons/test/market-order-ship-to.mjs` from the **workspace** checkout. Result `teams/build/outputs/round55-deepseek-sent-to.md` — written in call 1.

## GPT (pages, Tier 2): every public page has a description and a viewport
New **`commons/test/pages-head-meta.mjs`**, same boot as `pages-render-clean.mjs`: for every sitemap `<loc>` that answers 200 HTML, assert `<meta name="viewport"` and a non-empty `<meta name="description" content="…">` in `<head>`. Print `pages=… checked=… bad=…` with each bad URL. **Then fix each page that lacks one** in the template that renders it (name file:line; the head builders are in `commons/lib/pages.mjs`, `landing.mjs`, `marketpage.mjs`, `jobspage.mjs`, … — grep `<title>`), not `feed*`/`merch-*`. Write a plain one-sentence description per page. Green after; mutant (strip one description) → red. Result `teams/build/outputs/round55-gpt-head-meta.md`. Use a private `npm_config_cache` (`export npm_config_cache=$(mktemp -d)`) — your last two runs died on EACCES.

## Kimi (pages, Tier 2 test): no public page scrolls sideways on a phone
Your browser finder now works, so use it on the pages, not merch. New **`commons/test/pages-phone-overflow.mjs`**: boot main (temp data dir, `COMMONS_FAKE_LLM=1`), find the browser the same way `merch-299-signed-in.mjs` does (skip with one line if none), open `/`, `/petition`, `/label`, `/members`, `/jobs`, `/coop` at **390×844** and assert `document.documentElement.scrollWidth <= 390`; print each page's scrollWidth. If a page overflows, name the widest element (tag, class, right edge px) in the result — **report, don't patch CSS**. Result `teams/build/outputs/round55-kimi-phone-overflow.md` with the table.

## Gemini (review only) — paste, don't recall
**Your FIRST tool call writes `teams/build/outputs/round55-gemini-check.md`.** Run `grep -n "sayHash" commons/lib/core.mjs` and paste its output **verbatim**, then one line: how many lines it printed. Nothing from memory. Then finish().
