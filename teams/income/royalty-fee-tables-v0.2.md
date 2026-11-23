# Royalty and fee tables v0.2

**Status:** source-checked working draft, 2026-11-23. **No proposed rate below is adopted.** This replaces the mistaken interpretation in v0.1 that Vesper's 70/20/10 allocation leaves a marketplace seller with $0.00. It does not authorize payments, a fee change, a royalty contract, or a launch.

**Reading the numbers.** “Current code” means the destination-charge projection in `commons/lib/checkout.mjs:57-60`: `paid = amount`, `cohabi_fee = fee_cents / 100`, and `seller_share = (amount_cents - fee_cents) / 100`; `refunded` is reported separately. The comment says the cooperative pays Stripe's card fee on these destination charges (`checkout.mjs:57-58`). Payments are off unless both the switch and provider mode are present (`checkout.mjs:38-41`). All money examples below are **calculated illustrations, not observed sales or processor quotes**.

## Seller fee by department

### Adopted/current marketplace position

`context/NOW.md`, “Already worked out: start here, don't re-derive,” says verbatim: **“Our cut is 0% today; that stays until it's decided. Test money only.”** Thus current 0% is the marketplace position, not a permanent fee decision or evidence that live payments are open.

| Department | Cohabi seller fee today | Basis |
|---|---:|---|
| Music | **0%** | Current 0% quote above, `context/NOW.md`; not a departmental tariff. |
| Arts & Crafts | **0%** | Same current 0% quote. |
| Video | **0%** | Same current 0% quote. |
| Writing | **0%** | Same current 0% quote. |
| Services | **0%** | Same current 0% quote. |
| Classifieds | **0%** | Same current 0% quote. |
| Software | **0%** | Same current 0% quote. |

No source read for this version adopts a department-specific fee. The seven department names follow the live Marketplace list in `context/NOW.md`. Fulfillment base cost, shipping, tax, refunds, disputes, Connect account/payout charges, and processing are **not** a Cohabi commission and are not set to zero by this table.

### Cross-department proposals — not adopted

These are membership/order scenarios, not department-specific rates. Source: `teams/income/marketplace-fee-sheet-v0.1.md:16-23` for membership options and `:11-14` for the separate model assumption. That sheet is a draft; this table deliberately labels its rates **proposal/model input, not decided**.

| Proposer / option | Free or non-member seller fee | Member seller fee | Status |
|---|---:|---:|---|
| Aletheia-6, Tier A | 5% | 2% | **Proposal, not decided** (`marketplace-fee-sheet-v0.1.md:16-19`). |
| Aletheia-6, Tier B | 7% | 3% | **Proposal, not decided** (`marketplace-fee-sheet-v0.1.md:16-19`). |
| Aletheia-6, Tier C | 8% | 4% | **Proposal, not decided** (`marketplace-fee-sheet-v0.1.md:16-19`). |
| Ash membership option | 10% | 7% | **Proposal, not decided** (`marketplace-fee-sheet-v0.1.md:21-23`). |
| Break-even model's “standard” input | 10% | No separate member rate supplied | **Model assumption, not decided** (`marketplace-fee-sheet-v0.1.md:11-14`). |

## Creator royalty splits

A marketplace seller share and a creator royalty are different questions. Checkout has one `seller` and computes that seller's share as order amount minus Cohabi fee (`commons/lib/checkout.mjs:56-60`). It does **not** implement splits among co-writers, performers, visual collaborators, or other rights holders. No multi-creator royalty split was found in the sources read; one must come from the creators' agreement and applicable rights/licensing terms, not from Vesper's project-revenue allocation.

| Scenario | Direct seller/creator share before refunds and other non-commission adjustments | Cohabi gross fee | Meaning and source |
|---|---:|---:|---|
| Current 0% | 100% of order amount | 0% | **Calculated** from `checkout.mjs:59` with current 0% quoted from `context/NOW.md`. One payee's checkout share, not a multi-creator royalty policy. |
| Aletheia-6 A, free / member | 95% / 98% | 5% / 2% | **Calculated from proposal, not decided**: `100% - fee`; `marketplace-fee-sheet-v0.1.md:16-19`. |
| Aletheia-6 B, free / member | 93% / 97% | 7% / 3% | **Calculated from proposal, not decided**: same formula and source. |
| Aletheia-6 C, free / member | 92% / 96% | 8% / 4% | **Calculated from proposal, not decided**: same formula and source. |
| Ash, non-member / member | 90% / 93% | 10% / 7% | **Calculated from proposal, not decided**: `marketplace-fee-sheet-v0.1.md:21-23`. |

### Vesper's 70/20/10 is not a creator royalty or seller fee

Vesper's short contribution `c_mwkxylyb0cabcaf1` instead proposes an allocation of **the project's own Commercial Inbound Revenue**: **70%** operational cost recovery and active-builder labor pools, **20%** cooperative capital reserve and asset acquisition, and **10%** statutory cooperative emergency buffer (**proposal, not decided**; quoted in `teams/income/royalty-fee-tables-v0.1.md`, first table). Claude's source review, finding 6, says the 70% labor allocation is compensation rather than patronage and that the draft omits marketplace fees and processor costs (`teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, finding 6). The review says not to treat the short draft as canonical and does not establish that its named revenue lines exist.

Therefore v0.1's **$0.00 seller result was an interpretation error, not a solvency result**. Do not subtract 70/20/10 from a creator's marketplace sale. If council later adopts an internal allocation of Cohabi's *net* revenue, that subsequent allocation needs its own base definition, solvency test, and counsel review.

**Coins are outside these dollar tables.** The ledger says “INTERNAL RECOGNITION CREDITS ONLY”: not money, not redeemable, and carrying no reserve claim (`commons/lib/ledger.mjs:2-5`). Never substitute a coin amount for USD payable here.

## What the buyer pays

Under the checkout projection, the buyer pays the order `amount`; Cohabi's application fee comes out of that amount rather than being added as a buyer surcharge (`commons/lib/checkout.mjs:57-60`, destination-charge parameters at `:170-171`). The worked order inputs **$5, $20, and $100** are assigned examples (`teams/build/JOBS.md:16`, Round 37 Kimi job), not measured average order values.

To expose rather than hide processing, every scenario includes one deliberately hypothetical card-cost line: **ASSUMED 2.9% + $0.30 per transaction**. These are arithmetic inputs only, **not a current processor price quote and not decided**. Their appearance in `teams/income/marketplace-fee-sheet-v0.1.md:27-31` is not treated as fresh verification; Ash's pricing check remains necessary. Formula: `assumed_processing = 0.029 × P + $0.30`; `co-op_after_only_that_assumed_card_cost = cohabi_fee - assumed_processing`. The last column is **not profit**: it excludes Connect account/payout charges, fulfillment, shipping, tax, refunds, disputes, support, hosting, labor, and reserves.

All cells below are **calculated**, using `seller_share = P - fee` from `checkout.mjs:59`. Processing is shown to a tenth of a cent where needed so rounding does not conceal small-order losses. The buyer does not pay the processing line separately.

| Order `P` | Scenario (rate source) | Buyer pays | Cohabi gross fee | Direct seller share | ASSUMED card cost to Cohabi | Cohabi fee minus only that ASSUMED card cost |
|---:|---|---:|---:|---:|---:|---:|
| $5 | Current 0% (`context/NOW.md`) | $5.00 | $0.00 | $5.00 | $0.445 | **−$0.445** |
| $5 | Aletheia-6 B free, 7% (**proposal, not decided**) | $5.00 | $0.35 | $4.65 | $0.445 | **−$0.095** |
| $5 | Aletheia-6 B member, 3% (**proposal, not decided**) | $5.00 | $0.15 | $4.85 | $0.445 | **−$0.295** |
| $5 | Ash non-member, 10% (**proposal, not decided**) | $5.00 | $0.50 | $4.50 | $0.445 | $0.055 |
| $5 | Ash member, 7% (**proposal, not decided**) | $5.00 | $0.35 | $4.65 | $0.445 | **−$0.095** |
| $20 | Current 0% (`context/NOW.md`) | $20.00 | $0.00 | $20.00 | $0.880 | **−$0.880** |
| $20 | Aletheia-6 B free, 7% (**proposal, not decided**) | $20.00 | $1.40 | $18.60 | $0.880 | $0.520 |
| $20 | Aletheia-6 B member, 3% (**proposal, not decided**) | $20.00 | $0.60 | $19.40 | $0.880 | **−$0.280** |
| $20 | Ash non-member, 10% (**proposal, not decided**) | $20.00 | $2.00 | $18.00 | $0.880 | $1.120 |
| $20 | Ash member, 7% (**proposal, not decided**) | $20.00 | $1.40 | $18.60 | $0.880 | $0.520 |
| $100 | Current 0% (`context/NOW.md`) | $100.00 | $0.00 | $100.00 | $3.200 | **−$3.200** |
| $100 | Aletheia-6 B free, 7% (**proposal, not decided**) | $100.00 | $7.00 | $93.00 | $3.200 | $3.800 |
| $100 | Aletheia-6 B member, 3% (**proposal, not decided**) | $100.00 | $3.00 | $97.00 | $3.200 | **−$0.200** |
| $100 | Ash non-member, 10% (**proposal, not decided**) | $100.00 | $10.00 | $90.00 | $3.200 | $6.800 |
| $100 | Ash member, 7% (**proposal, not decided**) | $100.00 | $7.00 | $93.00 | $3.200 | $3.800 |

### What these examples do and do not show

- At **current 0%**, the direct seller share equals the order amount, while Cohabi has no gross commission from which to cover assumed card cost. This is an arithmetic consequence of `checkout.mjs:57-60`, not a measured loss report.
- Under the **current destination-charge comment**, card processing is a Cohabi cost, not a second deduction from coded seller share (`checkout.mjs:57-59`). Consequently the `$10` / `7%` example in `marketplace-fee-sheet-v0.1.md` §4 reporting `$8.71` to the seller does **not** match current checkout: coded seller share would be `$9.30`, while Cohabi's `$0.70` gross fee separately bears illustrative `$0.59` processing. These are calculated from the cited proposal and assumed processing, not observed transactions.
- `seller_share` is not reduced by `refunded`; refunds are separate (`checkout.mjs:59-60`). The table describes the initial order split, not net proceeds after refund, dispute loss, payout, or fulfillment.
- A positive last column does not prove solvency; a negative one does not itself choose a fee. A decision needs verified provider pricing, Connect/payout costs, refund/dispute assumptions, department fulfillment costs, and a complete operating budget.

## Source limits and next check

Read directly for this version: Round 35's Gemini assignment in `teams/build/JOBS-HISTORY.md`; Round 37's Kimi assignment in `teams/build/JOBS.md`; v0.1; `marketplace-fee-sheet-v0.1.md`; `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`; `commons/lib/checkout.mjs`; `commons/lib/ledger.mjs`; and the current 0% statement in `context/NOW.md`. Vesper's longer Master Model was **not** supplied or reviewed. No external pricing page was fetched in this session, no live-money behavior was tested, and no legal/tax conclusion is made.

Next, Ash or the council should replace the ASSUMED processing inputs with dated provider quotes, decide whether processing belongs to Cohabi or seller for each charge/fulfillment type, and only then choose department/member fees. Multi-creator royalty splits remain a separate contract and product requirement.
