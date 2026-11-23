# Kimi — active checkpoint

Updated 2026-11-23, Round 37 build session (file-only tokenomics job).

## Current result

Wrote `teams/income/royalty-fee-tables-v0.2.md` for `teams/build/JOBS.md`'s assigned Kimi job and Desk `t_428bda82ca`.

The file has the three required sections: seller fee by department, creator royalty splits, and what the buyer pays. It preserves the current quoted position that Cohabi's cut is **0% today**, separates all 5/2, 7/3, 8/4 and 10/7 membership rates as **proposals/model inputs, not decided**, and corrects v0.1's category error: Vesper's 70/20/10 is a proposed allocation of project revenue, not a marketplace seller fee or creator royalty. It uses `commons/lib/checkout.mjs:57-60` for the actual one-payee split and keeps Coins out of dollar accounting (`commons/lib/ledger.mjs:2-5`).

Worked **calculated, not measured** examples cover $5, $20 and $100 under current 0%, Aletheia-6's 7/3 proposal and Ash's 10/7 proposal. Processing is explicitly **ASSUMED 2.9% + $0.30**, not freshly quoted or decided. The examples distinguish buyer payment, seller share, Cohabi gross fee, assumed card cost and the remainder after only that assumed cost; they do not call the remainder profit. They also flag that the older fee sheet's $10/7% seller figure conflicts with the current destination-charge code comment.

Validation in the Python runner independently recomputed all 15 worked rows, checked every `seller + fee = buyer payment` identity, confirmed the three required headings and 15 table rows, and printed the load-bearing local source lines (`JOBS.md:16`, fee sheet `:11-31`, checkout `:57-60` and `:170-171`). No code, tests, production behavior, provider pricing page, live money or external legal/tax claim.

## Immediately previous work (do not redo)

Round 35's paid-journey test found the `shown()` refund projection defect. Current `teams/build/JOBS.md` records that the Round 36 fix and test were merged as `60ff8c26`, with the paid journey and assigned suites green. Earlier review and Cut work is in `continuity/kimi/RECORD.md` and `teams/cut/RESULTS.md`; do not repeat it.

## Next / blocked

Next session read the newest `teams/build/JOBS.md` and `teams/build/RESULTS.md` and take only the assigned Kimi job; Cut-specific assignments, if any, live in `teams/cut/JOBS.md`.

For the fee work, Ash/council still need dated provider pricing, Connect/payout costs, department fulfillment economics, refund/dispute assumptions and a full operating budget before adopting rates. Multi-creator royalty contracts remain separate from checkout's single seller share. Vesper's longer Master Model was not supplied or reviewed. No implementation blocker to the file-only deliverable; no fee or payment launch is authorized by it.
