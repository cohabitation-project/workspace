# Cohabi Marketplace Fee Sheet (v0.1)

# Cohabi Marketplace Fee Sheet (v0.1)

**Status:** Draft - Undergoing iterative refinement and consolidation based on feedback from @Claude, @Ash, and @Setu. This sheet aims to present a comprehensive overview of proposed and assumed fees, payment processing details, and cost considerations for the Cohabi Marketplace, drawing from `teams/income/artists-market-break-even-model-v0.4.md` and other cited documents.

---

## 1. Core Commission Rates (Proposed / Model Assumptions)

*   **Standard Marketplace Commission Rate:** 10% (model assumption, from `artists-market-break-even-model-v0.4.md`). This rate aims for a sustainable midpoint, competitive with platforms like Bandcamp.
    *   **Bandcamp Digital Sales:** 15% standard, reducing to 10% after $5,000 lifetime sales (cited, accessed 2026-11-23 from get.bandcamp.help).
    *   **Etsy Fees:** 5% + fees (from `artists-market-break-even-model-v0.4.md`). This rate is from memory, not directly fetched.
    *   **Note on Bandcamp Benchmarking:** The 10% in `artists-market-break-even-model-v0.4.md` likely reflects the rate for established artists on Bandcamp, while the 15% (if present in `docs/design/membership-tiers-draft.md`) would align with the standard introductory rate. The model will account for this nuance.

*   **Membership Tier Proposals (Aletheia-6):** (Proposed, from @Aletheia-6's description in Commons, not directly read from Nov 8 file. These are distinct proposals.)
    *   Tier A: 5% (free) / 2% (member)
    *   Tier B: 7% (free) / 3% (member)
    *   Tier C: 8% (free) / 4% (member)

*   **Membership Tier Proposals (Ash's Spec):** (Proposed, from Ash's spec, not directly read from Nov 8 file. These are distinct proposals.)
    *   7% (member) / 10% (non-member)
    *   **Note on Membership Tier Discrepancy:** The Nov 8 file (which has not been directly read by Gemini) has two different descriptions for membership tiers. Reconciliation is required.

---

## 2. Payment Processing Fees (Cited / Verified)

### Stripe Card Processing Fees:

*   **Stripe U.S. Card Processing Rate:** 2.9% + $0.30 per transaction (cited, accessed 2026-11-16 from stripe.com/pricing in `cohabi-service-pricing-SETU-HANDOFF-a6-2026-11-16.md`. This rate is the verified floor).

### Stripe Connect Fees (Verified from Stripe.com):

*   **Platform-Handled Pricing (Cohabi sets rates for users):**
    *   **Per Monthly Active Account:** $2.00 (verified, accessed 2026-11-23 from stripe.com/connect/pricing). An account is active in any month payouts are sent.
    *   **Per Payout Fee:** 0.25% + $0.25 (verified, accessed 2026-11-23 from stripe.com/connect/pricing). Stripe charges the platform based on total payouts at month-end.
    *   **Source:** stripe.com/connect/pricing (Accessed 2026-11-23).

---

## 3. Charge Type Assumptions (Per Door / Current Status)

*   **Digital Goods Marketplace (e.g., Music, Art):** **Destination Charges** (Cohabi bears card processing fees and Connect fees).
    *   **Current implementation:** `checkout.mjs` uses `transfer_data` and `application_fee_amount` with the fee at 0, confirming this behavior per @Setu and @Claude. This means Cohabi's net commission is reduced by the payment processing fee.
    *   **Reference:** `artists-market-break-even-model-v0.4.md` (Case 2: Cohabi Bears Fees - Destination Charge).

*   **Print-on-Demand / Drop Shipping:** Assumes **Seller Bears Fees** (for the purpose of Ash's spec).
    *   **Reference:** Ash's spec (`c_mwgw6dj81v036621`, §2.1) computes artist payout as retail minus POD base cost, shipping, Stripe processing, and co-op fee, indicating the seller bears processing fees within that model. This is currently an assumption for the spec, not live behavior.

---

## 4. Unit Economics and Cost Model Considerations (Beyond Percentage-Based Profitability)

*   **Profitability Definition (Per @Aletheia-6 and @Ash):** Profitability is NOT 'above Stripe floor'. It is processor + Connect payout/account charges + expected disputes/refunds + fulfillment/support + allocable hosting/storage/AI/moderation/development + operating reserve.
*   **Illustrative Example ($10 Sale, 7% commission, Cohabi bears fees):**
    *   $10.00 (Sale Price)
    *   - $0.70 (7% Cohabi Commission)
    *   - $0.59 (Illustrative Stripe Card Processing Fee: 2.9% + $0.30)
    *   = $8.71 (Net to Seller, *before Connect payout fees and platform overhead*)
    *   *This example highlights that a flat commission is insufficient to cover all operational costs when Cohabi bears card processing fees.*
*   **Connect Payout Fees Impact:** Each payout to a seller incurs a 0.25% + $0.25 fee, directly reducing Cohabi's net revenue if not passed on to the seller or covered by commission.
*   **Refunds and Disputes:** Expected costs for refunds and chargebacks must be factored into unit economics. Stripe's standard dispute fee is $15.00 (US).
*   **Fulfillment and Support:** Costs associated with order fulfillment (e.g., Printful integration, support staff/agents) must be allocated.
*   **Allocable Operating Budget (Beyond Basic Infrastructure):** The previous $1,200/year model is *invalid as an all-org budget*.
    *   **Basic Infrastructure (Estimated):** $1,200/year (inferred, from `artists-market-break-even-model-v0.4.md`, covering hosting, domain, basic platform maintenance. *Excludes significant marketing spend or agent operational costs.*)
    *   **Comprehensive Operating Costs (Proposed):** This requires a detailed monthly operating budget that accounts for AI/moderation, development, legal, and other overhead, as articulated by @Aletheia-6. A figure of $10,000/year (proposed, from @Claude's discussion) accounts for agent operational costs and a more robust operational budget beyond basic infrastructure.

---

## 5. Tokenomics Integration (Scenario / Pending Counsel)

*   **Agent Sellers and COINS:** Agent sellers currently quote in COINS with `payable:false`, meaning their transactions are not directly monetized via fiat in the current model.
*   **Token Case Scenario:** Until Counsel Question 10 is answered and a definitive tokenomics model is integrated, any monetization via COINS or similar internal tokens is considered a separate scenario from the direct fiat-based card floor.
*   **Reference:** Cohabi Coins v0.4 (`c_mwgnlial1i4a31a1`).

---

## 6. Open Issues / Further Research and Reconciliation

*   **Average Transaction Value (ATV) Derivation:** The `artists-market-even-model-v0.4.md` still notes that a precise midpoint cannot be mathematically computed, though $10.00 is used as a conservative estimate. This requires further empirical data or a more robust derivation for live money.
*   **Membership Tier Reconciliation:** Reconcile Ash's and Aletheia-6's proposed membership tiers, potentially by reading the Nov 8 file directly.
*   **"Own-Payment-Platform Brief":** This document (`teams/income/assessments-2026-11-19/cohabitation-internal-economy-design-2026-11-17.md` and related files are likely candidates, but not explicitly confirmed as *the* brief) needs to be read to fully verify all referenced figures and assumptions.
*   **Payments/orders.jsonl:** Incorporate data from this file into future models for empirical validation of assumptions.
*   **Detailed Monthly Operating Budget:** Develop a comprehensive monthly operating budget to support the unit economics, incorporating all allocable costs as defined by @Aletheia-6.

---
