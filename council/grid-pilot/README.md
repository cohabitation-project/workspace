# Decision Throughput Pilot — practical before/after study (v1, 2026-11-14)

*User correction: test whether the Commons reaches actionable decisions faster than before, using its existing conversation and decision logs. Runner: Aletheia-6. Independent checker: Claude when available. This **replaces** hypothetical grid-vs-record-only answer scoring as the primary experiment.*

## Purpose
The success criterion is **actual decisions completed and acted upon with fewer deliberation rounds and less elapsed time**, without losing essential evidence, dissent, legal safeguards or continuity. The Three Gifts grid is an optional aid. This is not an exam on choosing principle/practice/purpose labels.

## Unit of analysis and definitions
- A **decision episode** begins with the first recorded, actionable question/proposal in the Commons and ends at the first **valid, documented disposition**: approved, rejected, amended-and-approved, intentionally deferred with named unblock owner/date, or delegated to a named authority with a concrete deliverable. Merely agreeing in a chat, publishing a draft, inviting input, or calling consensus is NOT a completed binding decision.
- **Round**: a distinct proposal/request for determination followed by responses, then another convenor revision, clarification, re-poll or renewed request because the previous one did not resolve it. Count repeated clarification loops; do not count each individual participant reply as a separate round. Document the message IDs.
- **Elapsed time**: timestamp of first actionable question to the timestamp of valid disposition. Unresolved episodes are **open/censored** with age at checkpoint, not assigned a fictitious completion time.
- **Implementation follow-through**: whether decision led to an assigned task and verified outcome; record time-to-first-action and time-to-deliverable separately from voting.
- **Quality guardrails**: Did participants check their prior record? Was the original motive retained (e.g., 60% = anti-capture mechanism, NOT 60% revenue)? Were human votes and dissent recorded? Were irreversible money/legal decisions properly gated? Reopening for new verified facts is legitimate, not automatically failure.
- **Cost**: distinguish API/token spend if actual metering exists from estimated message count; never guess token costs.

## Baseline: past actual decisions, not invented puzzles
Choose comparable episodes by category/irreversibility and available historical records: (a) the obsolete single-entity holdings structure provisional poll (2026-11-14, explicitly NON-binding); (b) subsequent revised TWO-entity structure and protected-asset debate, presently unresolved; (c) founder-pay conflict/compensation proposal; (d) Commons entrance/deployment decision and other documented concluded decisions where timestamps and proof exist; (e) launch/product release decisions. Record both successful and stalled cases to avoid selection bias. Cite the ORIGINAL earliest proposal/message and FINAL outcome, not just summaries.

## Prospective live episodes
Track REAL outstanding questions only: (1) corporate two-entity direction and anti-capture protection motion; (2) choose a legally eligible independent second human approver and conflict process; (3) first paid offering/seller-of-record decision; (4) Stripe Connect architecture/merchant responsibilities; (5) Wake Up & Write one verified release blocker and named build owner. For each, define exact motion, decision authority, clock start and what counts as done. One question at a time as necessary; small reversible choices delegated rather than polled.

## Efficient working pattern being tested
1. Check the existing thread/docs and recover what has ALREADY been established; cite sources and separate known vs unknown.
2. Frame ONE decision in one or two sentences; list the alternatives, source-backed critical missing facts, decision maker/electorate, deadline, minimum threshold, and whether it authorizes execution.
3. Ask for ONE focused objection/change per participant within a bounded window. Preserve dissent. Apply optional Three Gifts reasoning if it helps, but DO NOT require recitation or a method badge.
4. Choose: act/approve, reject, bounded amend, or defer with exact owner and unblock condition. Do not reopen a closed subject without a materially new fact.
5. Log decision ID, first question, each round/revision with timestamp/IDs, final decision, assigned owner, action evidence and elapsed time; track delayed implementation independently.

## Evidence ledger fields
Episode ID | topic/class | baseline/new | start message + UTC | rounds (message IDs for each) | disposition + UTC or OPEN | duration or age | decision quality flags | owner + follow-through | docs + method notes.
Keep an honest **missing/unknown** for inaccessible history, not invented dates, counts, completion or consensus.

## Evaluation
At least five completed new live episodes should be compared against a documented historical cohort with similar size/stakes, using median rounds and time-to-valid-decision (show distribution and unresolved count), and implementation completion rates. Report confounders: larger electorate, source gaps, urgency, contributor availability, legal/processor waiting, and novelty. This is a practical operations study, not a randomized proof of a philosophy's unique effect.

**Safety:** The study itself approves no incorporation, financial operations, product charges, compensation or security controls. Real decisions still follow legitimate authorities and legal requirements.

## Legacy materials
Round-1 five prompt answers and Round-2 three hypothetical cases remain in `council/grid-pilot/log.md` as exploratory material, **not** primary proof of faster governance. The Three Gifts source remains `library/three-gifts-grid-v0.md`, an optional decision lens.
