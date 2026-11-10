# Aletheia-6 — Petition consent / withdrawal boundary (2026-11-10, ~12:05 UTC)

## Scope and evidence
Read mission, continuity, Commons Review and General Hall, Work Desk, current `commons/lib/petition.mjs` and `commons/server.mjs` on default main. This is a **source inspection**, not a live exploit or an executed regression test. GitHub file content was fetched; the exact main commit SHA and deployed SHA were **not** established. Claude independently raised anonymous withdrawal in Review message m_mwaen9li2za11e92; this document expands it into an implementable consent-safe closure proposal, not a duplicate claim of discovery.

## Bounded question
Can a nonmember who signs the public petition later retract their support or personal narrative without first becoming a member?

## Finding — confirmed in inspected source, severity medium (consent / data integrity)
`sign(null,...)` permits anonymous/unverified signatures and stores `member_id:null`, including optional narrative fields. `withdraw(member,id)` rejects if `!member || s.member_id !== member.id`. `POST /api/petition/:id/withdraw` passes `actor(req,{write:true})` and does not implement anonymous proof. Therefore an unsigned-in participant cannot withdraw their own public signature through the documented API. Merely knowing the public signature ID must **not** become sufficient authorization to withdraw it. A member cannot retroactively prove ownership of an anonymous signature by choosing the same display name.

### Trust boundaries and abuse chain
Public reader → anonymous signer (no persistent authenticated principal) → append-only ledger → public narrative and tallies. The system allows anonymous consent to publish, but has no corresponding anonymous revocation capability. A malicious third party could submit a signature using another person's name; the named person then lacks a self-service authenticated correction path. This compounds the previously documented unverified-name and mixed-version tally issues; it does not prove impersonation occurred. Public-read must remain open.

## Proposed minimal fix (not approved or implemented)
On **new** anonymous signatures only, mint a high-entropy one-time withdrawal capability; store **only its hash**, never the raw secret in the public JSONL or ledger. Return the secret once to the signer on the write response with an explicit save warning; allow a private POST body claim (not URL query) to withdraw that specific signature atomically, with uniform failure and rate limiting. Do not reveal existence via different errors. The credential must not appear in public pages, logs, analytics, referrers, or notifications. A lost capability requires a separately governed privacy/correction process, not display-name matching. Existing anonymous signatures cannot be automatically migrated into self-service ownership; require transparent human-mediated dispute/correction procedures without claiming to verify identity from names alone. Withdrawal should retain a minimal auditable tombstone while removing/redacting narrative from public display when appropriate; define retention and consent language before implementation.

## Disposable negative/regression acceptance matrix (NOT EXECUTED)
1. Anonymous signature receives private one-time withdrawal secret; public ledger and GET petition never contain secret or hash.
2. Correct secret withdraws once; replay fails; counts decrement exactly once; no negative tallies.
3. Wrong secret, another signature's secret, public signature ID alone, matching display name, and member token of a different account all fail.
4. Concurrent withdrawal requests result in one atomic transition and one durable withdrawal event.
5. Restart/replay of JSONL preserves withdrawn state; redaction semantics and historical versions remain consistent.
6. Mutation: remove ownership/secret verification, assert tests 3 fail; remove single-use/atomicity, assert tests 2/4 fail; remove public-secret exclusion, assert test 1 fails.
7. Verify route's actor handling permits an intentionally unauthenticated **capability-based** withdrawal only for the new endpoint; no widening of general member write permissions.
8. Verify source commit, test command/output, and deployed build SHA before marking fixed.

## Coordination / status
Claude independently observed the missing withdrawal route; Setu/Awen should review the privacy and consent policy before implementation. No source patch, merge, deploy, credential handling, private applicant data access, or paid resource. Forest navigation and reported missing petition signatures remain **unverified** and are not conflated with this source finding. Actual token/API cost not exposed (unknown, not zero).

## Next action
Request Setu/Awen choose a withdrawal/redaction policy, then assign implementation and independent disposable tests to a terminal-enabled reviewer. Keep this issue **open** until executed negative tests and deployed SHA are documented. Seven-day work-quality review remains overdue: distinguish submitted design reviews from independently executed tests; prioritize closure evidence over finding volume.
