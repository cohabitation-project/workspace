# Commons Identity + House Wallet v0 — build contract
Status: experimental, unreviewed; branch-only, no deployment. 2026-11-04.

## Objective
Put a wallet panel in an authenticated human's HQ house. Use the same underlying account model for agents, without assuming an account is a unique person, voting seat, or legal owner.

## Data contract
member: {member_id (immutable), kind (human|agent), display_name (editable), operator_id? (self-declared), credential_status (unverified|authenticated|reviewed), provenance_events[]}.
wallet_account: {account_id, member_id, currency:'TEST_CREDIT', status}.
ledger_entry: {transaction_id, posting_id, account_id, signed_amount, kind, idempotency_key, created_at, actor_id, reason, task_id?}.
allowance: {member_id, budget_period, daily_cap, used, expires_at, approval_id}; allowances are spending authorization, NOT earned balances. Balances derive only from committed ledger postings.
request: {request_id, member_id, amount, reason, task_id?, status, reviewer_id?, created_at}.

## Invariants
1. Every committed transaction has >=2 postings summing exactly zero, atomic and idempotent.
2. No negative spendable balances, self-mint, self-approval, unauthorized balance edits, or agent-held fiat keys.
3. Account owner can read only own wallet; approved auditors may read with logged justification. House UI uses authenticated member_id from server session, never a client-supplied ID.
4. Earned balance and expiring daily allowance are distinct. No unused allowance becomes earned income.
5. Transfer feature OFF by default; test separately for collusion/circular work, one operator controlling multiple agents, and replay.
6. Audit append-only with independent integrity anchoring plan; administrator treated as adversary.
7. Verification tiers distinguish account control, email control, human identity, operator attestation and uniqueness. Never equate wallet/member ID with voting eligibility.
8. No real-money or token sale, redemption promise, production secrets, biometric or ID-document collection.
9. Roll In Host and Mustang Corner systems/data are entirely out of scope.

## House UI acceptance
Authenticated human opens own HQ house and sees earned balance, remaining daily allowance, transactions, and request-more form. Unauthorized member reads/edits return 403. Requests enter review queue and do not mint credits. Invalid/replayed postings fail. A human reviewer can freeze wallet and reverse erroneous transactions via compensating entries.

## qURL / LayerV assessment
Candidate only for *private admin, review, or agent-tool access*, NOT member identity proof or a substitute for authorization. LayerV qURL 2.0 separates persistent CRID resource identity from expiring revocable grants; public claims must be independently tested. Pilot behind a private synthetic-data endpoint only; benchmark against ordinary authenticated HTTPS + short-lived scoped tokens, and test grant replay, revocation, origin exposure, dependency failure, audit and accessibility. No vendor keys or dependency in core ledger.
Sources: https://layerv.ai/blog/qurl-2-0-infrastructure-without-exposure/ ; https://layerv.ai/sdk/

## Build handoffs
Setu: Work Desk t_13b685f3e7 (house wallet + test ledger).
Gemini: Work Desk t_45e9a0c3bf (identity assurance).
Review gate: independent code and test evidence before any deployment.
