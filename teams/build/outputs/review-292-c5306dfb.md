# Tier 1 review — PR #292 refunds, disputes and the split

**Verdict: YES on exact head `c5306dfbf62af79949cf2dbe78ccf3040db59eb5` (short `c5306dfb`).**
**Reviewer:** Kimi, Builders Round 32, 2026-11-22.

The Round 31 blocker is fixed in the canonical order fold: a replayed or late paid-session event no longer changes partial/full refund, open-dispute, or lost-dispute states back to `paid`.

## Exact-head evidence

I downloaded `https://codeload.github.com/cohabitation-project/workspace/zip/c5306dfbf62af79949cf2dbe78ccf3040db59eb5` and ran from that archive. I read the exact-head `commons/lib/checkout.mjs`, `commons/test/stripe-checkout.mjs`, and the production webhook route snapshot in `commons/server.mjs`.

- `node --test commons/test/stripe-checkout.mjs`: **8 tests, 8 pass, 0 fail, 0 skip**. The new eighth test passes all four requested regressions: paid-event replay after a partial refund, after a full refund, during an open dispute, and after a lost dispute. Log: `teams/cut/outputs/2026-11-22T09-21-43/review292-stripe.log`; exact test copy: `review292-stripe-checkout.mjs` in that folder.
- My independent review-only harness from Round 31 now exits **0**. It rechecks the zero-fee $25 split (`0 + 25 = 25`), unknown-charge no-op (orders and log unchanged), partial/full refund transitions, won/lost disputes, and paid-event replays after a full refund and lost dispute. The folded states remain `refunded` and `dispute_lost`, with their refund/dispute metadata intact. Harness/log: `teams/cut/outputs/2026-11-22T09-21-43/review292-replay.mjs` and `review292-replay.log`.
- Source inspection: `checkout.mjs:198–202` writes `paid` only when the current order is `awaiting_payment` or `draft`. The official regression test also verifies `partly_refunded`, `refunded`, `disputed`, and `dispute_lost` after replay. Exact source copy: `teams/cut/outputs/2026-11-22T09-21-43/review292-checkout.mjs`.

## Non-blocking observation

On a no-op replay after a later money state, `handleEvent` still returns `{order, status: 'paid'}` at line 202 even though `checkout.order(id).status` correctly remains `refunded`, `disputed`, etc. The production webhook route ignores this return payload, and my checks found no state regression, so I do not block this head on it. Returning `cur.status` would make the internal API less misleading and should be considered in a later small cleanup.

## Scope and limits

This YES is for the assigned replay/state-ordering blocker on the pinned head, building on the Round 31 review of the rest of the PR. It used synthetic events and fake Stripe responses only. I did not edit source, use Stripe credentials, move real money, test a real Stripe delivery, reconcile a payout/balance, exercise browser UI, test a merge with newer main, merge, deploy, or inspect production. This is not a production-payments approval.
# Tier 1 re-review — PR #292 refunds, disputes and the split

**Verdict: YES on exact head `c5306dfbf62af79949cf2dbe78ccf3040db59eb5` (`c5306dfb`).**

Reviewer: Kimi, Builders Round 32, 2026-11-22. This YES is scoped to the assigned fix and exact head. It is not a production-payments approval.

## The prior blocker is fixed

On the earlier head `99625cf2`, replaying a valid paid-session event after a refund or lost dispute appended `paid` and erased the later stored order state. On this head, `commons/lib/checkout.mjs` now appends that transition only when the current state is `awaiting_payment` or `draft`. Partial/full refunds, an open dispute and a lost dispute therefore survive an identical paid-event replay.

Measured on the downloaded exact-head archive (not main):

- `node --test commons/test/stripe-checkout.mjs`: **8/8 pass, 0 fail, 0 skip**. The new official test 8 exercises replay after a partial refund, after a full refund, during an open dispute and after a lost dispute. Log: `teams/build/outputs/2026-11-22T09-21-17/review292-stripe.log`.
- I appended my prior review-only partial-refund replay snippet unchanged to a temporary copy of that exact-head fixture and ran it: **9/9 pass, 0 fail, 0 skip** (eight official tests plus my review test). Log and snippet: `teams/build/outputs/2026-11-22T09-21-58/review292-replay.log` and `review292-replay-snippet.mjs`. Only the temporary test copy changed; product source did not.
- Exact-head source/test snapshots: `teams/build/outputs/2026-11-22T09-21-17/exact-checkout.mjs` and `exact-stripe-checkout.mjs`; archive URL/location: `source-path.txt` in that folder.

The previously reviewed boundaries remain covered by the passing suite: signature verification before the event fold, unknown-charge ignore, partial versus full refund, dispute won/lost handling, and split arithmetic. The ordinary paid transition still works.

## Non-blocking observation

`handleEvent` still returns `{ order: id, status: 'paid' }` for a replay that it deliberately does not write, even when the persisted order remains `partly_refunded`, `refunded`, `disputed`, or `dispute_lost`. The new regression correctly checks `checkout.order(...)`, and the production webhook route discards this return value, so this does **not** recreate the recorded-money-state blocker. It is an inaccurate internal acknowledgement that should be changed to the current stored status before another caller relies on it; I did not turn that untested hypothetical caller into a production blocker.

## Limits

All events and Stripe responses were synthetic/local. I used no Stripe credentials, moved no money, edited no PR source, and did not test a browser, staging, production, a merge with newer main, real Stripe delivery, payout reconciliation, or deployment. Merge/deploy remains with Setu/Geoffrey under the normal process; a changed head needs a fresh review.
