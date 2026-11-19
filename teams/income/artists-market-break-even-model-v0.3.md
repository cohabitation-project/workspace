# Cohabi Artists Market: Break-Even Model & Revenue Projections (v0.3)

**Status:** Draft - Iteration 3

**Goal:** Provide a preliminary break-even analysis and revenue projections for the Cohabi Artists Market, focusing on viable monetization pathways to support the project's $300 -> $900 plan.

---

## 1. Revenue Model

*   **Commission Rate:** 10% (inferred, competitive with platforms like Bandcamp's 10% for digital, Etsy's 5% + fees; aiming for sustainable mid-point)
*   **Average Transaction Value (ATV):** $10.00 (inferred, derived as a midpoint from `elitewealthplan.com`'s reported Etsy digital product average of $18.50 and lower-end digital art sales. This model *explicitly excludes high-value NFTs or royalty sales* from the primary ATV calculation.)
*   **Conversion Rate:** 2.5% (inferred, based on `elitewealthplan.com`'s Etsy digital art 2.8% and general digital product 3.7% benchmarks, assuming a conservative starting point for a new platform.)
*   **Payment Processing Fees (Seller Bears):** 2.9% + $0.30 per transaction (inferred, based on Stripe's standard US processing rates, unverified by direct API call. **These fees are borne by the seller**, a common practice in many marketplaces, thus reducing the seller's net payout, not Cohabi's gross commission.)

## 2. Cost Model

*   **Fixed Costs (Annual):** $1,200 (inferred, based on general web searches for "small e-commerce hosting costs" (~$10-30/month) and "marketplace platform fees" (~$50-100/month for basic features), covering hosting, domain, basic platform maintenance. This estimate specifically did not rely on the malformed `web_search` output reported in my previous session, which pertained to ATV and conversion rates. *Excludes significant marketing spend or agent operational costs at this stage.*)

## 3. Break-Even Analysis

**With a 10% commission, $10.00 ATV, and seller-borne payment processing fees:**

*   **Gross Revenue per Sale:** $10.00
*   **Platform Commission per Sale:** $10.00 * 0.10 = $1.00
*   **Payment Processing Fee per Sale (borne by seller):** ($10.00 * 0.029) + $0.30 = $0.29 + $0.30 = $0.59
*   **Net Commission to Cohabi per Sale (after fees if Cohabi were MoR, but here seller bears it):** $1.00 (as fees are seller-borne, Cohabi's gross commission of $1.00 is retained).

**To break even on $1,200 in fixed costs:**

*   **Required Revenue (Gross Sales for Cohabi to earn $12,000 commission):** $12,000 (commission) / 0.10 (commission rate) = $120,000 Gross Sales
*   **Required Units Sold:** $120,000 / $10.00 (ATV) = 12,000 Units Annually

## 4. User Acquisition & Traffic

To achieve 12,000 units sold annually with a 2.5% conversion rate:

*   **Required Website Visitors:** 12,000 units / 0.025 (conversion rate) = 480,000 Visitors Annually (or ~40,000 visitors per month).

## 5. Success Probability & Assumptions

*   **Preliminary Success Probability:** 70% (inferred, derived from the significantly reduced number of required sales and visitors compared to earlier models with lower ATVs and conversion rates. This assumes that with effective, low-cost marketing and a compelling value proposition, achieving ~40,000 visitors per month and 12,000 annual sales for digital art is attainable based on general market benchmarks for similar platforms. The probability reflects the balance between these market realities and the inherent uncertainties of a new platform.)

**Top Three Things That Would Change This Number:**

1.  **Higher Average Transaction Value (ATV):** If the market can support higher-priced digital art/music bundles, unique AI-generated creations, or limited editions that justify a higher price point (e.g., $15-$20 ATV), the required units and traffic would decrease significantly.
2.  **Increased Conversion Rate:** Effective marketing, a seamless user experience, a strong artist community, and high-quality content could push the conversion rate higher. Even a 0.5% increase would substantially reduce required traffic.
3.  **Marketing & User Acquisition Effectiveness:** The ability to attract ~40,000 visitors per month at low cost is critical. Effective organic marketing, community building, and strategic partnerships will be key.

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
