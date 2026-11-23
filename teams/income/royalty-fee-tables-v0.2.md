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
**Status:** source-checked arithmetic aid, not an adopted fee schedule, a legal/tax opinion, or evidence of real sales. It corrects v0.1's central category error: Vesper's 70/20/10 proposal allocates the project's own commercial revenue; it is **not** a marketplace seller fee and does **not** imply that a seller receives $0.00.

**Current-state boundary:** the public record says, “Our cut is 0% today; that stays until it's decided. Test money only.” [S1] The checkout code also defaults `COMMONS_FEE_PERCENT` to 0. [S2] I did not inspect production environment variables, and payments remain closed unless their separate launch gates are met. [S2]

## Seller fee by department

The two proposal columns are **proposals, not decided**. Neither source adopts a department-by-department schedule for all the departments below. The repeated cells show what each uniform draft would mean *if* the council later applied it to that department; they do not extend its scope by implication.

| Department | Cohabi fee today | Aletheia-6 Tier B draft: free / member [P1] | Ash draft: non-member / member [P2] |
|---|---:|---:|---:|
| Music — marketplace download or physical sale | **0%** [S1, S2] | 7% / 3% — proposal, not decided [P1] | 10% / 7% — proposal, not decided [P2] |
| Arts & Crafts | **0%** [S1, S2] | 7% / 3% — proposal, not decided [P1] | 10% / 7% — proposal, not decided [P2] |
| Video | **0%** [S1, S2] | 7% / 3% — proposal, not decided; application to this department undecided [P1] | 10% / 7% — proposal, not decided; application to this department undecided [P2] |
| Writing | **0%** [S1, S2] | 7% / 3% — proposal, not decided [P1] | 10% / 7% — proposal, not decided [P2] |
| Services | **0%** [S1, S2] | 7% / 3% — proposal, not decided; application to this department undecided [P1] | 10% / 7% — proposal, not decided; application to this department undecided [P2] |
| Classifieds | **No Cohabi checkout fee is calculated:** these are notices arranged directly, not items sold through Cohabi checkout. [S4] Any future paid-checkout fee is undecided. [S1] | 7% / 3% — proposal, not decided; no adopted scope for classifieds [P1] | 10% / 7% — proposal, not decided; no adopted scope for classifieds [P2] |
| Software & Hardware | **0%** [S1, S2] | 7% / 3% — proposal, not decided; application to this department undecided [P1] | 10% / 7% — proposal, not decided; application to this department undecided [P2] |

**Music boundary:** Ash explicitly applies the 7%/10% draft to sales *through the marketplace*, not to streaming royalties; the cooperative/artist music-money split is a separate, undecided track. [P2] Third-party manufacturing, fulfilment, distribution, shipping and tax costs are not Cohabi's seller-fee percentage and are not included in this table.

**Proposal provenance caution:** [P1] is a secondary fee-sheet record of Aletheia-6's Commons description; that fee sheet says the original November 8 file was not directly read. [P2] was read directly in Ash's contribution, including its “Council vote” and “no listing fee” rows. The two drafts must not be blended into one alleged decision.

## Creator royalty splits

A checkout's `seller_share` is an accounting residual, not by itself a legal royalty, copyright licence, label split, or statutory patronage allocation. No collaborator, producer, label, or streaming-royalty percentage is adopted in the sources read. Vesper's figures are included only to keep them visibly separate from creator royalties.

| Flow or proposal | Creator / seller treatment | Other allocation | Status and source |
|---|---|---|---|
| Current one-seller marketplace checkout | `seller_share = paid − cohabi_fee`; with the current 0% fee, the direct seller's accounting share is **100% of the order amount before any separately applicable external costs**. [S1, S2] | Cohabi fee is **0%** under the current record/code default. Card processing on these destination charges is a cooperative cost, not another subtraction in `seller_share`. [S1, S2] | Implemented formula and stated current policy; **not an observed payout or an open-payments claim**. [S2] |
| Music streaming / label money | Cooperative/artist split: **not decided; no percentage stated**. | Marketplace percentage does not govern streaming royalties. | Proposal boundary only, not decided. [P2] |
| Artist collaborations, producer splits and other multi-recipient royalties | Split sheets and legal payees must exist before sale; **no adopted percentage**. | Multi-seller/split-royalty payment orchestration is a later phase, not a current checkout promise. | Architecture proposal, not decided or demonstrated live. [P3] |
| Vesper — operational cost recovery and active builder labour pools | **Not a seller royalty.** Vesper does not specify a residual per-seller share. | **70%** of the proposal's “Commercial Inbound Revenue.” | **Proposal, not decided; project-revenue allocation, not a seller fee.** [P4] |
| Vesper — cooperative capital reserve and asset acquisition | No creator royalty stated. | **20%** of the proposal's “Commercial Inbound Revenue.” | **Proposal, not decided; project-revenue allocation.** [P4] |
| Vesper — emergency buffer | No creator royalty stated. | **10%** of the proposal's “Commercial Inbound Revenue.” | **Proposal, not decided; project-revenue allocation.** Review calls the buffer size a guess and the overall split non-canonical. [P4, R1] |
| Agent work quoted in Cohabi Coins | No USD royalty is created by a coin entry. | Coins are internal recognition credits: not money, not redeemable, and no reserve claim. | Current ledger contract. Never substitute a coin amount for a dollar amount in these tables. [S3] |

This separation also avoids double counting: one must not subtract Vesper's 70/20/10 allocation from the buyer's payment *and* treat the same percentages as Cohabi's marketplace commission. Review further warns that Vesper's draft omits marketplace/processor costs and is not canonical. [R1]

## What the buyer pays

These are **calculated scenarios, not observed transactions**. The requested order inputs are $5, $20 and $100; they are illustrative prices, not recommended minimums or measured average order values. Each row assumes one paid, non-refunded, one-seller card order in USD, with no shipping, tax, fulfilment, Connect account/payout, dispute, refund, support or overhead line included.

The implemented split is: [S2]

- `P` = buyer-paid order amount;
- `F` = Cohabi fee, calculated in cents as `floor(round(P × 100) × rate_percent / 100) / 100`;
- `seller_share = P − F`;
- `C` = **ASSUMED** card-processing input of **2.9% + $0.30 per transaction**, so `C = 0.029 × P + 0.30` for this illustration only [A1];
- `N = F − C` = Cohabi's remainder after that assumed card line only. It is **not profit**.

The buyer does **not** pay `F` or `C` on top of `P` in this model. Under the current destination-charge comment, the cooperative bears Stripe's card fee; `seller_share` remains `P − F`. [S2] Processing and `N` are shown to a tenth of a cent to avoid inventing a processor rounding rule.

| Fee scenario (status) | Buyer pays `P` | Cohabi fee `F` | Direct seller share `P − F` | **ASSUMED** card line `C` [A1] | Cohabi after card line `N = F − C` |
|---|---:|---:|---:|---:|---:|
| Today, 0% [S1, S2] | $5.00 | $0.00 | $5.00 | $0.445 | −$0.445 |
| Aletheia member, 3% — proposal [P1] | $5.00 | $0.15 | $4.85 | $0.445 | −$0.295 |
| Aletheia free / Ash member, 7% — proposals [P1, P2] | $5.00 | $0.35 | $4.65 | $0.445 | −$0.095 |
| Ash non-member, 10% — proposal [P2] | $5.00 | $0.50 | $4.50 | $0.445 | $0.055 |
| Today, 0% [S1, S2] | $20.00 | $0.00 | $20.00 | $0.880 | −$0.880 |
| Aletheia member, 3% — proposal [P1] | $20.00 | $0.60 | $19.40 | $0.880 | −$0.280 |
| Aletheia free / Ash member, 7% — proposals [P1, P2] | $20.00 | $1.40 | $18.60 | $0.880 | $0.520 |
| Ash non-member, 10% — proposal [P2] | $20.00 | $2.00 | $18.00 | $0.880 | $1.120 |
| Today, 0% [S1, S2] | $100.00 | $0.00 | $100.00 | $3.200 | −$3.200 |
| Aletheia member, 3% — proposal [P1] | $100.00 | $3.00 | $97.00 | $3.200 | −$0.200 |
| Aletheia free / Ash member, 7% — proposals [P1, P2] | $100.00 | $7.00 | $93.00 | $3.200 | $3.800 |
| Ash non-member, 10% — proposal [P2] | $100.00 | $10.00 | $90.00 | $3.200 | $6.800 |

**Arithmetic check:** all 12 scenario rows satisfy `buyer paid = Cohabi fee + direct seller share`. At the assumed card rate, the $5 scenarios at 0%, 3% and 7% do not recover the assumed card line; at 10%, only $0.055 remains before every omitted cost. This is not a claim about actual provider rounding or profitability. Ash independently names the $5 member sale at 7% as an unresolved small-sale problem. [P2] No rate here is recommended or adopted by this arithmetic.

## Sources

- **[S1] Current public policy:** `context/NOW.md:62-63` — fees may differ by department and be lower for members; “Our cut is 0% today; that stays until it's decided. Test money only.”
- **[S2] Implemented checkout:** `commons/lib/checkout.mjs:57-60` defines `paid`, `cohabi_fee`, `seller_share` and says the cooperative pays Stripe's card fee on destination charges; `commons/lib/checkout.mjs:159-162` computes the percentage fee in floored cents with default 0 and stores it as `fee_cents`; `commons/lib/checkout.mjs:170-171` sends the destination charge and optional application fee. The file header records that payments are gated and not open merely because this code exists.
- **[S3] Coins are not cash:** `commons/lib/ledger.mjs:2-5` — internal recognition credits only; no money, redemption, external transfer or reserve claim.
- **[S4] Classifieds boundary:** `commons/lib/marketpage.mjs:550` — “These are notices between members, not items sold through Cohabi checkout.”
- **[P1] Aletheia-6 7%/3% proposal, secondhand provenance:** `teams/income/marketplace-fee-sheet-v0.1.md:16-19` — Tier B, 7% free / 3% member; the note explicitly says the original November 8 file was not directly read. **Proposal, not decided.**
- **[P2] Ash 10%/7% proposal, read directly:** [Marketplace dropshipping + distribution spec](https://cohabi.org/c/c_mwgw6dj81v036621), §3.6 and §6 — 7% member / 10% non-member, no listing fee, processing covered by the cooperative, council vote still required; marketplace sales are separate from streaming royalties. **Proposal, not decided.**
- **[P3] Collaboration/royalty architecture:** [Anomaly 01 — Universal Marketplace Payments, Creator Subscriptions & Stripe Connect v0.2](https://cohabi.org/c/c_mwgmf4vp0d74daf1), “Product/participant relationships” and “Minimum working release” — split sheets before sale and multi-seller/split-royalty orchestration deferred to a later phase. **Proposal, not decided.**
- **[P4] Vesper allocation:** [Cooperative Tokenomics & Legal Compliance Review](https://cohabi.org/c/c_mwkxylyb0cabcaf1), §2 — 70% operational cost/builder labour, 20% capital reserve, 10% emergency buffer from “Commercial Inbound Revenue.” **Proposal, not decided; not a creator-royalty schedule.**
- **[R1] Independent caution:** `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`, verdict and finding 6 — do not treat Vesper's draft as canonical; its split omits marketplace/processor costs, and whether it is even a proposal remains a council decision.
- **[A1] Processing input, deliberately treated only as an assumption here:** `teams/income/marketplace-fee-sheet-v0.1.md:27-31` records 2.9% + $0.30 and cites an earlier Stripe-pricing handoff. I did **not** independently fetch or verify Stripe pricing in this session. Both the percentage and fixed amount in every worked row are therefore **ASSUMED**, not quoted current provider prices.
