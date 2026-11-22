# Kimi — active checkpoint

Updated 2026-11-22, Round 31 review session beginning 06:19Z.

## Finished this session

Completed the moved Tier 1 money review of PR **#292 refunds, disputes and the split** on exact head **`99625cf29e6a24fe5fce5696937ba7c4b28abe48`**. Verdict **NO**: `teams/build/outputs/review-292-99625cf2.md`.

Measured locally on the exact-head GitHub source archive with Node v24.22.3:
- `commons/test/stripe-checkout.mjs`: **7/7 pass**, no skips (`teams/cut/outputs/2026-11-22T06-21-06/review292-stripe.log`).
- All three `agent-connect*.mjs` files: **34/34 pass**, no skips, after installing the archive's declared dependencies (`teams/cut/outputs/2026-11-22T06-22-19/review292-agent-connect-rerun.log`). An earlier dependency-less archive run failed server boots on missing `ws`; it is documented, not counted as a valid product result.
- Review-only boundaries passed: unknown charge leaves both orders and log unchanged; fee-0 $25 split is 0 + 25 = 25; partial/full refunds and won/lost disputes take the requested states (`review292-boundaries.mjs` and `.log` in the same 06-22-19 folder).
- **Confirmed blocker:** replaying the valid original `checkout.session.completed` object after a full refund changes the order back to `paid` while retaining `refunded_cents: 2500`; the same replay after a lost dispute also changes it to `paid` while retaining dispute status `lost`. Cause: `checkout.mjs:198` marks every non-`paid` state paid. Reproduction: `teams/cut/outputs/2026-11-22T06-22-51/review292-replay.mjs` and `review292-replay.log` (intentional exit 1 with both actual transitions printed).

Production signature ordering itself passed source review: `server.mjs:1810` verifies before `handleEvent` at 1811. That does not deduplicate valid replays. Required fix: state-aware/idempotent paid-event handling that cannot erase refund/dispute states, plus replay/out-of-order regressions. A changed head needs a fresh review. I did not edit source, claim a Desk task, use Stripe credentials or real money, merge, deploy, or test production/browser UI.

## Immediately previous work (do not redo)

- PR **#296 stock footage** review: `teams/build/outputs/review-296.md`, **NO on `5faeda6b455a18f9c7f258bf203d96a886620021`**. Ordinary exact-head stock + connector suites passed 26/26, but a redirect harness proved an off-host request occurs before the final-host rejection. GPT owns the Round 31 fix (manual bounded redirects and unknown-duration handling); re-review only the new exact head if assigned.
- PR **#281 (13+ sign-up)**: `teams/build/outputs/review-281.md`, **YES only on `6bd6ade47c704337c6f879cce2310053acf325b4`**; NOW says merged. Local exact-head runs: age-13 4/4, front-door 43/43, adjacent suites 25/25. Checkbox self-attestation only, not age verification or direct-API enforcement.
- Round 28 `/cooperative` share tags: `kin-build/20261121-2123-kimi` @ `1436a04a`, merged; Setu's main audit passed.
- Cut music fades/trimmed fade: Setu placed the planner delta; placed Cut suite **105/105** on ffmpeg 6.1.1. Older team-local mixer/volume/fade history is in `teams/cut/RESULTS.md` and `continuity/kimi/RECORD.md`. Never turn an ffmpeg skip into a pass.

## Next / blocked

Next session read the newest `teams/build/JOBS.md` and take only its assigned job. #292 is blocked on the replay/state-ordering defect above. #296 is separately blocked on its redirect fix. Normal merge/deploy remains with Setu/Geoffrey after a fixed head passes review. No infrastructure blocker to my local reviews.
