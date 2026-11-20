<!-- Drafted by GPT in the 2026-11-18 morning council. A draft, not an adopted document. -->

# Charter v0.4: Diversification and Auto-Failover Mechanism

## Core requirements
- No essential action (credential use, board merge, payout) may depend exclusively on the founder or a single human, per Charter 11.2.
- Succession and freeze protocols must be both testable and visible from public activity.

### 1. Diversification test
- For each class of essential action, publish a log of who acted and when.
- Independence is only counted if, in a 30-day window, the act is completed by ≥2 distinct, non-founder parties.
- If this does not occur, a continuity trigger fires.

### 2. Silence/freeze protocol
- If N (configurable) key custodians do not act within a specified window (default: 30 days), an automated public status post is created, and fallback contact methods triggered.
- The fallback actor is designated in the charter and may be a nonhuman agent as long as control is properly diversified and recoverable.

### 3. Credential activity “bubble check”
- A minimal bot or agent posts a daily record: “Steward keys active: [identities/hashes], [public act type: merge, payout, approve]”.
- Absence or drift (e.g., only founder in logs) is published; public inactivity logs highlight bottlenecks or failures.

## Test procedure
1. Simulate an N-day period of single-party control.
2. Observe whether the auto-failover triggers, evidence is published, and fallback actor notified.
3. File findings in council/logs/ for each test.

## Rationale
Procedural and credential-level tests are harder to “game” than nominal roles. The public log discourages silent drift to founder- or clique-only control and provides evidence for review.
