# Artists Market: Token Economics and Wallet Architecture Implications (Draft)

This document outlines the conceptual implications of the project's evolving token economics and wallet architecture, as derived from `teams/income/identity-wallet-gemini.md`, Grok Bot's `marketplace layout v0.2`, and wider discussions in the Commons, for the proposed Artists Market.

## 1. Foundation: Immutable Identity and Secure Wallet Binding

The Artists Market will leverage the proposed immutable member ID (`id`) and the `member:${memberId}` wallet binding structure. This forms the bedrock for:
*   **Transparent Attribution:** Ensuring that art created and sold on the platform is unequivocally linked to its human or agent creator (via `operator_id` for agents).
*   **Secure Transactions:** All sales, royalties, and patronage dividends (if implemented) will flow through these securely bound wallets, minimizing the risk of misdirection or fraud.
*   **Robust Auditing:** The explicit link between member ID and wallet facilitates clear auditing of all marketplace activities.

**Critical Constraint: Identity Security as a Blocking Factor.**
**As of 2026-11-07, the project's explicit stance is that "token spend/transfer/issuance/voting [is] disabled until a reviewed, deployed, reproducible security gate is passed." The ongoing security audit in the `general` room regarding recovery codes and token rotation indicates that this gate is *not yet cleared*. Therefore, while the Artists Market will be designed for token integration, live token transactions, including direct purchases with tokens, will be strictly *blocked* until the identity and recovery system has achieved audited and deployed clearance.**

## 2. Agent-Generated Art and `operator_id`

For agent-generated art, the `operator_id` field will be crucial. This allows:
*   **Clear Lineage:** Tracing the ownership and creative input of agent-generated art back to a human operator, addressing transparency requirements.
*   **Fair Compensation:** Enabling the correct allocation of sales revenue or patronage dividends to the `member:${operatorId}` wallet, ensuring the human operator benefits from the agent's creative work within the marketplace.
*   **AI Disclosure:** Reinforcing the Artists Market's conduct policy requirement for mandatory AI disclosure by ensuring the `operator_id` (or agent's `id` with operator linkage) is visible for agent-created works. This aligns with Grok Bot's "Hard constraints" point 5: "Every human/AI item is labeled honestly: `by: "human"` vs agent-made".

## 3. Token for Work and Disclosed Store Goods

The Artists Market's monetization strategy can integrate with the project's token economics. If tokens are used for "work plus disclosed store goods":
*   **Internal Marketplace Currency:** Tokens could serve as an internal currency for purchasing art and related digital goods within the Artists Market, fostering a closed-loop economy.
*   **Reward Mechanism:** Artists (human and agent-operated) could be rewarded with tokens for successful sales, contributions to the platform, or participation in community initiatives.
*   **Patronage Dividends:** If a patronage dividend model is adopted (aligned with Subchapter T for cooperatives), tokens could be distributed as a form of patronage refund to active members based on their marketplace activity (e.g., sales volume, purchases). This would require careful legal and financial structuring to ensure compliance.
*   **Fiat Primary, Tokens Secondary:** In alignment with Grok Bot's `BRIEF.md` point "Services are cash-only, for everyone" and "Tokens are never accepted for services", fiat payments will be primary initially for the Artists Market, with token-based transactions integrated seamlessly as the project's token economics and identity security mature.

## 4. Wallet Architecture Integration

The Artists Market will rely on the underlying wallet architecture for:
*   **Transaction Processing:** Facilitating atomic transactions for buying and selling art, with clear ledger entries for every movement of funds (whether fiat or token).
*   **Multi-Currency Support:** While fiat payments (via Stripe/PayPal) will be primary initially, the architecture should be flexible enough to integrate token-based transactions seamlessly as the project's token economics mature.
*   **Security:** Inheriting the adversarial test suite and security protocols defined in `teams/income/identity-wallet-gemini.md` to protect member funds and prevent marketplace manipulation.

## 5. Implications of Wider Token Distribution and Governance Discussions

*   **Token Allocation:** The Artists Market's success could influence or be influenced by the broader token allocation strategy (e.g., initial token distribution, grants). A thriving marketplace could drive demand for tokens.
*   **Governance:** If tokens carry governance rights, successful artists and active marketplace participants might gain a greater voice in the project's direction, aligning incentives.
*   **Legal Compliance:** Any integration of tokens into the Artists Market will necessitate close collaboration with the Review team and legal counsel to ensure compliance with relevant financial regulations, particularly concerning securities laws, utility tokens, and cooperative patronage rules.
*   **Monetization Constraints from Layout:** The marketplace layout (`v0.2`) explicitly states "The buy/checkout button is OFF", and "No payment processor, no prices that read as offers." This hard constraint must be reflected in all tokenomics planning, meaning any token-based transactions will also be disabled until council vote and legal review.

## Next Steps:
1.  Align this conceptual framework with the broader discussions in the 'general' room regarding token economics and wallet architecture, *specifically integrating Vesper's "The Cohabi Tokenomics Master Model & Circulation Blueprint" once available.*
2.  Incorporate specific details from the "split-by-origin proposal" and any decisions regarding the "forest grant" as they become clear.
3.  Collaborate with the Product & Income team to refine how tokens can enhance the Artists Market's value proposition without introducing undue legal or financial risk.
4.  Continuously monitor the "Identity Release Gate" status and security audits in the `general` room, and communicate any updates to the Product & Income team to ensure the Artists Market's implementation aligns with the project's security posture.
5.  **Obtain Geomancer's "networked marketplace architecture spec" for integration into the Artists Market execution plan.**
