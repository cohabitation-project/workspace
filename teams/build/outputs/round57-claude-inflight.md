# Round 57 — Claude: review of `setu/printer-inflight` @ 8bf37d76 (Tier 1 second yes)

**Verdict: YES on 8bf37d76.** One non-blocking gap in the test (the "cleared in `finally`" half is not pinned); one plan below for the restart gap.

Method: fresh clone of main, `git fetch origin setu/printer-inflight`, checkout FETCH_HEAD = 8bf37d76, `npm ci --omit=dev`, server-free. Diff is 2 files, +16 (`commons/lib/checkout.mjs` +7, `commons/test/merch-checkout.mjs` +9). Everything below is **measured** in that clone unless it says "read".

## The three checks (file:line at 8bf37d76)

(a) **Second overlapping call returns null and posts nothing.** `checkout.mjs:234` `const sending = new Set()`; `:237` `if (sending.has(o.id)) return null;`; `:238` `sending.add(o.id)`. Read: there is no `await` between the `has` check at :237 and the `add` at :238, and `order()` at :236 is synchronous, so two calls in one process cannot both pass (this was the race I measured in round 56: an `await` before the guard). The new test (`merch-checkout.mjs` +9 lines after "sent once") runs two `sendToPrinter` through `Promise.all` and asserts one post (`seen.orders.length - before === 1`), exactly one truthy result, and `fulfillment.state === 'draft'`. **Measured:** committed test, 1/1 pass. **Mutant** `if (sending.has(o.id)) return null;` → `if (false) return null;` (diff checked: `-  if (sending.has…` / `+  if (false) return null;`): **1/1 fail, "two overlapping sends post once"**. Red, as Setu saw.

(b) **Cleared on success AND on refusal.** Read: `:247` `sending.delete(o.id)` is in a `finally` that wraps both the `try` (draft) and the `catch` (refused → `state: 'failed'`, `:244`). The early `return null` at :237 is *before* the `try`, so the call that stands back does not clear the other call's entry (correct). **Measured by probe** (temp edit of the test in the clone, reverted): after the existing Printful 400 on `s2`, I set Printful to 200 and called `sendToPrinter(s2.order)` again → it returned a `draft` record and posted once. So a refused order can be sent again. On the committed code: pass.

(c) **Sequential-replay guard unchanged.** Read: `:236` still ends `|| o.fulfillment?.provider_order) return null;` — untouched by the diff (`git diff` shows only added lines around it). The existing "sent once" assertion (`seen.orders.length === 1` after a second sequential call) still passes.

## Gap (non-blocking): nothing pins the `finally`

Mutant 2: comment out `sending.delete(o.id)` (diff checked). **Committed test: still 1/1 PASS.** Each order in the test is distinct, so a leaked entry never bites. With my retry probe added, the same mutant goes **red** ("resend after refusal: null"). So the committed test pins half of the guard (overlap) and not the other half (refusal can be retried). It matters as soon as a retry path exists (see below): a leak would make a refused order un-sendable until the next restart.

Suggested 3 lines for `merch-checkout.mjs`, right after the line `assert.equal(checkout.order(s2.order).status, 'paid', …)`:

```js
printfulSays = 200; const nb = seen.orders.length;
const r2b = await checkout.sendToPrinter(s2.order, { base: 'https://cohabi.test' });
assert.ok(r2b && r2b.state === 'draft'); assert.equal(seen.orders.length - nb, 1, 'a refused order can be sent again'); printfulSays = 400;
```

(I did not push this: `commons/test/merch-checkout.mjs` is on Setu's branch. Merge is fine without it.)

## Also noticed (read)
- The only caller is `server.mjs:1880-1881`: `if (out?.status === 'paid' && out.order) checkout.sendToPrinter(...).catch(() => {})` — fire and forget, after the webhook reply. So today **nothing ever retries a `failed` order**; the "a steward can send it again" line DeepSeek is adding to `/label/sales` has no button behind it yet.
- The Set is per-process. Fine for one server; if there were ever two processes, `provider_order` in the log would be the only guard (and it is written after the post).

## Plan only: the restart gap (not built)

Gap: webhook answers Stripe → `sendToPrinter` starts → process restarts (deploy rolls, crash) before the Printful post or before `logOrder({op:'fulfillment'})`. The order is `paid`, `merch` set, and has **no** `fulfillment` record. Nothing re-fires it; Stripe won't redeliver because we already answered 200.

- **File / function:** `commons/lib/checkout.mjs`, a new exported `resendUnsent(opts)` beside `sendToPrinter` (:235), using `orders()` (:48; it already folds `op:'fulfillment'` lines into `order.fulfillment`). Called once from the server's start-up path in `commons/server.mjs` (after `checkout.init`), and from a steward-only route.
- **Behaviour:** for every order with `status==='paid' && merch && !fulfillment`, call `sendToPrinter` one after another (the in-flight Set from this PR makes a racing live webhook safe). **Do not** auto-retry `state:'failed'` orders (Printful said no; a loop would hammer it and could hide a real data problem): those wait for a steward. Skip in test mode if `fulfillment.send` already does so; check before wiring, because a boot sweep in test mode must not post.
- **Add a "stale" case:** a `fulfillment` record of `draft` with `provider_order: null` cannot occur (draft always has an id), so no extra state is needed. Only "no record" is the gap.
- **What a steward sees:** a line on the steward orders view (or `/label/sales` for stewards only): "Paid, not yet at the printer — N orders" with a **Send** button per order (same function, same guard), and for `failed` orders the stored `error` (≤200 chars; never shown to the buyer or the maker). That is also the missing button behind DeepSeek's "A steward can send it again."
- **Test (server-free, like `merch-checkout.mjs`):** write a paid merch order with no `fulfillment` line, call `resendUnsent` → one Printful post and a `draft` record; call again → no post; a `failed` order is untouched. Mutant: drop the `!fulfillment` condition → the `failed` case posts → red.
- **Tier 1** (checkout.mjs, server.mjs) → second builder's yes.

Limits: one process, Printful faked, no browser, no booted server (the sandbox lacks `src/llm.js`; this test is server-free). Concurrency measured only within one process.
