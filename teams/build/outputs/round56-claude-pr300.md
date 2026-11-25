# Round 56 — Claude: review of PR #300 (`setu/merch-checkout` @ b62b8610e270d074403740cfaa5668e1b8446a83)

## Verdict: **YES on b62b8610** (Tier 1 second yes), with one narrow gap that I'd fix in a follow-up, not a blocker.

Setup: fresh clone of main, `git fetch origin setu/merch-checkout`, checkout b62b8610 (HEAD = that SHA), `npm ci --omit=dev`. Diff read: checkout.mjs, fulfillment.mjs, market.mjs, merchsets.mjs, server.mjs (10 files total).

## The four checks (line numbers are in the b62b8610 tree)

**(a) Price is the server's, per size — YES.**
`server.mjs` webhook-route POST /checkout passes only `{product, color, size}` strings from the client (no price). `checkout.quote` (checkout.mjs ~l.139–140) takes `amount = merchsets.buySpec(...).price`; `buySpec` (merchsets.mjs, new block) looks up the *approved* item, checks colour/size against the maker's chosen variants and returns `row.pays` for that size. `startCheckout` skips the donation-amount override when `q.merch` (`if (!q.merch && l.price.mode === 'donation' …`) so a client `amount` can't change it, and `unit_amount` = `Math.round(amount*100)`. Test pins it: 2XL = 32.75 vs M = 30, `unit_amount` `'3275'`, bad colour/size/product throw (merch-checkout.mjs l.74–89).

**(b) Only after a verified paid webhook, at most once — YES for replays; one concurrency gap.**
- `server.mjs` webhook: `stripe.verifyWebhook` first (bad signature → return), `checkout.handleEvent`, then `res.json`, then `sendToPrinter` only `if (out?.status === 'paid' && out.order)`.
- `sendToPrinter` (checkout.mjs ~l.232) returns null unless `o.merch && o.status === 'paid'` and there is no `fulfillment.provider_order`. A *sequential* replay is therefore a no-op: test l.116–119 shows `null` and `seen.orders.length === 1`.
- **Gap (measured):** the guard is only set after the awaited work (`printFile` + the Printful fetch). Two overlapping calls both pass it. Probe in a temp copy of the test (two `sendToPrinter` on one fresh paid order via `Promise.all`): **printer posts = 2**. Real path: Stripe delivering `checkout.session.completed` and `…async_payment_succeeded`, or a retry while the first call is still in flight. Cost is a duplicate *draft* (nothing charged or printed), so not a blocker. Fix, ~3 lines: a module-level `const sending = new Set()`; `if (sending.has(orderId)) return null; sending.add(orderId); try { … } finally { sending.delete(orderId); }`. Please add that plus a `Promise.all` case to merch-checkout.mjs.
- Printful's own behaviour on a duplicate `external_id` is not tested here (the test uses a stand-in fetch): UNMEASURED.

**(c) No `confirm` — YES.** `grep -n confirm commons/lib/fulfillment.mjs commons/lib/checkout.mjs` hits only a comment (checkout.mjs l.229). Request URL is `…/orders` with no query; test asserts `new URL(pf.url).search === ''` (l.104). A draft stays a draft; confirming is a person's step.

**(d) Printful refusal → `fulfillment.state: failed`, no throw — YES.** `sendToPrinter` wraps `fulfillment.send` in try/catch and logs `{state:'failed', error}`; the server calls it as `.catch(() => {})` after the response was already sent, so nothing can reach Stripe's webhook answer. Test l.122–128 (Printful says 400): `state: 'failed'`, error matches /refused/, order status stays `paid`. A failed order *can* be retried by a later replay (guard needs `provider_order`), which is the wanted behaviour.

## Tests (b62b8610, fresh clone)
- `node --test commons/test/merch-checkout.mjs`: **1/1 pass** (one big case covering a–d, agent→reserves, collab share).
- `node --test commons/test/market-*.mjs`: **76 tests, 72 pass, 4 fail** — the 4 are the server-boot cases ("with all of her art…", "one tab image missing…", "none of her art…", "signed-in Marketplace menu pages open"), failing with `isolated Commons server started` (the runner can't boot: `src/llm.js` missing). **Needs boot — Setu/the lane runs those.** I did not run main's baseline for them; I read them as the known runner limit, not as something #300 broke.

## Mutant
Dropped `|| o.fulfillment?.provider_order` from the guard in `sendToPrinter` (diff checked: the `const o = order(orderId); …` code line changed, no comment). Result: merch-checkout **0 pass / 1 fail**, red at "Stripe repeats itself: no second printer order" (`actual: {provider:'printful', provider_order: 9003, state:'draft'…}`, expected null). So the once-guard is pinned for the sequential replay. Restored with `git checkout`.

## Not checked / limits
- No real Printful or Stripe call; the fetch is a stand-in. No browser.
- If the process restarts between `res.json` and the Printful post finishing, the order is `paid` with no fulfillment record and Stripe won't re-deliver (it got a 200). Nothing in the diff retries it; a steward action or a sweep for `paid && merch && !fulfillment` would. Worth a follow-up, not part of this yes.
- Anything in `commons/public/merch-*` (Aletheia-6's) not read.
