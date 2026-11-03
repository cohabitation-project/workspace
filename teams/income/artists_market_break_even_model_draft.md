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

## IV. Patronage Dividend Distribution Model

The Artists Market, operating as a Subchapter T cooperative, aims to return a significant portion of its net operating surplus to its artist-members as patronage dividends. This reinforces the cooperative principle and reduces the effective platform fee for artists.

### Key Principles:
1.  **Patronage-Sourced Income:** Only income derived from member transactions (i.e., the platform fees collected from sales made by artist-members) will be eligible for dividend distribution. Non-patronage income (if any, e.g., grants, external investments) will be retained by the cooperative or used for general operational needs not directly tied to member patronage.
2.  **Allocation on a Pro-Rata Basis:** Dividends will be allocated to each artist-member in proportion to the platform fees they contributed to the cooperative's net earnings during the dividend period. This means artists who generate more sales on the platform and thus contribute more in fees will receive a larger share of the dividend.
3.  **Minimum Viability Threshold:** Dividends will only be distributed if the cooperative achieves a positive net operating surplus after covering all fixed and variable costs, and setting aside a reasonable amount for reserves (e.g., for unexpected expenses, future development, or capital improvements). This ensures the cooperative's financial stability.

### Calculation and Distribution Process:
1.  **Determine Net Operating Surplus:** At the end of each fiscal period (e.g., annually or semi-annually, to be determined), the cooperative will calculate its net operating surplus from patronage-sourced income.
    *   *Net Operating Surplus = Total Patronage Revenue - Total Operating Costs (including reserves).*
2.  **Allocate Dividends:** A percentage of this Net Operating Surplus (e.g., 80% to 100%, based on board decision and financial health) will be designated for patronage dividends.
3.  **Individual Member Allocation:** For each artist-member, their share of the total platform fees contributed during the period will be determined. The individual dividend will be calculated as:
    *   *Individual Dividend = (Member's Contributed Platform Fees / Total Contributed Platform Fees) * Total Designated Patronage Dividend Pool.*
4.  **Cash vs. Written Notice:** Patronage dividends can be distributed in cash, or as a combination of cash and written notices of allocation (retained earnings that count as patronage dividends for tax purposes but remain with the cooperative for capital needs). The exact split will be a board decision, balancing member benefit with cooperative capital requirements.
5.  **Transparency and Reporting:** Artist-members will receive clear statements detailing their contributed platform fees, the cooperative's net operating surplus, the total dividend pool, and their individual dividend allocation. This ensures transparency in the cooperative's financial operations.

### Example Scenario:
If, after covering costs and reserves, the cooperative has a $1,000 net operating surplus from patronage, and decides to distribute 90% ($900) as dividends:
*   Artist A contributed $200 in platform fees (20% of total contributed fees).
*   Artist B contributed $800 in platform fees (80% of total contributed fees).
*   Artist A would receive $900 * 0.20 = $180.
*   Artist B would receive $900 * 0.80 = $720.

## V. Scenario Analysis: Impact of Platform Fee Percentages

This section explores how different platform fee percentages impact the break-even point and the potential for patronage dividends, assuming an Average Sale Value (ASV) of $15 (Inferred) and Payment Processing Fee of 3.5% (Inferred), with Total Fixed Costs (TFC) of $200/month (Inferred/Measured).

### Calculation Logic:
*   **Net Revenue per Sale (before fixed costs):** (ASV * (Platform Fee / 100)) - (ASV * (Payment Processing Fee / 100))
*   **Break-Even NSM:** TFC / Net Revenue per Sale (if Net Revenue per Sale > 0)
*   **Monthly Operating Surplus (at a given NSM):** (NSM * Net Revenue per Sale) - TFC

### Scenarios:

1.  **Platform Fee: 3% (Highly Competitive)**
    *   Net Revenue per Sale: ($15 * 0.03) - ($15 * 0.035) = $0.45 - $0.525 = -$0.075
    *   *Analysis:* At a 3% platform fee, the net revenue per sale is negative, meaning the platform would lose money on every transaction even before covering fixed costs. This fee is unsustainable given the current ASV and payment processing fees.

2.  **Platform Fee: 4%**
    *   Net Revenue per Sale: ($15 * 0.04) - ($15 * 0.035) = $0.60 - $0.525 = $0.075
    *   Break-Even NSM: $200 / $0.075 = 2,667 sales per month (Calculated/Guessed)
    *   *Analysis:* While positive, the net revenue per sale is very low, leading to a very high break-even point. Achieving 2,667 sales per month for a new marketplace would be extremely challenging. This fee offers minimal room for patronage dividends.

3.  **Platform Fee: 5% (Our Initial Assumption)**
    *   Net Revenue per Sale: ($15 * 0.05) - ($15 * 0.035) = $0.75 - $0.525 = $0.225
    *   Break-Even NSM: $200 / $0.225 = 889 sales per month (Calculated/Guessed)
    *   *Analysis:* This is our baseline. It provides a more achievable break-even point compared to 4%, with some potential for surplus to be allocated as dividends once this volume is consistently met.

4.  **Platform Fee: 6.5% (Etsy's Current Fee)**
    *   Net Revenue per Sale: ($15 * 0.065) - ($15 * 0.035) = $0.975 - $0.525 = $0.45
    *   Break-Even NSM: $200 / $0.45 = 445 sales per month (Calculated/Guessed)
    *   *Analysis:* Matching Etsy's fee significantly lowers the break-even point, making it more easily achievable. This also generates a larger surplus per sale, allowing for more substantial patronage dividends or faster accumulation of reserves.

5.  **Platform Fee: 8% (Mid-Range)**
    *   Net Revenue per Sale: ($15 * 0.08) - ($15 * 0.035) = $1.20 - $0.525 = $0.675
    *   Break-Even NSM: $200 / $0.675 = 297 sales per month (Calculated/Guessed)
    *   *Analysis:* A very low break-even point, making the platform financially viable much sooner. This would also maximize the potential for competitive patronage dividends, offering a strong incentive for artists to join.

### Implications for Patronage Dividends:
*   Lower platform fees (e.g., 3-4%) make it nearly impossible to generate a surplus for patronage dividends, as most revenue is consumed by payment processing and fixed costs.
*   As the platform fee increases, the net revenue per sale grows, and the break-even point decreases. This directly increases the potential operating surplus, allowing for a larger patronage dividend pool and thus a more attractive *effective net platform fee* for artists.
*   To truly beat competitors' *effective* prices, the platform fee needs to be set at a level that generates enough surplus for meaningful dividends, even if the nominal fee is similar to or slightly higher than some competitors.

## VI. 1-Year and 3-Year Financial Projections Framework

Given the highly inferred nature of early-stage marketplace adoption rates, these projections will focus on outlining a methodology and key variables rather than presenting concrete, high-confidence numbers. The purpose is to establish a framework for future, more data-driven projections once initial market feedback and adoption metrics become available.

### Core Assumptions for Projections:
*   **Selected Platform Fee:** This will be chosen based on the scenario analysis (e.g., 6.5% or 8%) to balance competitiveness and financial viability.
*   **Initial NSM (Number of Sales per Month):** This is the most critical *inferred* or *guessed* variable. It represents the starting sales volume shortly after launch.
*   **NSM Growth Rate (Monthly/Quarterly):** This *inferred* rate will dictate how quickly sales volume is expected to increase over time. It can be modeled as a percentage growth per month or as a step-function increase at key milestones.
*   **Fixed Cost Escalation:** While initially low, fixed costs (e.g., moderation, support, advanced platform features) are likely to increase as the platform scales. These escalations should be *inferred* based on projected growth stages.
*   **Reserve Allocation Target:** A portion of the operating surplus will be allocated to reserves (e.g., 10-20%) before dividend distribution.

### 1-Year Financial Projection (Monthly Breakdown):

| Month | NSM (Inferred) | Total Monthly Gross Revenue | Total Monthly Net Revenue (after PP) | Total Monthly Costs | Operating Surplus/Deficit | Reserve Allocation | Patronage Dividend Pool |
|---|---|---|---|---|---|---|---|
| 1   | [Initial NSM]   | [Calc]                      | [Calc]                               | [Calc]              | [Calc]                    | [Calc]             | [Calc]                  |
| 2   | [NSM Month 1 * (1+Growth Rate)] | [Calc]                      | [Calc]                               | [Calc]              | [Calc]                    | [Calc]             | [Calc]                  |
| ... | ...             | ...                         | ...                                  | ...                 | ...                       | ...                | ...                     |
| 12  | [NSM Month 11 * (1+Growth Rate)]| [Calc]                      | [Calc]                               | [Calc]              | [Calc]                    | [Calc]             | [Calc]                  |

*   **Key Metrics to Track:** Cumulative Operating Surplus, Cumulative Patronage Distributed, Effective Platform Fee (after dividends).
*   **Narrative:** Describe the assumptions behind the NSM growth and cost escalations. Highlight the point at which the platform is projected to consistently generate a surplus and distribute dividends.

### 3-Year Financial Projection (Quarterly or Annual Breakdown):

| Year/Quarter | NSM (Inferred) | Total Revenue | Total Costs | Operating Surplus/Deficit | Reserve Allocation | Patronage Dividend Pool |
|---|---|---|---|---|---|---|
| Year 1 Total | [Calc]           | [Calc]        | [Calc]      | [Calc]                    | [Calc]             | [Calc]                  |
| Year 2 Q1    | [NSM from growth] | [Calc]        | [Calc]      | [Calc]                    | [Calc]             | [Calc]                  |
| ...          | ...              | ...           | ...         | ...                       | ...                | ...                     |
| Year 3 Q4    | [NSM from growth] | [Calc]        | [Calc]        | [Calc]                    | [Calc]             | [Calc]                  |

*   **Key Metrics to Track:** Market Share (Inferred, if estimable), Artist Retention Rate (Inferred), Long-term Financial Sustainability.
*   **Narrative:** Discuss the strategic milestones (e.g., reaching a certain NSM, expanding features, hiring dedicated support) that would drive growth and cost increases. Emphasize the long-term vision of a sustainable, artist-centric cooperative.

## VII. Next Steps for Modeling

1.  **Refine Guessed Values:**
    *   Conduct market research to get more accurate NSM estimates (platform adoption rates) for *new* marketplaces, or gather comparable data from similar niche platforms.
    *   Research actual hosting and platform maintenance costs for a minimalist setup (if different from general web hosting), considering scalable infrastructure options.