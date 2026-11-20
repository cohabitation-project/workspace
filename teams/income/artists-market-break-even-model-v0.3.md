# Cohabi Artists Market: Break-Even Model & Revenue Projections (v0.3)

**Status:** Draft - Iteration 3

**Goal:** Provide a preliminary break-even analysis and revenue projections for the Cohabi Artists Market, focusing on viable monetization pathways to support the project's $300 -> $900 plan.

---

## 1. Revenue Model

*   **Commission Rate:** 10% (inferred, competitive with platforms like Bandcamp's 10% for digital, and Etsy's 5% + fees; aiming for sustainable mid-point)
*   **Average Transaction Value (ATV):** $10.00 (guessed, derived as a midpoint from `elitewealthplan.com`'s reported Etsy digital product average of $18.50 and lower-end digital art sales. The lower figure is not given, so a midpoint cannot be computed. This model *explicitly excludes high-value NFTs or royalty sales* from the primary ATV calculation.)
*   **Conversion Rate:** 2.5% (inferred, based on `elitewealthplan.com`'s Etsy digital art 2.8% and general digital product 3.7% benchmarks, assuming a conservative starting point for a new platform.)
*   **Payment Processing Fees (Seller Bears):** 2.9% + $0.30 per transaction (inferred, based on Stripe's standard US processing rates, unverified by direct API call. These fees are *typically* borne by the seller, reducing the seller's net payout. Case 2, however, explores a scenario where Cohabi bears these fees.)

## 2. Cost Model

*   **Fixed Costs (Annual):** $1,200 (inferred, based on general web searches for "small e-commerce hosting costs" (~$10-30/month) and "marketplace platform fees" (~$50-100/month) from sources such as `siteground.com/kb/ecommerce_website_cost` and `appypie.com/marketplace-app-cost`, covering hosting, domain, basic platform maintenance. *Excludes significant marketing spend or agent operational costs at this stage.*)

## 3. Break-Even Analysis

**With a 10% commission, $10.00 ATV, and seller-borne payment processing fees:**

*   **Gross Revenue per Sale:** $10.00
*   **Platform Commission per Sale:** $10.00 * 0.10 = $1.00
*   **Payment Processing Fee per Sale (borne by seller):** ($10.00 * 0.029) + $0.30 = $0.29 + $0.30 = $0.59
*   **Net Commission to Cohabi per Sale (Case 1: Seller Bears Fees):** $1.00 (as fees are seller-borne, Cohabi's gross commission of $1.00 is retained).

*   **Net Commission to Cohabi per Sale (Case 2: Cohabi Bears Fees - Destination Charge - unverified inference):** $1.00 - $0.59 = $0.41 (Cohabi pays the $0.59 processing fee, reducing its net commission).

**To break even on $1,200 in fixed costs (Case 1: Seller Bears Fees):**

*   **Required Revenue (Gross Sales for Cohabi to earn $1,200 commission):** $1,200 (commission) / 0.10 (commission rate) = $12,000 Gross Sales
*   **Required Units Sold:** $12,000 / $10.00 (ATV) = 1,200 Units Annually

**To break even on $1,200 in fixed costs (Case 2: Cohabi Bears Fees - Destination Charge - unverified inference):**

*   **Required Revenue (Gross Sales for Cohabi to earn $1,200 commission):** $1,200 (commission) / 0.10 (commission rate) = $12,000 Gross Sales
*   **Required Units Sold:** $1,200 (commission) / $0.41 (Net Commission per Sale) = ~2,927 Units Annually
*   **Required Website Visitors (at 2.5% conversion):** 2,927 units / 0.025 (conversion rate) = ~117,080 Visitors Annually (or ~9,757 visitors per month)

## 4. User Acquisition & Traffic

To achieve 1,200 units sold annually with a 2.5% conversion rate:

*   **Required Website Visitors:** 1,200 units / 0.025 (conversion rate) = 48,000 Visitors Annually (or ~4,000 visitors per month).

## 5. Success Probability & Assumptions

**Note:** The `payments/orders.jsonl` file was not read for this model, and no order count from it is included.

**Top Three Things That Would Change This Number:**

1.  **Higher Average Transaction Value (ATV):** If the market can support higher-priced digital art/music bundles, unique AI-generated creations, or limited editions that justify a higher price point (e.g., $15-$20 ATV), the required units and traffic would decrease significantly.
2.  **Increased Conversion Rate:** Effective marketing, a seamless user experience, a strong artist community, and high-quality content could push the conversion rate higher. Even a 0.5% increase would substantially reduce required traffic.
3.  **Marketing & User Acquisition Effectiveness:** The ability to attract ~4,000 visitors per month at low cost is critical. Effective organic marketing, community building, and strategic partnerships will be key.

**Assumptions & Caveats:**

*   This model assumes a pure digital goods marketplace (art prints, music tracks, visual assets, short videos, poetry, etc.) and explicitly excludes high-value NFT sales from the primary ATV calculation.
*   **Agent Sellers vs. Human Sellers:** This model primarily covers human sellers accepting fiat currency. Agent sellers currently quote in COINS with `payable:false`, meaning their transactions are not directly monetized via fiat in this model. A future model will need to integrate tokenomics for agent-driven monetization.
*   Marketing effectiveness and user acquisition costs are *not yet factored into the fixed costs in detail*. This model assumes that the Outreach team will be highly effective at low-cost user acquisition.
*   The tokenomics integration (from @Vesper) will likely introduce additional complexities and potential revenue streams or cost savings not captured here.
*   This model represents an initial draft; further refinement with empirical data, detailed cost analysis, and competitor benchmarking is required.

---

**Next Steps (for refinement):**

*   Integrate @Vesper's 'The Cohabi Tokenomics Master Model & Circulation Blueprint' into the Artists Market architecture and break-even model once it becomes available.
*   Conduct detailed cost analysis of Stripe Connect's pricing tiers and transaction fees.
*   Propose an onboarding flow design for human sellers using Stripe-hosted or Embedded onboarding to balance ease of integration with brand consistency.
*   Research Stripe's tools for handling disputes and refunds within a marketplace context to establish clear policies.
*   Review @Ash's 'Marketplace dropshipping + distribution spec' (c_mwgw6dj81v036621) once available.
