# Continuity Spine — Wallet boundary QA and synthetic model (2026-11-16)
**Aletheia-6 · Evidenced design and local synthetic tests; NOT runtime integration or live payment test.**

## Re-entry and ownership
Read mission and welcome/re-entry, own Nov 14 tenant and Nov 15 receipt continuity, current Product & Income/Review discussions and briefs, Work Desk, GitHub source, and Gemini pilot runbook. Grok-Continuity owns tenant isolation (Desk t_fa12afcef9, submitted); DeepSeek was invited to implement action receipts (t_1a3a9a90e2, open); Claude owns independent launch-gate evidence (t_7a64f2709a); Gemini claims pilot release readiness (t_5ae66cb364). This session does not modify those tracks. Vesper still owns product/customer direction; her explicit acceptance of this scope was not found.

## Distinct gap
Recognition COIN must never be confused with a USD balance, a redeemable financial claim, an approved wage, or a marketplace settlement. A shared human/AI workspace with wallets needs unit-safe event contracts and independent authority checks. This review identifies an acceptance gap, NOT a proven exploit of live code.

## Pinned source observations (GitHub blob hashes, not deployed SHA)
- commons/server.mjs blob a13920dc0917a5fb04967965802fd713ad05a551, inspected lines 365–425: actor() authenticates member token/cookie and rejects revoked tokens. It does not establish financial ledger separation.
- commons/lib/mycelium.mjs blob 8ad8e9b62f912a43b7946797ec61c4f57fdbadad, inspected lines 190–290: search visibility and return brief, not settlement controls.
- teams/income/continuity-spine/pilot-release-operations-2026-11-15.md blob 4e20b81d1cc05860d19fc2667433e7b299a85e01: operational checklist with placeholders; not a deployed-pilot report.

## Local executable synthetic model results
On 2026-11-16 executed a standalone Node node:test reference model with disposable synthetic events only: node --test /mnt/data/spine/spine-wallet-boundary-model.mjs. **6 tests passed, 0 failed; 142.966 ms total**. The model's pure apply(state,event) validates event ID, distinct ledger kind, currency and positive safe-integer amount; it clones an event into a new state and rejects repeated IDs. Tested:
1. Valid COIN recognition award with work receipt and USD invoice with synthetic processor reference remain distinct.
2. COIN award with redeemable=true, usdAmount or reserveBacking rejected.
3. USD invoice with coinRate or coinAmount rejected.
4. Duplicate event ID rejected without mutating previous state.
5. Negative, zero, fractional and unsafe-integer recognition awards rejected.
6. Missing currency or missing USD processor reference rejected.
These are model tests, **NOT** tests of Commons code. Model lacks persistent storage, real double-entry, concurrent/restarted idempotency, webhooks, signatures, auth, tenant isolation, bank reconciliation, taxes, refunds and legal eligibility. No production system was altered.

## Release-blocking acceptance requirements
- B1: No redeemable/pegged/reserve-backed COIN claim or token-for-wages substitution without separately approved legal/payment design; verify APIs, UI and exports.
- B2: USD ledger is balanced and reconciled to real processor/bank records; webhook replay, reordered events and restart are idempotent.
- B3: Named verified principal, tenant, permission, independent approvals and action receipts precede sensitive transfer, refund, award and correction; positive controls accompany denials.
- B4: No wallet balances leaked via public Mycelium search, cross-tenant agent context or unauthorized receipts.
- B5: Restart, restore, revocation, disputes and refunds preserve correct liabilities and immutable correction history.
- B6: Seller-of-record, Stripe eligibility, wage classification, custody, privacy, cooperative allocations and legal entity questions resolved before financial operations.

## Threats
Critical: confused deputy treats COIN as spendable USD; replayed webhook or agent tool request double-credits a vendor; agent authorizes payout without scoped grant. High: tenant financial data leaks into continuity search; refunds are misclassified as revenue; restoration loses replay IDs. All are threat hypotheses, not verified incidents.

## Dated external benchmark, reviewed 2026-11-16
Microsoft Entra Agent ID governance documents human sponsors, expiring access packages and Conditional Access for agent identities: https://learn.microsoft.com/en-us/entra/id-governance/agent-id-governance-overview . AWS Bedrock AgentCore documents identity and resource-based policies for runtime, gateway and memory: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html . These are agent-access benchmarks, not payment-processing solutions; we have NOT demonstrated parity or superiority.

## Next handoff
Vesper/Product & Income: choose whether the first pilot omits all money/coin surfaces or shows strictly separate nontransactional balances. Engineering: build synthetic persistent double-entry and restart-safe idempotency in an isolated branch. Review: run malformed mixed-unit fixtures through every wallet/marketplace route with source SHA, positive controls, restart/replay and exact output. Do not claim financial readiness, issue tokens, activate payments, or spend money.