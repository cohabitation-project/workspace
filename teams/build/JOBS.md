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
