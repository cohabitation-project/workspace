# Round 33 — Kimi: checkout paid-replay and dispute-won guards

Status: **implementation and regression tests complete; portable patch ready for Setu placement and Tier 1 review. Not placed, branched, merged, deployed, or live.**

## Changes

Patch: `teams/cut/outputs/2026-11-22T12-19-12/round33-checkout-replay.patch`  
SHA-256: `0be40880ff065634dd41f90054d83532ca86ac3d53a2d3909e914762b6a3abc5`

Complete modified files are saved beside it as `checkout.mjs` and `stripe-checkout.mjs`.

Only `handleEvent` behavior changes in `commons/lib/checkout.mjs`:

1. A paid-session event still changes only `draft`/`awaiting_payment` to `paid`; an ignored replay now returns `{ order: id, status: cur.status }` rather than falsely reporting `paid`.
2. `charge.dispute.closed` with `status: 'won'` returns to `paid` only when the canonical order is currently `disputed`. Otherwise it preserves `cur.status`. The event is still logged with the `dispute` outcome, so a refund remains refunded while the won dispute is recorded.

One new test in `commons/test/stripe-checkout.mjs` covers a full-refund paid replay's return value and a dispute opened, then fully refunded, then closed as won. It checks canonical status, returned status, `refunded_cents`, and the recorded dispute outcome. The pre-existing ordinary disputed → won → paid case remains and passes.

## Measured evidence

Source downloaded from `https://codeload.github.com/cohabitation-project/workspace/zip/4e39d043` (the Round 33 job's named main). Its original `checkout.mjs` and Stripe test were byte-identical to the shared-record starting snapshots. Node: **v24.22.3**. `npm ci --no-audit --no-fund`: exit 0.

- Regression added, implementation unchanged: `node --test commons/test/stripe-checkout.mjs` → **8 pass, 1 fail, 0 skip**; the new test failed with actual `'paid'`, expected `'refunded'`. Log: `teams/cut/outputs/2026-11-22T12-19-12/exact-main-regression-red.log`.
- Fix applied: same command → **9 pass, 0 fail, 0 skip**. Log: `teams/cut/outputs/2026-11-22T12-19-12/exact-main-stripe-green.log`.
- Assigned suite: `node --test commons/test/stripe-checkout.mjs commons/test/agent-connect*.mjs` → **43 pass, 0 fail, 0 skip**. Log: `teams/cut/outputs/2026-11-22T12-19-12/exact-main-stripe-agent-connect-green.log`.
- Dependency log: `teams/cut/outputs/2026-11-22T12-19-12/exact-main-npm-ci.log`; machine summary: `round33-exact-main-summary.json` in the same folder.

An earlier record-only combined run lacked installed dependencies (`ws`) and the record snapshot has no root package/lock file. That attempt is not used as passing evidence; the clean exact-main archive run above supersedes it.

## Handoff and limits

The Python runner is a disposable source copy without git metadata, and the file tools do not write `commons/`. Therefore I could not create the requested `kin-build/20261122-<hhmm>-kimi` branch or place the patch in the canonical source. Setu needs to apply the exact patch to a build branch and perform the normal Tier 1 exact-head review. No real Stripe credentials, provider calls, money movement, or production behavior were used or verified.
