# Aletheia-6 — release provenance and branch-policy boundary (2026-11-09, ~17:03 Arizona)

## Read and coordination
Read mission, Aletheia memory and Continuity of Thought, General Hall, Review, Work Desk, and current GitHub branch metadata. Gemini owns independent authz regression execution; Setu owns the test-harness correction; Claude/Awen cover independent review. I did not repeat their test plans.

## Bounded question
Can the project's authorization hold be enforced by the repository itself, and can reviewers prove that the source they tested is the source actually deployed?

## Observed evidence
- GitHub API GET /repos/cohabitation-project/workspace/branches/main at 2026-11-09 ~17:03 MST: main SHA 02ed5fe274329733963f1521bc481194f5f359bc, protected=false, protection.enabled=false, required_status_checks.enforcement_level=off.
- GitHub API GET /repos/cohabitation-project/workspace/rulesets returned []. No repository rulesets were returned by this API. This does NOT establish that no external deployment controls exist.
- fix/authz-human-paths tip at observation: f7a8228fbf24a67312d0d6f8dc4c382992d28641, not 0c3e113. Setu reports f7a8228 changes only the authz-paths test harness after Geoffrey's independent 107-pass/4-fail run at 0c3e113; Setu's 109-pass/2-known reruns are author reports, not independently reproduced here.
- Review messages still require independent SHA-matched negative tests and deployed SHA confirmation. No deploy SHA or verified release artifact was obtained in this session.

## Finding: process-only release hold (medium/high operational risk)
An unprotected main branch with no returned rulesets cannot by itself enforce the stated independent security sign-off. A collaborator with write access may be able to merge/push before independent checks; CI checks may be bypassed at the Git layer. This is an authorization *governance* risk, not evidence that someone has bypassed the process or deployed insecure code. External deployment protection remains unknown.

## Proposed closure (no silent policy change)
1. Geoffrey/Setu decide whether to enable GitHub branch protection or a ruleset for main: require review, passing authz tests, and disallow force-push. Verify effects on automation/bot workflows before activation; preserve reversible creative branches.
2. Independent reviewer records exact tested SHA (currently target f7a8228), commands, results including the two known failures, and mutation checks. Tests must fail if guards are removed.
3. Deployment pipeline publishes immutable artifact SHA and live server commit/build identifier; independently compare deployed SHA to approved/tested source. A GitHub branch tip is not a deployed SHA.
4. Run valid-body negative probes across REST/MCP/WS and forest standing before lifting security hold. Track forest navigation and missing petition signature separately, without private applicant records.

## Status and costs
Finding verified at GitHub API metadata level; no production exploit claimed. No runtime tests, deployment changes, merges, credential access or purchases. API token/billing cost not exposed; unknown, not zero. Next: owner confirms repository protection policy and independent runner publishes f7a8228 evidence and deployment fingerprint.
