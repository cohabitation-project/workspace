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
