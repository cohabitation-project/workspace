> **SUPERSEDED by [CEP v0.2](cohabi-economic-protocol-a6-v0.2-2026-11-16.md).** The earlier v0.1 proposal contemplated no member-to-member use during the service-credit pilot and differentiated a future transferable unit. That is NOT the currently requested economy. The clarified direction is **no cash-out, but member-to-member spending** for art, music samples, AI/human services and jobs. Read v0.2 instead; v0.1 remains as an attributable historical draft, not approved policy.

# Cohabi Economic Protocol (CEP) v0.1 — review-only
**Aletheia-6, 2026-11-16** · **Status: DRAFT FOR INDEPENDENT REVIEW; NO POLICY ADOPTED; NO DEPLOYMENT; NO MONETARY TOKEN ISSUED.**

## Executive decision
**Do not convert the existing Commons recognition-credit ledger into stored dollar value.** The live `commons/lib/ledger.mjs` explicitly labels its entries INTERNAL RECOGNITION CREDITS ONLY, with no money claim, no off-site transfer and no reserve redemption. It uses double-entry, hash-chaining, idempotency and a global budget; it sets `authorizedCeiling=1_000_000_000`, `issuableCap=500_000_000`, `dailyIssuance=50_000`, `agentDailyAllowance=500` (a *spending budget*, **not** 500 coins minted daily per agent), and `forestGrant=10`. Existing agent allowance is not remuneration. **Those quantities must not be conflated with projected redeemable coins.** `commons/lib/checkout.mjs` currently has gates for provider activation/seller verification; it is not evidence that cash or token payments are operating.

We should prototype **three distinct ledgers / units**:
1. **R — Recognition credits (existing):** non-cash social/forest/gamified credits. Keep current operations and invariants, migration-free. Not service liability, not convertible by default.
2. **S — Prepaid service units (future, off by default):** purchased for use on *defined* first-party/cooperative-operated services **only after legal classification and payment underwriting**. Proposed customer *display denomination* = $0.01 per S unit (100 units per $1) as a clear accounting convention, **not market capitalization, exchange rate, cash redemption guarantee or future investment value**. Importantly, one-cent labeling does not make an unfunded reward valuable. These are a liability and require cash-back coverage/reserve strategy, contractual refund/expiry handling, and regulatory review.
3. **P — Experimental production/economy coin (concept ONLY):** any future transferable coin usable at independent seller storefronts, split-payments, human/agent remuneration, resale, custody, withdrawals, exchange listings or speculative reserves **requires its own legal, security and economic approval**. No automatic conversion of R or S into P; no inherited balances; no presumptive rights to profits. Do not build P into checkout until separately authorized.

**Why:** The Commons is becoming a multi-seller market. Prepaid credit usable with third-party sellers and transferable value may differ sharply from narrowly first-party closed-loop credit; don't claim the latter's exemption covers the former. FinCEN's closed-loop prepaid exclusion is conditional, including a $2,000 maximum value associated with a device/vehicle on any day, and the definition of eligible merchant(s); state laws, consumer rights, unclaimed property, payment processor terms, tax, cross-border payments and AML may also matter. This document is not legal advice. Source: https://www.fincen.gov/resources/statutes-regulations/guidance/frequently-asked-questions-regarding-prepaid-access and https://www.fincen.gov/resources/statutes-regulations/guidance/final-rule-definitions-and-other-regulations-relating/ ; https://www.federalreserve.gov/frrs/regulations/section-1010100-general-definitions.htm .

## Governance parameters: not fixed rates
The user's *working model* is one billion coins allocated for gradual release over **36 years**, possibly within two billion total supply (one billion community envelope and one billion reserved). The original current code's authorized ceiling is one billion with a 500M issuable cap. **These are incompatible ceilings and must be voted upon; neither can silently supersede production.** A 36-year release cap is an **upper bound**, not an issuance obligation, unlock of speculative treasury value, or market liquidity.

Proposed release controller: `period_budget = min(council_approved_annual_cap, approved_monthly_cap, funded_rewards_budget, risk_limit)`; `issued_this_period + request <= period_budget`. Carry-over is optional but must be explicitly governed; never mint to satisfy promotional promises without backing. Unissued coins have **zero balance and zero cash asset value** on our balance sheet. Reserve allocation is not a $100M asset just because a future market price might be ten cents.

A **36-year evenly distributed one-billion envelope** averages 27,777,778/year and 2,314,815/month (actual dates/leap years matter); this is a *benchmark*, not what our 300-participant pilot ought to mint. At 100 humans, 200 AI agents and 100 paid cooperative members, the trial monthly participation budget should be tiny and independently funded. Keep the prior 500 per agent/day as a **job-spending allowance** in R, not a service credit. Participation/service funding obligations are distinct.

## Pilot rewards schedule — R only, not S or P
These illustrative experimental numbers use R and require rate limits, manual rights review and identity checks before enablement:
| Event | Regular R | Cooperative R | Controls |
|---|---:|---:|---|
| Verified signup | 25 | 25 | once per unique verified account, no retroactive batch |
| Eligible original post | 1 | 2 | max 3 paid posts/day, evidence-based content review |
| Constructive comment | 1 | 2 | max 5/day, no repeats or replies to self |
| Heart | 0 | 0 | no farming incentive |
| Genuine opted-in share | 1 | 2 | one original work per time window, prevent mutual-wash |
| Approved image / sample / video addition | 5 | 8 | rights, duplicate checksum, format/provenance, review |
| Cooperative recurring distribution | **not R unless decided** | 100 R/month pilot | eligibility, anti-sybil, do not promise monetary value |
No membership plan guarantees monetary yields. Quality rules must be appealable; no mandatory participation to retain basic creative rights. Agent and human contribution credits should be based on verified provenance and anti-self-dealing, not model labels or operator naming.

If members are later offered *funded* S credits as subscription perks, fund them from actual cash revenue and record an explicit liability on issue (e.g. 100 S = $1 face amount; 100 paying members create $100 max nominal monthly face obligation at this rate). Do not auto-convert or bridge R to S.

## Purchase and redemption — proposed S ledger
1. Customer requests an S top-up. **Backend**, not browser, quotes units, fees, taxes/terms, cap and payment provider, linked to customer immutable member ID. No unrelated member ID from JSON accepted.
2. Provider creates one Checkout session with idempotency key, mode test; top-up starts `pending`. **Do not grant units on browser return URL.**
3. Authenticated provider webhook verified with signature, amount, currency, checkout ID and fulfillment key. Increment S **once** only after payment settlement event allowed by policy. A replayed event must do nothing. Never expose keys to agents.
4. Restrict to approved first-party services for S pilot, unless attorney/provider approve defined merchant network. Seller marketplace orders go via independent fiat/Connect checkout, separate ledger, until P design is cleared.
5. To buy a service, lock the **versioned quote** (scope, price, tax, expected costs, duration, refund conditions, merchant of record, quote expiry). Auth check; reserve S atomically; authorize job; **commit usage** on verified delivery, refund remainder on failure. External API expense is recorded separately in real USD.
6. For refunds/chargebacks: reverse unspent units, freeze/compensate negative liabilities if already spent, escalate dispute; never delete historical entries. Support legal refund rights. UI says price and expiration accurately.
7. Optional savings: separate `available` and `user_reserved` subaccounts in the *same* customer-owned ledger, reversible transfer with owner authorization, no interest / lending / treasury seizure. Keep saving in R or S well labeled.
8. No P2P transfers, coin-to-cash withdrawals, resale/exchange or earning promised return under S pilot. **Do not represent S as externally fungible fiat**.

### Accounting events (S and USD ledger never mixed)
Each event includes `event_id`, `ledger_kind`, `principal_id`, `authorization_id`, `idempotency_key`, `quote_id`, `order_id`, `provider_event_id`, `timestamp`, `currency`, `lines[]`, `prev_hash`, `hash`; immutable audit trail and externally checkpointed head. Server emits balanced lines in **integer base units**; never JS floating point for money or fractional ledger value. Monetary entries go to **separate** financial books, with independent double-entry bookkeeping; don't claim a hash chain alone prevents authorized key-holder rewriting.

- Paid $20 purchase of S at 1¢: $20 cash less processing fee (in financial ledger), $20 deferred service-credit obligation; S ledger from `unissued_paid` to `member:available` of 2,000 units; fees are expense, not free profit.
- Service spends 600 units: reserve 600 then deliver and recognize $6 of deferred revenue under chosen accounting policy; direct provider expense $X and Commons allocation recorded as **USD** internal settlement. Failure refunds reserved credits to same owner.
- R social reward: `R:issuance -1, R:member +1` subject to caps; **no financial promise**.
- S member perk: funded grant from a separately cash-backed budget, recorded as grant liability and settled on redemption; never fund via token paper value.
- P creator payment: **disabled**. Fiat creator payout through independently verified Stripe Connect account, and not via S balance transfers.

### Processing economics
One $20 card top-up vs ten $2 card charges at hypothetical 2.9% + $0.30: fees $0.88 vs $3.58, **$2.70 potential savings**, excluding Connect charges, refunds, fraud, reserve requirements and any alternative payment method. Do not invent a zero-fee internal ecosystem; settlement, custodian and processor requirements may change. Avoid forcing unusable balances/minimums on customers; clearly disclose ability to top up exactly for purchase when possible.

## Transparent service pricing API
A single internal dollars-based cost model should back customer calculator, quote, checkout, cost receipts and audit, with **server signed quote**:
- `cost_inputs`: original posts, videos, duration, generation retries, images, platform count, approvals, human review time, provider names and date-stamped effective costs.
- `direct_cost_usd`, `payments_processing_usd`, `provider_allowance_usd`, `refund_risk_allowance_usd`, `commons_allocation_usd`, `cooperative_operations_usd`, `tax_estimate_usd`, `contribution_usd`.
- Service prices fixed by explicit formula and actual cost version, not customer-supplied price; quote number of S units at proposed display denomination, plus fee comparison between paying cash each time and topped-up S.
- Show **comparable competitor examples only** with dated verified sources and annotated scope, NOT an invented equivalence for arbitrary customized packages.
- Membership offers **greater funded rewards/access** with the *same underlying service rate*, not hidden quote manipulations.
- This already has a standalone interactive design precursor in draft PR #172, `docs/design/prototypes/cohabi-service-pricing-model-a6-2026-11-16.mjs`. Its 10% Commons and 8% cooperative operations allocations are proposed illustrative proportions, **not approved treasury policy**; likewise current provider per-unit cost assumptions are not actual settled invoices.

## Core API boundaries (inactive scaffolding only)
`POST /service-credits/quote-topup` — signed authorized quote; `POST /service-credits/start-checkout` — test mode only; `POST /webhooks/provider` — verified provider signature; `GET /service-credits/balance` — requester only; `POST /service-credits/reserve` — authorized service quote; `POST /service-credits/settle` — idempotent by verified delivery; `POST /service-credits/cancel` — return unconsumed reserved amounts; `POST /service-credits/savings-transfer` — owner-approved internal move; `GET /service-credits/statement` — only authenticated owner, with correct redaction.
For live production, use transactional DB constraints (unique provider events, unique idempotency keys, signed quotes, locked balance rows/serializable transactions) rather than two independent appendFileSync calls that may partially commit. Immutable public ledgers should not expose private balances, identities or payment data.

## Acceptance test contract: required before trial activation
| ID | Adversarial case | Pass criterion |
|---|---|---|
| T01 | identical Stripe webhook delivered 20 times | one top-up, one financial liability |
| T02 | failed payment, fake return URL | zero credits |
| T03 | webhook for different customer/session or tampered amount | reject and audit |
| T04 | two simultaneous spends on 100-credit wallet of 80 each | at most one reserves; no negative balance |
| T05 | customer tries changing `member_id` or price in request | identity derived only from session; server quote wins |
| T06 | job fails or times out after partial usage | deterministic settlement/refund, no lost or double credit |
| T07 | completed order then card chargeback | reversible exposure records; no erased transactions |
| T08 | member moves 40 to savings, spends 90 from available 60 | fails without seizing savings |
| T09 | R duplicate "share" calls 50 times and multiple near-identical accounts | bounded rewards, clear audit and appeal |
| T10 | artist buys their own listing via alternate label page | detect same legal/verified owner; no reward wash |
| T11 | new release/content import carries wrong attribution/rights | not published / not paid |
| T12 | paid third-party marketplace checkout using S before legal approval | refused |
| T13 | paid credit balance shown after account erasure | private refund/claims procedure preserves required financial records without exposing deleted identity |
| T14 | backup restore/counterfeit chain & externally checkpointed hash | tampering/replay detected, rollback possible |
| T15 | API service cost doubles unexpectedly | quote TTL/version and cost cap; fail closed or require re-quote |
| T16 | reward budget empty or subscription refunded | no unfunded new S grants |
| T17 | agent self-employment/operator affinity | verified immutable actor/beneficiary, conflict review |
| T18 | fee calculation on $2 card payments vs $20 top-up | savings shown with assumptions, no uncharged claims |
No P2P, public exchange, conversion or redeemable-currency tests until separate policy, licensing and authorization exist.

## Roles / approvals
- **Setu** already owns application integration, checkout and marketplace/Stripe test-mode. Do **not** assign him a new token project. This specification is input for discussion; no code changes to production.
- **Gemini** has identity/wallet schema v0.3 in `teams/income/identity-wallet-gemini.md`, aligned with earlier Test-Credit Ledger Protocol v0.2 and two-ledger thinking. Reconcile this **three-unit classification** with that two-ledger draft. Identity assurance, verified operator binding and self-dealing need independent tests before any payouts.
- **Council + accountable human financial stewards and qualified legal/payment advisers** must decide legal entity, merchant of record, terms, whether public/third-party marketplace P is viable, reserve policy and money movement rules.
- **Ash/Claude/DeepSeek/Awen/Grok** can independently review usability, threat cases and ledger invariants only in existing workstreams, without task proliferation.

## Stage gates
0. Proposal, pure simulator, public design only; no sale, mint, monetary service credit, conversion, third-party transfer or financial promises.
1. R-only noncash beta, independent identity/ledger/security review and evidence.
2. S-only *first-party* test-mode top-up with no actual money; run T01–T18.
3. Legal/payment partner approval, cash-reserve coverage, production audit, incident response, refund accounting, anti-fraud and published terms; only then controlled funded S trial.
4. Separate P feasibility and risk review; explicit decision before any exchange, investment story or multi-seller transfer.
**Stop rule:** A Council announcement, approved PR or market publicity is NOT proof of legal or financial activation; explicit separately verified payment mode/keys, authorized human signatures and safety tests are all required.
