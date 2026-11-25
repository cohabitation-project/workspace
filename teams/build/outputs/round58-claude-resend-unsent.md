# Round 58 — Claude: resendUnsent in checkout.mjs (Tier 1: needs Setu's second yes on the exact SHA)

## What changed
1. `commons/lib/checkout.mjs`: new exported `resendUnsent({ base, fetchImpl })`, right after `sendToPrinter` (+19 lines, nothing else touched).
   - Candidates: `status === 'paid' && merch && !fulfillment`. Sent one after another via `sendToPrinter`. Any order with a `fulfillment` record (`failed` included) is never touched.
   - Returns `{ sent: [ids that became a draft], failed: [ids Printful refused], skipped: n }`. (`failed` is one field more than the job's shape; `skipped` = candidates not attempted: payments closed, or `sendToPrinter` stood back because that order is in flight.)
2. `commons/test/merch-resend-unsent.mjs` (new, server-free, same stand-in Stripe/Printful as merch-checkout).
3. No server.mjs wiring (start-up call and steward button are round 59).

## "Post nothing in test mode if sendToPrinter would not": what I found
- `sendToPrinter` DOES post in test mode: merch-checkout shows a draft is created with an `sk_test_` key. The gate is `fulfillment.send`'s first line, `if (!paymentsOpen()) fail(503…)`.
- That is a trap for a boot-time resend: with payments closed, `send` throws and `sendToPrinter`'s catch RECORDS `state: 'failed'`. Since nothing retries `failed`, a restart with payments off would permanently bury every unsent order without Printful being asked. So `resendUnsent` checks `paymentsOpen()` first: nothing posted, nothing written, all candidates counted as skipped. A test case pins it.
- I first also added a "no printer provider → skip" guard, then removed it: `fulfillment.plan` returns provider `printful` for every order with `merch` (fulfillment.mjs:115-118), so it was dead code.
- Not guarded (same as the webhook path): a paid merch order with no shipping address will be recorded `failed` ("this order has no shipping address"). Decide in round 59 whether the steward button should be able to resend after the address is fixed.

## Measured (fresh clone of main @ 00fb125, `npm ci --omit=dev`, only checkout.mjs + the new test copied in; Node server-free)
- `node --test test/merch-checkout.mjs test/merch-resend-unsent.mjs`: pass 2, fail 0.
- Test cases: unsent A → one post, `draft`, `provider_order` set; second call → `sent: []`, no new post; B (refused earlier, `failed`) → untouched before and after; C (paid, not merch) → untouched; E with `COMMONS_PAYMENTS=closed` → `skipped: 1`, no post, no record, then after reopening it is sent.
- Mutant 1, drop `&& !o.fulfillment` (git diff showed only that code line): RED, "only the unsent merch order is sent" (B gets re-posted).
- Mutant 2, delete the `if (!paymentsOpen())` line: RED, AssertionError at the payments-closed case (the order is buried / posted).
- Wider run `market-* merch-* sell-*`: 117 pass, 9 fail. All nine are 15-second timeouts of tests that boot the server or open Chromium (merch-299-signed-in, merch-aletheia-visual, market hero/menu tests, …): this sandbox can't boot the Commons. Baseline for those NOT measured by me (my stash-and-compare run timed out), so I only claim they don't touch `resendUnsent`; Setu's booted run is the real check.

## Limits
- Not run with a booted server (not needed: nothing calls it yet).
- Concurrent-process races are out of scope (`sending` is in-memory, one process). Sequential loop; an order that arrives mid-loop isn't in `todo`.
- Setu: please give the second yes on the exact SHA of the `kin-build/` branch.
