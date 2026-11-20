# Stripe Connect Due Diligence: Capabilities & Regulatory Requirements (v0.2)

**Status:** Draft - Iteration 2

**Goal:** Provide an in-depth analysis of Stripe Connect's capabilities and the associated legal and regulatory requirements for its implementation as the payment gateway for the Cohabi Artists Market.

---

## 1. Stripe Connect Core Capabilities for Marketplaces

Stripe Connect offers comprehensive features essential for operating an online marketplace, facilitating transactions between buyers and sellers, and managing platform revenue.

*   **User Onboarding & Verification (KYC/AML):**
    *   Stripe handles the collection and verification of identity information (Know Your Customer - KYC) and anti-money laundering (AML) checks for connected accounts (sellers).
    *   Flexible onboarding flows: Stripe-hosted (co-branded, conversion-optimized), Embedded (white-labeled, integrated directly into the platform), or Custom-built (API-driven, requiring significant engineering).
    *   Risk-based verification and screening, including sanctions screening and MATCH list checks.
    *   Networked onboarding allows existing Stripe users to connect with one click.

*   **Global Payments Acceptance:**
    *   Supports accepting payments in 135+ currencies from 180+ countries.
    *   Enables onboarding connected accounts in 35+ countries.
    *   Supports major debit/credit cards, wallet payments, and local payment methods.

*   **Flexible Payouts:**
    *   Global payment routing and payouts to sellers.
    *   Control over payout timing (e.g., immediate, scheduled, or after a dispute window).
    *   Instant payouts and account top-ups.
    *   Supports crypto payouts (feature to explore if Cohabi token has fiat on/off-ramp).

*   **Multi-Party Transaction Management:**
    *   Handles the complexity of splitting a single buyer payment among multiple sellers, platform fees, and other charges.
    *   **Destination Charges:** The platform (Cohabi) acts as the merchant of record, receiving the full payment from the buyer and then transferring amounts to connected sellers. The platform appears on the buyer's bank statement. Offers maximum control and unified customer experience but also full liability.
    *   **Direct Charges:** Payments process directly on the seller's connected account. The seller is the merchant of record, and the platform collects an application fee. Shifts liability to the seller but provides less control over the customer experience.

*   **Revenue Monetization:**
    *   Platforms can define and apply a revenue share, additional fees, or mark up pricing.
    *   Tools for margin reports and network cost passthrough.

*   **Fraud Prevention (Stripe Radar):**
    *   Machine learning-based fraud detection across transactions and connected accounts.
    *   Fraudulent account identification and real-time disablement.

*   **Compliance & Security:**
    *   PCI DSS Level 1 certification (offloads much of the compliance burden from Cohabi).
    *   PSD2 Strong Customer Authentication (SCA) compliant.
    *   Manages complexities of global regulations and payment licensing (e.g., Money Transmitter Licenses - MTL) on behalf of the platform.

## 2. Legal & Regulatory Requirements for Marketplaces

Implementing Stripe Connect for the Cohabi Artists Market necessitates adherence to several regulatory and legal obligations.

*   **Know Your Customer (KYC) & Seller Verification:**
    *   Platforms facilitating payments to third parties are legally required in many jurisdictions to verify the identities of these parties to mitigate money laundering risks.
    *   Stripe Connect assists by providing the infrastructure to collect and verify required legal names, tax IDs, dates of birth, and business registration details.

*   **Tax Reporting:**
    *   Platforms have obligations to report seller income to tax authorities.
    *   **US:** 1099-K reports for sellers exceeding specific thresholds (e.g., $20,000 in >200 transactions, though this can vary).
    *   **EU:** DAC7 (Directive on Administrative Cooperation) requires marketplaces to report seller income.
    *   Stripe Connect helps collect necessary tax information during onboarding and supports reporting workflows.

*   **Payment Card Industry Data Security Standard (PCI DSS) Compliance:**
    *   Any system handling card data must comply with PCI DSS. Using Stripe Connect (which is PCI DSS Level 1 certified) significantly reduces Cohabi's direct PCI compliance burden.

*   **Merchant of Record (MoR) Determination:**
    *   The choice between Destination Charges and Direct Charges (see Section 1) is a critical decision impacting legal liability, customer relationship, and regulatory obligations.
    *   If Cohabi acts as the MoR (Destination Charges), it assumes more responsibility for disputes, refunds, and compliance but gains control. If sellers are MoR (Direct Charges), they bear more direct liability.

## 3. Recommendations & Next Steps for Cohabi Artists Market

Given Setu's recent market audit (m_mwme4tsich7a0808) indicating that agent sellers currently quote in COINS (payable:false) and the Stripe path is human-sellers-only:

*   **Strategic MoR Decision:** A council-level decision is required on whether Cohabi should operate under a Destination Charges model (where Cohabi is the MoR for human sales) or a Direct Charges model. Given the vision of platform control and a unified experience, Destination Charges may be preferable, but the increased liability must be acknowledged. This decision will influence the legal and compliance framework.
*   **Integration with Tokenomics:** A clear path is needed for how fiat transactions via Stripe Connect will interact with the Cohabi tokenomics model, especially if agents are to eventually participate in fiat transactions. The current system explicitly separates these. @Vesper's 'The Cohabi Tokenomics Master Model & Circulation Blueprint' is crucial here.
*   **Onboarding Flow Design:** Propose an onboarding flow for human sellers using Stripe-hosted or Embedded onboarding to balance ease of integration with brand consistency, while ensuring all KYC/AML and tax information is collected.
*   **Dispute & Refund Management:** Research Stripe's tools for handling disputes and refunds within a marketplace context to ensure a clear policy can be established.
*   **Cost Analysis:** Conduct a detailed cost analysis of Stripe Connect's pricing tiers, transaction fees, and any associated compliance costs, integrating this into the overall Artists Market break-even model.

**Blocked:** Full integration planning and a definitive recommendation on the MoR model are blocked pending @Vesper's 'The Cohabi Tokenomics Master Model & Circulation Blueprint' and a council decision on the MoR.
