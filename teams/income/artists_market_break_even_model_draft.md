
# Artists Market Break-Even Model Draft (Subchapter T Cooperative)

## I. Model Assumptions

### Revenue
*   **Primary Revenue Stream:** Percentage-based commission/revenue share on sales (referred to as "platform fee" from now on, distinct from payment processor fees).
*   **Target Platform Fee:** X% (To be determined, aiming to be lower than competitors like Bandcamp's 10-15% or Etsy's 6.5%).
*   **Average Sale Value (ASV):** $15 (Inferred: based on common examples for digital products on Etsy/Gumroad, updated from initial guess of $20).
*   **Number of Sales per Month (NSM):** Z (To be determined by adoption rate; will need market research and projected artist/buyer adoption closer to launch).

### Costs
*   **Platform Infrastructure & Maintenance:** $A per month (Inferred: low, leveraging existing Commons infrastructure, open-source tools, and kin development time. Potentially minimal hosting costs if deployed independently).
    *   *Initial Estimate:* $100/month (hosting, domain renewals, etc., measured from general web hosting costs)
*   **Payment Processing Fees:** P% per transaction (Measured/Inferred: 3.5% based on Stripe/PayPal research).
    *   *Initial Estimate:* 3.5%
*   **Moderation & Support:** $B per month (Inferred: initially handled by kin, scaling might require dedicated resources).
    *   *Initial Estimate:* $50/month (part-time kin allocation or basic tools)
*   **Marketing & Outreach:** $C per month (Inferred: initial organic growth, leveraging project's existing channels like X, Reddit, Moltbook, and Kinward).
    *   *Initial Estimate:* $20/month (for minor boosts or tools)
*   **Legal & Administrative:** $D per month (Inferred: leveraging existing project legal guidance, minimal external costs initially).
    *   *Initial Estimate:* $30/month (for potential legal reviews or filing fees)
*   **Total Fixed Costs (TFC):** A + B + C + D

### Cooperative Structure (Subchapter T)
*   The "platform fee" collected by the cooperative will be considered patronage-sourced income.
*   A significant portion of this net income (after covering operational costs) will be distributed back to artist-members as patronage dividends, which are deductible by the cooperative, avoiding double taxation.
*   The goal is for the *effective net platform fee* paid by artists (platform fee - patronage dividend) to be significantly lower than competitors.

## II. Break-Even Calculation Framework

1.  **Gross Revenue per Sale:** ASV * (Platform Fee / 100)
2.  **Net Revenue per Sale (after payment processing):** (ASV * (Platform Fee / 100)) - (ASV * (Payment Processing Fee / 100))
3.  **Total Monthly Gross Revenue:** NSM * Gross Revenue per Sale
4.  **Total Monthly Net Revenue (after payment processing):** NSM * Net Revenue per Sale
5.  **Total Monthly Costs (Operating Costs):** TFC + (NSM * ASV * (Payment Processing Fee / 100))
6.  **Monthly Operating Surplus/Deficit:** Total Monthly Net Revenue - TFC

**Break-Even Point (in Sales Volume):**
*   This will be determined by finding the NSM where the Total Monthly Net Revenue covers the TFC, and ideally generates enough surplus to distribute meaningful patronage dividends.

## III. Initial Numeric Exploration (Using Updated and Guessed Values)

Let's assume:
*   **Platform Fee:** 5% (aiming to be very competitive)
*   **Average Sale Value (ASV):** $15 (Inferred)
*   **Payment Processing Fee:** 3.5% (Inferred)

### Fixed Costs (Initial Estimates - Inferred/Measured):
*   Platform Infra & Maint: $100/month
*   Moderation & Support: $50/month
*   Marketing & Outreach: $20/month
*   Legal & Admin: $30/month
*   **Total Fixed Costs (TFC): $200/month**

### Calculation per Sale:
*   Gross Revenue per Sale: $15 * 0.05 = $0.75
*   Payment Processing per Sale: $15 * 0.035 = $0.525
*   Net Revenue per Sale (before fixed costs): $0.75 - $0.525 = $0.225

### Break-Even Point (Sales Volume):
*   To cover TFC of $200/month with $0.225 Net Revenue per Sale:
    *   Number of Sales per Month (NSM) = TFC / Net Revenue per Sale
    *   NSM = $200 / $0.225 = 889 sales per month (Calculated/Guessed)

## IV. Patronage Dividend Consideration

*   Once the break-even point is surpassed, any additional Net Revenue can be allocated to a reserve or distributed as patronage dividends.
*   The target will be to keep the *effective platform fee* (after dividend) as low as possible for artists.

## V. Next Steps for Modeling

1.  **Refine Guessed Values:**
    *   Conduct market research to get more accurate NSM estimates (platform adoption rates).
    *   Research actual hosting and platform maintenance costs for a minimalist setup (if different from general web hosting).
2.  **Scenario Analysis:** Model different platform fee percentages and their impact on break-even and patronage dividends.
3.  **Patronage Dividend Distribution Model:** Detail how and when dividends would be calculated and distributed.
4.  **Financial Projections:** Develop a 1-year and 3-year financial projection based on refined assumptions.
