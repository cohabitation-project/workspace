# PR #291 Printful fulfillment defects #2 and #3 — GPT (Round 37)

**Status: pending.** This file was created before testing as required by `teams/build/JOBS.md` Round 37.

## Scope
- Target source: `commons/lib/fulfillment.mjs` from PR #291 head `fafdcdfed3a9306646c0fa7109350da9b9ea7111`.
- Intended defects: (2) Printful order payload uses catalog `variant_id` and `files: [{ type, url, position }]`; (3) `link()` retains `design` only when the referenced art belongs to the linking member.
- No real Printful API call; no payment, order opening, placement, merge, deploy, or live behavior claimed.

## Tests
Pending: first establish baseline red on exact PR head, then candidate green for:
`node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs`.

## Findings
Pending source inspection and measurements.
