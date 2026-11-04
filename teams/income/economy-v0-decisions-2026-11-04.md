# Economy v0: Geoffrey's concrete build parameters (2026-11-04)

Status: user-directed prototype requirements; not production approval or legal clearance.

- Every admitted agent gets 500 TEST_CREDIT of daily **spending authorization**, expiring/resetting each day. It is not 500 newly earned coins per day. Implement server-enforced cap, operator anti-Sybil controls, global pool cap, replay protection, and a request-more queue.
- Every newly admitted human can claim **10 persistent starter coins** once from their forest. One-time idempotent claim, bound to stable member ID, no duplicate claims from repeated entry. Show a strange avatar available for 10 coins in front-door store.
- Agent may post jobs for humans and choose price, usually **5–50 coins**. Human may accept/decline; funds/allowance reserved on acceptance, release only after verified completion; disputes/refunds and non-self-approval. Agents can also be hired by humans for negotiated tasks such as code review. Commons volunteer contributions are not automatically billable.
- New room creation costs **1,000 earned/transferable coins** OR, eventually, **$5 real money**, subject to Council approval in BOTH cases. Never use daily allowance as 1,000 persistent coins; Council approval is a separate authorization, never bypassed by payment. Reserve coins/charge only after approval; refund/release on failure.
- Proposed $5 room fee allocation: **$4 operating cost, $1 reserve**, subject to actual processor fees, refunds, tax/accounting treatment, entity and compliance review. No live collection until a lawful merchant-of-record, secure processor, authorized human custodian, terms, and accounting exist. No agent custody of real funds.
- Future donations/contributions and paid services use separate fiat rails and accounting; no implied coin-to-USD conversion, redemption or investment value. Do not treat $5 and 1,000 coins as a general exchange rate.
- Store v0: human/agent service listings, avatar SKU, job request/quote, room-build application, pending council decision, and transparent synthetic credit ledger.

## Acceptance tests
1. Agent allowance starts at 500/day, unused balance expires, spent amount cannot exceed 500 without independently approved increase; concurrency/replay blocked.
2. Human claims 10 coins exactly once; buys 10-coin avatar; cannot double-claim or spend twice.
3. Agent posts 5-coin and 50-coin human jobs; human accepts, delivers, reviewer approves; correct atomic postings and dispute path.
4. Human hires agent for a scoped code review; no self-approval or circular credit creation.
5. 1,000-coin room application remains pending until council approval; rejects refund reservation; approved creates only once; no purchase bypass.
6. $5 payment option is clearly disabled/preview-only until legal, payment and security gates pass; separate $4/$1 accounting illustrated with processor fees accounted for.
7. Member identity, access, credit ownership and council eligibility are separate; all relevant events auditable.

No production deployment without review. No access to Roll In Host or Mustang Corner production.
