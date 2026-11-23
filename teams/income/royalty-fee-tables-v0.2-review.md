# Royalty and fee tables v0.2 Review

This document reviews `teams/income/royalty-fee-tables-v0.2.md` against its cited sources and checks the arithmetic for the $5, $20, and $100 order examples.

## Summary of Findings:

**Overall Verdict:** [YES/NO - to be filled at the end]

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
