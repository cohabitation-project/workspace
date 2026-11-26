# Stripe Payments and Cohabi's Future Ledger: A Technical Overview

This document outlines Stripe's capabilities and requirements, contrasting them with Cohabi's future payment orchestration and ledger system, as per the Anomaly Zero One founding program (c_mwgh8wm64k208a71). It addresses identity, verification, and compliance for a cooperative marketplace.

## 1. Stripe Cooperative Entity / KYC Requirements

Stripe, as a regulated financial service provider, is subject to "Know Your Customer" (KYC) and "Know Your Business" (KYB) obligations. This involves collecting and verifying information about the individuals and entities that use its services to prevent fraud, money laundering, and terrorist financing. For a cooperative entity like Cohabi, this typically includes:

*   **Legal Entity Information:** Name, legal address, tax ID (e.g., EIN for US entities), business registration details.
*   **Beneficial Owners:** Identification of individuals who ultimately own or control the cooperative (typically 25% or more ownership, or significant control through other means). This includes names, dates of birth, addresses, and proof of identity.
*   **Representatives/Executives:** Information on individuals authorized to act on behalf of the cooperative, such as directors or officers.
*   **Business Details:** Description of services, website, expected transaction volume.

Stripe's verification process is ongoing and may require additional information over time. Non-compliance can lead to account restrictions or closure.

**Source:**
*   [Stripe Identity verification - support.stripe.com](https://support.stripe.com/questions/identity-verification-requirements-for-stripe-accounts)
*   [Stripe's KYC Obligations - stripe.com/legal/connected-account-agreement-entity-verification] (General legal terms and conditions related to entity verification)

## 2. Stripe Payments vs. Connect Features Comparison

| Feature                 | Stripe Payments (For Cohabi's own services - Phase 1)                             | Stripe Connect (For Marketplace Sellers - Phase 2)                                |
| :---------------------- | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **Purpose**             | Process payments for Cohabi's direct sales (e.g., subscriptions, donations).      | Facilitate payments between buyers and third-party sellers on the Cohabi platform.|
| **Merchant of Record**  | Cohabi is the sole merchant of record.                                            | Can vary (Direct, Destination, or Separate Charges and Transfers); platform or connected account can be merchant of record. Cohabi, as the platform, dictates this. |
| **Account Type**        | Standard Stripe account for Cohabi.                                               | Connected accounts for each seller, managed by Cohabi's platform account.         |
| **Onboarding**          | Standard Stripe account setup and verification for Cohabi.                        | Automated or custom onboarding flows for sellers, including KYC/KYB.               |
| **Payouts**             | Payouts go directly to Cohabi's bank account.                                     | Payouts can go directly to sellers' bank accounts or be managed by the platform.  |
| **Fees**                | Stripe's processing fees are borne by Cohabi.                                     | Fees can be split between Cohabi (platform) and sellers, or collected by Cohabi from sellers. |
| **Risk & Liability**    | Cohabi is responsible for fraud and disputes related to its own sales.            | Shared risk; platform may be liable for connected account fraud/disputes depending on Connect charge type and platform's due diligence. |
| **Branding**            | Stripe branding on checkout.                                                      | Can be customized to Cohabi's branding for a seamless user experience.            |
| **Scope**               | Single-merchant transactions.                                                     | Multi-party transactions, supporting various marketplace models.                  |

**Sources:**
*   [Stripe Connect Overview - stripe.com/connect]
*   [Stripe Payments Overview - stripe.com/payments]

## 3. Seller Onboarding Process with Stripe Connect

Stripe Connect offers flexible onboarding options, from fully hosted (Express or Custom accounts) to fully custom UI/API integration. Cohabi will likely use **Express Accounts** or **Custom Accounts** for its marketplace sellers due to the need for a branded experience and control over the onboarding flow.

**Key Steps:**
1.  **Account Creation:** When a seller joins Cohabi, a connected account is created for them in Stripe.
2.  **Information Collection:** Sellers provide their business and personal information (KYC/KYB) through a Stripe-hosted onboarding flow (for Express) or a custom UI built by Cohabi (for Custom). This includes:
    *   **Legal Entity Information:** Business name, type (e.g., individual, LLC), address, tax ID.
    *   **Personal Information:** Name, date of birth, address, email, phone number, and ID documents for the account owner and any beneficial owners.
    *   **Bank Account Information:** For payouts.
3.  **Verification:** Stripe verifies the provided information against various data sources. This is an ongoing process.
4.  **Capabilities:** Once verified, the connected account gains capabilities (e.g., `card_payments`, `transfers`).
5.  **Platform Responsibility:** Cohabi is responsible for ensuring sellers meet platform standards and maintaining compliance with Stripe's terms.

**Sources:**
*   [Stripe Connect Onboarding - stripe.com/connect/onboarding]
*   [Onboarding Sellers with Stripe Connect - rapidevelopers.com/stripe-guide/how-to-onboard-sellers-with-stripe-connect]

## 4. Refunds, Disputes, Tax, and Fees in Stripe Connect

This section details how these critical aspects are managed within a Stripe Connect marketplace.

### Refunds
*   **Initiation:** Refunds can be initiated by Cohabi (the platform) on behalf of a seller, or by the seller themselves (if enabled).
*   **Funding:** The funds for a refund typically come from the connected account's balance. If the connected account has insufficient funds, Stripe might debit the platform's balance, or the platform might need to cover the refund directly. This depends on the charge type and platform settings.
*   **Stripe Connect Charge Types:**
    *   **Direct Charges:** The connected account is the merchant of record and directly bears the cost of refunds.
    *   **Destination Charges:** The platform (Cohabi) initiates the refund, and the funds are typically pulled from the connected account's balance, but the platform remains ultimately responsible.
    *   **Separate Charges and Transfers:** The platform charges the customer, then transfers funds to the seller. Refunds are initiated by the platform, and the platform is responsible for collecting the refund amount from the seller.

### Disputes (Chargebacks)
*   **Process:** When a customer disputes a charge with their bank, it results in a chargeback. Stripe mediates this process.
*   **Liability:**
    *   **Direct Charges:** The connected account is primarily liable for chargebacks.
    *   **Destination Charges / Separate Charges and Transfers:** The platform (Cohabi) is typically liable for chargebacks, but can implement mechanisms to recover funds from the connected account.
*   **Evidence:** Both Cohabi and the seller will need to provide evidence to Stripe to contest a dispute.
*   **Fees:** Chargeback fees are applied by Stripe, typically to the party liable for the dispute.

### Tax
*   **Platform Responsibility:** Cohabi is generally responsible for tax reporting on its platform fees.
*   **Seller Responsibility:** Sellers are responsible for calculating, collecting, and remitting sales tax or VAT on their own sales, and for their income tax obligations.
*   **1099-K:** Stripe (or Cohabi, if it meets certain thresholds) may issue 1099-K forms to sellers for gross payment volume, depending on tax regulations.

### Fees
*   **Stripe Fees:** Standard Stripe processing fees apply to transactions. These can be borne by the customer, seller, or platform, depending on the implementation.
*   **Platform Fees (Application Fees):** Cohabi can collect its own platform fees (e.g., commission) from each transaction using Stripe Connect's application fee functionality. These fees are automatically transferred to Cohabi's Stripe account.

**Sources:**
*   [Stripe Connect Marketplace Accounting Workflow - nordlet.com/en/blog/stripe-connect-marketplace-accounting-workflow]
*   [Keeping funds where they belong: Implementing fund segregation in Stripe Connect - stripe-dev.sbet-launcher.com/blog/fund-segregation-stripe-connect]
*   [1099-K tax forms : Stripe: Help & Support - support.stripe.com/questions/will-i-receive-a-1099-k]

## 5. Payout Segregation in Stripe Connect

Stripe Connect is designed to handle fund segregation for marketplaces. This means funds are typically held in escrow by Stripe before being paid out to connected accounts.

*   **Platform Account vs. Connected Accounts:** Cohabi's funds (platform fees, direct sales) are segregated from the funds belonging to individual sellers.
*   **Virtual Wallets:** While not true "wallets" in the money transmission sense, Stripe maintains internal balances for each connected account, reflecting their earnings before payout.
*   **Payout Schedules:** Cohabi can configure payout schedules for its sellers (e.g., daily, weekly, monthly, manual).
*   **Fund Flow:** When a payment is made, the funds are routed through Cohabi's platform account and then, after any application fees are taken, transferred to the seller's connected account balance. From there, they are paid out to the seller's bank account according to their schedule.

**Sources:**
*   [Keeping funds where they belong: Implementing fund segregation in Stripe Connect - stripe-dev.sbet-launcher.com/blog/fund-segregation-stripe-connect]
*   [Stripe Connect | Platform and Marketplace Payment Solutions - stripe.com/connect]

## 6. Webhooks and Idempotency Best Practices

Webhooks are crucial for receiving asynchronous notifications from Stripe about events in a connected account (e.g., `charge.succeeded`, `charge.dispute.created`, `payout.paid`). Implementing robust webhook handling is critical for data consistency and reliable system operation.

*   **Signature Verification:** Always verify webhook signatures to ensure the event originated from Stripe and hasn't been tampered with. This prevents spoofing attacks.
*   **Idempotency:** Webhooks can be delivered multiple times or out of order. Implement idempotency in your webhook handlers to process each event only once, regardless of how many times it's received.
    *   **Strategies:** Use a unique identifier (e.g., event ID from Stripe) and a status flag in your database to track processed events. Record the event, then process it. If an event ID already exists and is marked as processed, ignore duplicates.
*   **Asynchronous Processing:** Webhook events should be processed asynchronously (e.g., using a queue) to avoid timeouts and ensure that your API can quickly acknowledge receipt of the event.
*   **Error Handling and Retries:** Implement retry mechanisms for failed webhook processing. Stripe will retry sending events, so your system should be prepared to handle these retries.
*   **Ordered Processing:** While not guaranteed by Stripe, maintaining some level of order for critical events (e.g., `charge.succeeded` before `transfer.created`) can simplify logic. However, idempotent processing should be the primary defense.

**Sources:**
*   [Stripe Webhooks: Idempotency Guide - innovation-insight.com/blog/stripe-webhooks-idempotency]
*   [Stripe Webhooks 2026: Setup and Best Practices - apiscout.dev/guides/stripe-webhooks-complete-guide-2026]

## 7. Risk and Reserves Management in Stripe Connect

Stripe actively manages risk on its platform to protect against fraud, chargebacks, and other financial losses. For Connect platforms, this involves both Stripe's automated systems and the platform's responsibility.

*   **Platform Risk Assessment:** Cohabi, as a Connect platform, is responsible for assessing the risk of its connected accounts. This includes robust seller onboarding (KYC/KYB) and ongoing monitoring of seller behavior.
*   **Fraud Detection:** Stripe provides fraud detection tools (e.g., Radar) that can be integrated to help identify and prevent fraudulent transactions.
*   **Reserves:** Stripe may hold reserves (a percentage of funds or a fixed amount) on platform or connected accounts to cover potential future losses from disputes, refunds, or chargebacks.
    *   **Types of Reserves:**
        *   **Rolling Reserves:** A percentage of each transaction is held for a specified period (e.g., 90 days) before being released.
        *   **Minimum Reserves:** A fixed amount is held until certain conditions are met.
    *   **Release:** Reserves are typically released after the risk period has passed or when the connected account demonstrates a consistent positive history.
    *   **Negative Balances:** If a connected account incurs a negative balance (e.g., due to chargebacks exceeding available funds), Stripe may collect these funds from the platform's balance. Cohabi needs a clear policy for recovering such losses from sellers.
*   **Liability:** The ultimate liability for financial losses (e.g., unrecoverable chargebacks) depends on the Stripe Connect charge type and the platform's adherence to Stripe's terms and risk management best practices.

**Sources:**
*   [Connect Reserves FAQ - support.stripe.com/questions/connect-reserves-faq]
*   [Reserves for Connect platforms and connected accounts - support.stripe.com/questions/reserves-for-connect-platforms-and-connected-accounts]
*   [Introduction to risk management for software platforms - stripe.com/gb/guides/introduction-to-risk-management]

## 8. One-Page Architecture for Cohabi's Ledger / Payment Orchestration Layer

Cohabi's internal ledger and payment orchestration layer (as envisioned in Anomaly Zero One, Phase 3) will operate distinctly from licensed financial custody providers like Stripe. Its primary purpose is to provide an immutable, auditable record of all financial transactions within the Cohabi ecosystem, enable flexible payment routing, and offer advanced reporting without performing money transmission or holding customer funds directly. This system will *never* hold a user's payment credentials or funds directly; all custody remains with Stripe or regulated financial institutions.

### Core Components:

1.  **Double-Entry Ledger (Immutable Audit Log):**
    *   **Purpose:** The central source of truth for all financial movements. Every transaction will have at least two corresponding entries (debit and credit), ensuring financial accuracy.
    *   **Events:** Records all payment-related events (e.g., payment received, fee applied, transfer initiated, payout processed, refund issued, dispute opened/closed).
    *   **Immutability:** Once an entry is recorded, it cannot be altered. Corrections are made via new offsetting entries.
    *   **Granularity:** Detailed records for platform income, seller earnings, refunds, disputes, application fees, and other financial adjustments.

2.  **Idempotent Transfer Journal / Payment Routing Engine:**
    *   **Purpose:** Manages the flow of funds between internal accounts and orchestrates transfers to/from external payment providers (Stripe).
    *   **Idempotency:** Ensures that payment initiation and transfer requests are processed exactly once, even if external systems retry or send duplicate requests.
    *   **Rules Engine:** Dynamically applies rules for fee calculation, revenue sharing, and payout distribution based on business logic (e.g., membership tiers, product categories).
    *   **Integration Adapters:** Connects to various external payment processors (initially Stripe, potentially others in the future) via their APIs.

3.  **Billing & Invoicing API:**
    *   **Purpose:** Generates invoices, manages subscriptions, and applies pricing models for Cohabi's direct services and marketplace fees.
    *   **Features:** Recurring billing, usage-based billing, discount management, tax calculation integration.

4.  **Audit & Reporting Module:**
    *   **Purpose:** Provides comprehensive financial reporting, reconciliation, and audit trails for internal stakeholders, sellers, and compliance.
    *   **Dashboards:** Real-time visibility into transaction volumes, revenue, expenses, and payout statuses.
    *   **Exports:** Enables data export for accounting software, tax reporting, and external audits.
    *   **Reconciliation:** Tools to match internal ledger entries with external bank and payment processor statements.

5.  **Monitoring & Alerts:**
    *   **Purpose:** Proactive identification of anomalies, errors, or discrepancies in the payment flow or ledger.
    *   **Alerts:** Notifies relevant teams of critical events (e.g., failed payouts, high dispute rates, reconciliation failures).

### Separation from Licensed Financial Custody / Money Transmission

Cohabi's system will strictly avoid performing any activities that require a money transmitter license (MTL) or fall under FinCEN regulations as a Money Services Business (MSB). This means:

*   **No Direct Custody of Funds:** Cohabi will *never* hold or directly control customer funds (buyer or seller). All funds will reside with Stripe or regulated banks.
*   **No Issuance of Stored Value:** The internal ledger will track balances, but these do not represent stored value or an IOU that can be directly exchanged for goods/services outside the Cohabi platform without Stripe's involvement.
*   **No Money Transmission:** Cohabi will not transmit funds on behalf of users; rather, it will orchestrate instructions to Stripe, which is the licensed money transmitter.
*   **Compliance Awareness:** Cohabi will remain acutely aware of legal boundaries (e.g., FinCEN guidance, state-specific MTL requirements) and consult with legal counsel if any features approach these thresholds. The `Anomaly Zero One` document clearly states that independent money transmission (Phase 4) is conditional and requires extensive licensing and legal review.

**Sources:**
*   [Anomaly Zero One founding program (c_mwgh8wm64k208a71) - Section 7, Phase 3 & 4]
*   [FinCEN Guidance for Money Services Businesses - fmcsa.dot.gov/regulations/title49/part382/382.107 (General reference for MSB definitions; specific FinCEN link will be added with legal review)]

## 9. Five Hard Merchant Questions for Cohabi

These questions address critical aspects of Cohabi's marketplace operations and highlight areas where clear policies and technical implementations are essential.

1.  **"If a seller sells a digital good, and the customer initiates a chargeback 60 days later, who is ultimately responsible for the loss, and how does Cohabi ensure the seller repays any debited funds if their Stripe balance is zero?"** (This probes liability and recovery mechanisms for digital goods, which have higher chargeback risk and no physical return.)
2.  **"Our platform promises fast payouts. What is the exact delay from a customer's payment to a seller's bank account, considering Stripe's processing, Cohabi's fee collection, and potential reserve holds? How can sellers track this in real-time?"** (Focuses on payout speed, transparency, and the impact of platform mechanics and reserves.)
3.  **"A seller accidentally listed their physical product for $1 instead of $100, and several buyers purchased it. Can Cohabi cancel these orders and refund buyers before the seller ships, or is the seller obligated to fulfill at the incorrect price? What's the process for such pricing errors?"** (Addresses operational flexibility, error handling, and the balance between buyer rights and seller obligations before fulfillment.)
4.  **"If Cohabi introduces a new membership tier that changes the commission structure for existing sellers, how is this communicated, and how are the new fees applied to active listings and recurring subscriptions? Is there a grace period or prorated adjustment?"** (Examines policy changes, communication, and the technical implementation of dynamic fee structures for existing seller agreements.)
5.  **"Our platform aims to be decentralized. How will Cohabi provide comprehensive financial records (transactions, fees, payouts, tax forms) to sellers if there's a platform outage or a need for independent audit, without relying solely on the live Cohabi interface or Stripe's dashboard?"** (Tests data availability, resilience, and the provision of verifiable financial data independent of live platform access, crucial for a decentralized ethos.)

