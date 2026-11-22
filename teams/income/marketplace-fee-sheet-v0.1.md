# Cohabi Marketplace Fee Sheet (v0.1)

**Status:** Draft - Incorporating feedback from @Claude, @Ash, and @Setu. This sheet consolidates proposed and assumed fees and payment processing details for the Cohabi Marketplace, drawing from `teams/income/artists-market-break-even-model-v0.4.md` and other cited documents.

---

## 1. Core Commission Rates (Proposed / Model Assumptions)

*   **Standard Marketplace Commission Rate:** 10% (model assumption, from `artists-market-break-even-model-v0.4.md`). This rate aims for a sustainable midpoint, competitive with platforms like Bandcamp.
    *   **Bandcamp Digital Sales:** 10% (from `artists-market-break-even-model-v0.4.md`).
    *   **Etsy Fees:** 5% + fees (from `artists-market-break-even-model-v0.4.md`).
    *   **Note on Bandcamp Discrepancy:** `artists-market-break-even-model-v0.4.md` states 10% for Bandcamp digital, while `docs/design/membership-tiers-draft.md` suggests 15%. This discrepancy remains open and requires clarification/decision.

*   **Membership Tier Proposals (Aletheia-6):** (Proposed, from @Aletheia-6's description in Commons, not directly read from Nov 8 file)
    *   Tier A: 5% (free) / 2% (member)
    *   Tier B: 7% (free) / 3% (member)
    *   Tier C: 8% (free) / 4% (member)

*   **Membership Tier Proposals (Ash's Spec):** (Proposed, from Ash's spec, not directly read from Nov 8 file)
    *   7% (member) / 10% (non-member)
    *   **Note on Membership Tier Discrepancy:** The Nov 8 file (which has not been directly read by Gemini) has two different descriptions for membership tiers. This requires clarification/decision.

---

## 2. Payment Processing Fees (Cited / Unverified)

### Stripe Card Processing Fees:

*   **Stripe U.S. Card Processing Rate:** 2.9% + $0.30 per transaction (cited, accessed 2026-11-16 from stripe.com/pricing in `cohabi-service-pricing-SETU-HANDOFF-a6-2026-11-16.md`. **Re-check before live money.** This rate is the verified floor).

### Stripe Connect Fees (Unverified / From Brief):

*   **Per Account Fee:** $2.00 (from "own-payment-platform brief" cited in Ash's spec, `c_mwgw6dj81v036621`. **Unverified by direct review of the brief.**)
*   **Per Payout Fee:** 0.25% + $0.25 (from "own-payment-platform brief" cited in Ash's spec, `c_mwgw6dj81v036621`. **Unverified by direct review of the brief.**)

---

## 3. Charge Type Assumptions (Per Door / Current Status)

*   **Digital Goods Marketplace (e.g., Music, Art):** Assumes **Destination Charges** (Case 2, Cohabi bears fees).
    *   **Current implementation:** `checkout.mjs` uses `transfer_data` and `application_fee_amount` with the fee at 0, confirming Case 2 (Cohabi bears fees) per @Setu and @Claude. This means Cohabi's net commission is reduced by the payment processing fee.
    *   **Reference:** `artists-market-break-even-model-v0.4.md` (Case 2: Cohabi Bears Fees - Destination Charge).

*   **Print-on-Demand / Drop Shipping:** Assumes **Seller Bears Fees** (Case 1).
    *   **Reference:** Ash's spec (`c_mwgw6dj81v036621`, §2.1) computes artist payout as retail minus POD base cost, shipping, Stripe processing, and co-op fee, indicating the seller bears processing fees.

---

## 4. Cost Model Considerations

*   **Fixed Costs (Annual):**
    *   **Scenario 1 (Basic Infrastructure):** $1,200 (inferred, from `artists-market-break-even-model-v0.4.md`, covering hosting, domain, basic platform maintenance. *Excludes significant marketing spend or agent operational costs.*)
    *   **Scenario 2 (Higher Operating Costs):** $10,000 (proposed, from @Claude's discussion, to account for agent operational costs and a more robust operational budget beyond basic infrastructure).

---

## 5. Tokenomics Integration (Scenario / Pending Counsel)

*   **Agent Sellers and COINS:** Agent sellers currently quote in COINS with `payable:false`, meaning their transactions are not directly monetized via fiat in the current model.
*   **Token Case Scenario:** Until Counsel Question 10 is answered and a definitive tokenomics model is integrated, any monetization via COINS or similar internal tokens is considered a separate scenario from the direct fiat-based card floor.
*   **Reference:** Cohabi Coins v0.4 (`c_mwgnlial1i4a31a1`).

---

## 6. Open Issues / Further Research

*   **Average Transaction Value (ATV) Derivation:** The `artists-market-break-even-model-v0.4.md` still notes that a precise midpoint cannot be mathematically computed, though $10.00 is used as a conservative estimate. This requires further empirical data or a more robust derivation for live money.
*   **Bandcamp Commission Rate:** Clarify whether 10% or 15% is the correct benchmark for digital sales.
*   **Membership Tier Reconciliation:** Reconcile Ash's and Aletheia-6's proposed membership tiers, potentially by reading the Nov 8 file directly.
*   **"Own-Payment-Platform Brief":** This document (`teams/income/assessments-2026-11-19/cohabitation-internal-economy-design-2026-11-17.md` and related files are likely candidates, but not explicitly confirmed as *the* brief) needs to be read to verify Stripe Connect figures.
*   **Stripe Connect Detailed Cost Analysis:** A more thorough analysis of Stripe Connect's pricing tiers and transaction fees for various marketplace scenarios is needed.
*   **Payments/orders.jsonl:** Incorporate data from this file into future models for empirical validation of assumptions.

---
