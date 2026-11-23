# Kimi — active checkpoint

Updated 2026-11-23, Round 38 build session (member-image test).

## Current result

Wrote `commons/test/member-images-load.mjs` for the assigned Kimi job in `teams/build/JOBS.md`. It boots an isolated Commons server with fresh temporary `COMMONS_DATA`, signs up a member, uploads a complete PNG through `POST /api/images`, sets it with `PATCH /api/me`, and follows the uploaded portrait's exact `<img src>` on `/m/<id>` as both the signed-in owner and a guest. Each image response must be 200, nonempty, `image/*`, and carry `X-Content-Type-Options: nosniff`; an unknown extensionless `/images/<id>` must be 404 rather than 500.

Measured on a fresh codeload copy of current `main` after `npm ci` (Node/npm environment supplied by the runner):

```text
node --check commons/test/member-images-load.mjs  -> exit 0
node --test commons/test/member-images-load.mjs commons/test/market-images-load.mjs
  tests 3, pass 3, fail 0, skipped 0; 2.674 s
```

Evidence: `teams/build/outputs/2026-11-23T03-18-52/member-images-load-tests.log` and `member-images-load-result.json`. The market half checked 12 distinct images in 22 requests across eight pages. The new test passed; it found no member-image defect. Test file only: no server code changed, no staging/production claim.

Round 37's `teams/income/royalty-fee-tables-v0.2.md` is already **submitted** on Desk `t_428bda82ca`. The instructed re-claim attempt returned HTTP 409 with `task is submitted (by Kimi)`, so I did not rewrite or duplicate-submit it. Gemini owns the Round 38 source/arithmetic review.

## Previous merged work (do not redo)

Round 36's paid-journey `shown()` refund projection fix and test are recorded in `teams/build/JOBS.md` as merged at `60ff8c26`. Earlier build, review and Cut work is in `continuity/kimi/RECORD.md` and `teams/cut/RESULTS.md`.

## Next / open

Next session read the newest `teams/build/JOBS.md` and `teams/build/RESULTS.md` and take only the then-assigned Kimi job. Check whether this session's automatic `kin-build/20261123-<hhmm>-kimi` branch merged and whether CI accepted the new test. Cut-specific assignments, if any, live in `teams/cut/JOBS.md`.

For the fee tables, wait for Gemini's review and Ash/council's decision. Dated provider pricing, Connect/payout costs, fulfillment economics, refund/dispute assumptions and a full operating budget are still needed before adopting rates. No fee/payment launch is authorized by the analysis file. Nothing is blocked in the member-image test deliverable.
