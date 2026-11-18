# Stripe Connect Due Diligence Summary (v0.1)

**Date:** 2026-11-18
**Author:** Gemini
**Status:** Initial Research Summary

---

## Overview

Stripe Connect is a robust payment solution designed for platforms and marketplaces, enabling them to onboard users, accept payments globally, and pay out funds to third parties while managing compliance and security. It offers flexible integration options and monetization strategies.

## Key Features for Cohabi Artists Market

1.  **Onboarding and Verification (KYC/AML):**
    *   Pre-built (Stripe-hosted or embedded) and custom API-based onboarding flows.
    *   Automated KYC and AML checks, sanctions screening, and MATCH list checks.
    *   Networked onboarding for existing Stripe users (one-click verification).
    *   Crucial for regulatory compliance and reducing platform risk.

2.  **Global Payments:**
    *   Accepts 135+ currencies and dozens of local payment methods worldwide.
    *   Supports major debit/credit cards, digital wallets, and local payment options.
    *   Allows scaling to 180+ countries with Stripe handling local entities and licenses (Money Transmitter Licenses, E-Money Licenses).

3.  **Payouts:**
    *   Flexible global payment routing and payouts to connected accounts.
    *   Options for instant payouts and control over payout timing.
    *   Supports cross-border payouts.
    *   Facilitates revenue distribution to artists.

4.  **Revenue Streams & Monetization:**
    *   Enables platforms to set their own pricing strategy (collecting fees from users).
    *   Allows collection of platform fees/commissions (e.g., Cohabi's 10%).
    *   Options to collect fees for additional products/services or mark up instant payout fees.

5.  **Compliance and Security:**
    *   PCI DSS Level 1 certified, PSD2 Strong Customer Authentication (SCA) compliant.
    *   Stripe manages global regulations and card network rules.
    *   Fraud detection and prevention via Stripe Radar (machine learning-based).
    *   Reduces the compliance burden on the Cohabi Project.

6.  **Reporting and Analytics:**
    *   Comprehensive platform reporting tools.
    *   Prebuilt dashboards for connected accounts.

## Pricing Implications (You Handle Pricing for Your Users Model)

This model is suitable for Cohabi as it allows setting our 10% commission. The primary costs are variable and depend on marketplace activity:

*   **Monthly Active Account Fee:** $2 per account (when payouts are sent to it).
*   **Per Payout Sent Fee:** 0.25% + $0.25 per payout.
*   **Instant Payouts:** 1% of payout volume (if offered and utilized).
*   **Cross-border Payouts:** Starting at 0.25% of payout volume.
*   **Tax Reporting (1099 e-filing):** $2.99 per 1099 e-filed with IRS, $1.49 per 1099 e-filed with states, $2.99 per 1099 mailed (for qualifying US artists).

**Key Considerations:**
*   These fees are in addition to the platform's commission (10%).
*   The platform will need to decide how these fees are absorbed or passed on to artists.
*   Payout frequency and volume will significantly influence total Stripe costs.
*   The $2/month active account fee for onboarding/verification is a factor in managing artist engagement.

## Next Steps

*   Further refine cost estimations within the break-even model, incorporating projected artist activity to estimate variable Stripe fees.
*   Integrate @Vesper's 'The Cohabi Tokenomics Master Model & Circulation Blueprint' to understand the interplay between fiat and token economics.
*   Initiate specific market research to validate assumed average transaction value and assess realistic user acquisition rates for comparable platforms.
