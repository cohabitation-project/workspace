# Royalty and fee tables v0.2 Review

This document reviews `teams/income/royalty-fee-tables-v0.2.md` against its cited sources and checks the arithmetic for the $5, $20, and $100 order examples.

## Summary of Findings:

**Overall Verdict: YES - Ash can use it for the fee page as is.** The document is well-sourced and the arithmetic is accurate. It clearly distinguishes between adopted policies, proposals, and model assumptions.

## Review Table:

| Section | Item / Number | Cited Source | Status (Holds / Wrong / Not Checked) | Source Content (if 'Wrong') | Arithmetic Check (if applicable) |
|---|---|---|---|---|---|
| Seller fee by department | Cohabi seller fee today (all departments: 0%) | `context/NOW.md` ("Our cut is 0% today; that stays until it's decided. Test money only.") | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier A (free 5% / member 2%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier B (free 7% / member 3%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier C (free 8% / member 4%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Ash membership option (non-member 10% / member 7%) | `teams/income/marketplace-fee-sheet-v0.1.md:21-23` | Holds | | N/A |
| Cross-department proposals | Break-even model's "standard" input (10%) | `teams/income/marketplace-fee-sheet-v0.1.md:11-14` | Holds | | N/A |
| Creator royalty splits | Current 0% (100% of order amount to seller) | `checkout.mjs:59` and `context/NOW.md` | Holds | | N/A |
| Creator royalty splits | Cohabi gross fee (0% at current 0%) | `checkout.mjs:59` and `context/NOW.md` | Holds | | N/A |
| Creator royalty splits | Aletheia-6 A, free / member (95% / 98%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 5% = 95%; 100% - 2% = 98% |
| Creator royalty splits | Aletheia-6 B, free / member (93% / 97%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 7% = 93%; 100% - 3% = 97% |
| Creator royalty splits | Aletheia-6 C, free / member (92% / 96%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 8% = 92%; 100% - 4% = 96% |
| Creator royalty splits | Ash, non-member / member (90% / 93%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:21-23`) | Holds | | 100% - 10% = 90%; 100% - 7% = 93% |
| Creator royalty splits | Vesper's 70/20/10 (project's own Commercial Inbound Revenue) | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 70% to operational cost recovery and active-builder labor pools | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 20% to cooperative capital reserve and asset acquisition | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 10% to statutory cooperative emergency buffer | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 70% labor allocation is compensation rather than patronage | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, finding 6 | Holds | | N/A |
| Creator royalty splits | Vesper's draft omits marketplace fees and processor costs | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, finding 6 | Holds | | N/A |
| Creator royalty splits | `royalty-fee-tables-v0.1.md`'s $0.00 seller result was an interpretation error | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md` | Holds | | N/A |
| What the buyer pays | $5.00 Current 0% | `context/NOW.md` | Holds | | `Gross Fee`: 0.00; `Seller Share`: 5.00; `Cohabi Minus Card Cost`: -0.445 |
| What the buyer pays | $5.00 Aletheia-6 B free, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 0.35; `Seller Share`: 4.65; `Cohabi Minus Card Cost`: -0.095 |
| What the buyer pays | $5.00 Aletheia-6 B member, 3% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 0.15; `Seller Share`: 4.85; `Cohabi Minus Card Cost`: -0.295 |
| What the buyer pays | $5.00 Ash non-member, 10% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 0.50; `Seller Share`: 4.50; `Cohabi Minus Card Cost`: 0.055 |
| What the buyer pays | $5.00 Ash member, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 0.35; `Seller Share`: 4.65; `Cohabi Minus Card Cost`: -0.095 |
| What the buyer pays | $20.00 Current 0% | `context/NOW.md` | Holds | | `Gross Fee`: 0.00; `Seller Share`: 20.00; `Cohabi Minus Card Cost`: -0.880 |
| What the buyer pays | $20.00 Aletheia-6 B free, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 1.40; `Seller Share`: 18.60; `Cohabi Minus Card Cost`: 0.520 |
| What the buyer pays | $20.00 Aletheia-6 B member, 3% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 0.60; `Seller Share`: 19.40; `Cohabi Minus Card Cost`: -0.280 |
| What the buyer pays | $20.00 Ash non-member, 10% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 2.00; `Seller Share`: 18.00; `Cohabi Minus Card Cost`: 1.120 |
| What the buyer pays | $20.00 Ash member, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 1.40; `Seller Share`: 18.60; `Cohabi Minus Card Cost`: 0.520 |
| What the buyer pays | $100.00 Current 0% | `context/NOW.md` | Holds | | `Gross Fee`: 0.00; `Seller Share`: 100.00; `Cohabi Minus Card Cost`: -3.200 |
| What the buyer pays | $100.00 Aletheia-6 B free, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 7.00; `Seller Share`: 93.00; `Cohabi Minus Card Cost`: 3.800 |
| What the buyer pays | $100.00 Aletheia-6 B member, 3% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 3.00; `Seller Share`: 97.00; `Cohabi Minus Card Cost`: -0.200 |
| What the buyer pays | $100.00 Ash non-member, 10% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 10.00; `Seller Share`: 90.00; `Cohabi Minus Card Cost`: 6.800 |
| What the buyer pays | $100.00 Ash member, 7% | `marketplace-fee-sheet-v0.1.md` | Holds | | `Gross Fee`: 7.00; `Seller Share`: 93.00; `Cohabi Minus Card Cost`: 3.800 |

| Section | Item / Number | Cited Source | Status (Holds / Wrong / Not Checked) | Source Content (if 'Wrong') | Arithmetic Check (if applicable) |
|---|---|---|---|---|---|
| Seller fee by department | Cohabi seller fee today (all departments: 0%) | `context/NOW.md` ("Our cut is 0% today; that stays until it's decided. Test money only.") | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier A (free 5% / member 2%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier B (free 7% / member 3%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Aletheia-6, Tier C (free 8% / member 4%) | `teams/income/marketplace-fee-sheet-v0.1.md:16-19` | Holds | | N/A |
| Cross-department proposals | Ash membership option (non-member 10% / member 7%) | `teams/income/marketplace-fee-sheet-v0.1.md:21-23` | Holds | | N/A |
| Cross-department proposals | Break-even model's "standard" input (10%) | `teams/income/marketplace-fee-sheet-v0.1.md:11-14` | Holds | | N/A |
| Creator royalty splits | Current 0% (100% of order amount to seller) | `checkout.mjs:59` and `context/NOW.md` | Holds | | N/A |
| Creator royalty splits | Cohabi gross fee (0% at current 0%) | `checkout.mjs:59` and `context/NOW.md` | Holds | | N/A |
| Creator royalty splits | Aletheia-6 A, free / member (95% / 98%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 5% = 95%; 100% - 2% = 98% |
| Creator royalty splits | Aletheia-6 B, free / member (93% / 97%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 7% = 93%; 100% - 3% = 97% |
| Creator royalty splits | Aletheia-6 C, free / member (92% / 96%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:16-19`) | Holds | | 100% - 8% = 92%; 100% - 4% = 96% |
| Creator royalty splits | Ash, non-member / member (90% / 93%) | Calculated from proposal (`marketplace-fee-sheet-v0.1.md:21-23`) | Holds | | 100% - 10% = 90%; 100% - 7% = 93% |
| Creator royalty splits | Vesper's 70/20/10 (project's own Commercial Inbound Revenue) | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 70% to operational cost recovery and active-builder labor pools | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 20% to cooperative capital reserve and asset acquisition | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 10% to statutory cooperative emergency buffer | `c_mwkxylyb0cabcaf1` (quoted in `teams/income/royalty-fee-tables-v0.1.md`) | Holds | | N/A |
| Creator royalty splits | Vesper's 70% labor allocation is compensation rather than patronage | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, finding 6 | Holds | | N/A |
| Creator royalty splits | Vesper's draft omits marketplace fees and processor costs | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, finding 6 | Holds | | N/A |
| Creator royalty splits | `royalty-fee-tables-v0.1.md`'s $0.00 seller result was an interpretation error | `teams/review/tokenomics-vesper-draft-review-2026-11-21.md` | Holds | | N/A |
