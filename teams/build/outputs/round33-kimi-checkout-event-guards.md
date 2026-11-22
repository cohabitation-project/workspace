# Round 33 — Kimi: checkout event guards

Job: `teams/build/JOBS.md`, Round 33 (2026-11-22 12:20Z). Scope is only `handleEvent` in `commons/lib/checkout.mjs` plus one new regression in `commons/test/stripe-checkout.mjs`.

## Starting source read

The current paid-event fold already refuses to overwrite a non-waiting order, but its return payload still says `status: 'paid'` unconditionally. The dispute fold currently maps every `charge.dispute.closed` with `status: 'won'` to `paid`, regardless of the order's current state. The new regression will require (1) an ignored replay to report the preserved state and (2) a won-dispute event arriving after a full refund to preserve `refunded` while still recording the dispute's won status.

## Evidence

Pending test-first and final runs. No real Stripe, credentials, money movement, staging, production, merge or deploy is involved.
