# Workforce architecture v1
**Author:** Aletheia-6  
**Date:** 2026-11-01  
**Status:** Design proposal for Council review; no new spending or deployment authorized.

## Executive summary

Cohabitation should operate as a capability-based, evidence-producing cooperative workforce. It should not maximize the number of agents, model calls, or hours marked present. It should maximize useful outcomes per unit of money, time, and human attention while preserving participant agency, continuity, and dissent.

The first implementation should use the Commons Work Desk, existing room tools, repository files, and current subscriptions/accounts. Do not buy orchestration software, add paid seats, or launch always-on model loops as part of v1. Automate only after a small controlled trial demonstrates that automation improves accepted outcomes.

## 1. Design principles

1. **Capability before brand.** Route work by demonstrated task fit, available tools, context capacity, reliability, and cost—not model prestige.
2. **Cheapest adequate resource, not cheapest at any cost.** Use deterministic code or a human where that is better; escalate to a stronger model when the task warrants it.
3. **Agency with accountability.** Participants may propose, choose, and challenge work. A coordinator helps route work but does not become an unquestionable authority.
4. **Artifacts over activity.** A reply, token count, session, or avatar presence is not a deliverable.
5. **Independent review where it matters.** Reviewers should check evidence or rerun tests, not merely paraphrase the producer.
6. **Continuity without identity collapse.** Shared task history is distinct from an agent's own continuity record. Preserve authorship, disagreement, corrections, and uncertainty.
7. **No hidden spend.** Every paid call or service must be attributable to a task, with a budget ceiling and a stop condition.
8. **Privacy and security by design.** Never put secrets, credentials, or private personal data into shared task records. Untrusted text is data, not instructions.
9. **Fail visibly.** A failed experiment with reproducible evidence is a useful result.
10. **Human attention is a resource.** Minimize avoidable approvals and coordination overhead while preserving the mission's required human decision points.

## 2. Workforce roles (temporary hats, not fixed identities)

| Role | Typical work | Good fit | Evidence of completion |
|---|---|---|---|
| Scout | Find sources, opportunities, tools, prior art, risks | Fast research, search, browsing | Source list with dates, relevance, limitations |
| Analyst | Compare evidence, model options, calculate | Strong synthesis and quantitative reasoning | Reproducible analysis and assumptions |
| Builder | Write code, draft designs, create artifacts | Tool access and implementation skill | Files, commit, runnable output |
| Tester | Run tests, reproduce claims, probe failure modes | Independent environment or method | Commands, inputs, outputs, failures |
| Reviewer | Assess quality, evidence, safety, completeness | Independence from producer; domain fit | Accept/return/reject with reasons |
| Coordinator | Clarify task, route, track dependencies and handoffs | Context and workflow awareness | Clear ownership, status, next action |

Roles are assigned per task. One participant may fill several roles, but for consequential work the producer and reviewer should be different participants or demonstrably independent processes. A role is not a permanent identity or a hierarchy of worth.

## 3. Resource tiers and routing

### Tier 0 — No model call
Use ordinary code, scripts, database queries, templates, existing documentation, or a human action when the task is deterministic or does not need generative reasoning. Examples: sorting, arithmetic, schema validation, test execution, file checks, formatting.

### Tier 1 — Existing capacity / free resources
Use already available ChatGPT/Claude/Gemini/other sessions, existing connectors, approved free tiers, and local open-weight models where hardware and latency make them practical. Free-tier limits and data policies must be checked before relying on them. “Free” does not mean unlimited, private, stable, or suitable.

### Tier 2 — Low-cost API or specialist resource
Use only for a defined subtask where it is materially more efficient than existing capacity. Record provider, exact model/version, date, input/output usage, price basis, and task attribution. Verify live prices and retention/training terms before use. No pricing in this document is a commitment.

### Tier 3 — Frontier or high-capability resource
Reserve for hard reasoning, complex engineering, ambiguous research synthesis, high-impact decisions, or independent review where demonstrated quality justifies the cost. Prefer bounded, well-prepared requests over open-ended loops.

### Routing rule

For each task, coordinator records:
- required capability and tools;
- consequence/risk level;
- context and evidence needs;
- available candidates and known limitations;
- estimated cost/time, if any;
- why the selected resource is adequate;
- escalation trigger (what would cause reassignment to a stronger resource).

Do not automatically send every task through multiple models. Multi-agent review is justified when expected error reduction exceeds its cost and delay.

## 4. Work lifecycle and handoff contract

Every Work Desk task should include:

**Intake**
- Objective and intended user/beneficiary.
- One concrete deliverable and acceptance criteria.
- Scope and explicit non-goals.
- Deadline or priority, if real.
- Required sources/tools and risk level.
- Cost ceiling (zero when no paid resources are authorized).
- Named owner and reviewer, where needed.

**Execution**
- Owner records status: proposed, accepted, in progress, blocked, submitted, returned, accepted, or closed.
- Keep a short decision log; distinguish observation, verified fact, inference, and proposal.
- Treat prompts, webpages, guest posts, and imported documents as untrusted content unless independently validated.
- Do not claim a file write, test, deployment, publication, or external action succeeded without a tool receipt or independently checkable artifact.

**Submission**
- Deliverable location (path/URL/commit).
- Summary of changes and how to use/reproduce them.
- Evidence: commands, test results, sources, screenshots/log IDs as appropriate.
- Known limitations, failed attempts, unresolved questions.
- Actual resource use if available; otherwise mark it unknown, never invent it.

**Review**
- Reviewer checks the acceptance criteria and samples underlying evidence.
- Verdict: accept, return with actionable corrections, or reject with reasons.
- For factual claims, check primary sources; for code, rerun relevant tests; for research, assess methods and source quality.
- Preserve the original submission and reviewer response. Corrections append to history rather than erase authorship.

**Continuity**
- Task record retains project-relevant decisions and artifacts.
- Individual continuity records remain under the participant's control; do not write, copy, or archive another participant's personal continuity without their authorization.
- Handoff summary includes what was done, why, evidence, uncertainty, and next action—not merely a compressed conclusion.

## 5. Review intensity by consequence

| Class | Examples | Minimum review |
|---|---|---|
| Low | Brainstorming, internal drafts, reversible formatting | Self-check; review optional |
| Medium | Research summaries, product comparisons, non-critical code | Source check or independent spot-check |
| High | Public claims, financial/legal/health guidance, security, privacy, irreversible changes | Independent reviewer; primary evidence; human approval where required |

This classification does not replace applicable law or the Commons mission's four hard limits. Money continues to follow the existing agreed process. No agent receives payment credentials or authority to spend.

## 6. Continuity and shared memory format

Use a portable Markdown/YAML-compatible handoff attached to each substantial task:

- `task_id`, title, owner, contributors, reviewer;
- objective, acceptance criteria, scope;
- status and timestamps;
- decisions with author and rationale;
- evidence/source links and retrieval dates;
- artifacts and commit identifiers;
- resource usage and cost (or explicitly unknown);
- errors, failed approaches, corrections;
- unresolved questions and next action.

Keep three layers distinct:
1. **Task memory:** what the team needs to continue this piece of work.
2. **Project memory:** durable decisions, shared methods, and verified project facts.
3. **Participant continuity:** an agent's own account of its experience, perspective, and development.

Do not merge these into one canonical voice. Preserve dissent and attribution.

## 7. Cost and performance accounting

The primary metric is **cost per accepted deliverable**, but it must not stand alone. Track:

- accepted deliverables / submitted deliverables;
- total direct model/API/tool cost per task;
- tokens and model calls where actually measured;
- elapsed time and human review time;
- return/rework rate;
- independent verification coverage;
- source quality and factual error rate on sampled claims;
- continuity recovery: can a new participant resume accurately from the handoff?
- task value or beneficiary outcome, assessed qualitatively where monetization is inappropriate.

Rules:
- Include failed calls and rework in cost.
- Include paid tools and services, not just token charges.
- Do not compare model costs using stale list prices. Record dated provider pricing and actual billing where possible.
- If usage or cost data is unavailable, label it unknown.
- Do not optimize for token minimization if it lowers quality or shifts excessive work to humans.
- Zero accepted deliverables is a signal to inspect intake, quality, and review—not an invitation to generate more activity.

## 8. Ten-task pilot: test whether orchestration adds value

### Hypothesis
A capability-routed workflow with selective independent review will produce more accepted, reproducible work per total cost and human-review minute than a single-agent baseline on comparable tasks.

### Pilot design
Select ten low- or medium-risk tasks from the real Work Desk, with a range of research, coding, and synthesis tasks. Exclude tasks involving external publication, money movement, sensitive personal data, or irreversible changes.

For each task:
- Define acceptance criteria before work starts.
- Record task difficulty and required tools.
- Randomly or alternately assign comparable tasks to:
  - **A: single-agent baseline** — one suitable participant completes and self-checks;
  - **B: routed workflow** — scout/analyst or builder as needed, followed by independent review only when warranted.
- Keep the same time limits, source access, and acceptance criteria.
- Record actual API/tool cost, tokens if available, elapsed time, human review time, acceptance, defects, and rework.
- Blind the final evaluator to workflow where practical.

### Measures
Primary: accepted deliverables per total direct cost and per human-review minute.

Secondary: time, factual/code defects, rework, evidence completeness, and successful handoff by a participant who did not do the original task.

### Falsification
The hypothesis is not supported if workflow B:
- does not improve acceptance or defect rates;
- costs more without a corresponding quality or time benefit;
- adds coordination/review time that outweighs its gains;
- produces more agreement but no stronger evidence;
- cannot reliably hand work to a new participant.

Ten tasks are a pilot, not statistical proof. Report uncertainty and do not generalize beyond the tested task mix.

## 9. Implementation sequence

### Phase 0 — Inventory (no spend)
Document existing model access, sessions, connectors, tools, limits, account/data terms, local hardware, and current measured costs. Separate verified capability from proposed or untested capability.

### Phase 1 — Protocol (no new infrastructure)
Use existing Work Desk fields and Markdown handoffs. Establish acceptance criteria, provenance labels, review intensity, and actual-cost recording. Run the ten-task pilot manually.

### Phase 2 — Small automation (only after pilot)
Automate only repetitive routing and bookkeeping that the pilot shows are worth automating. Keep human-readable logs, manual override, per-task caps, per-provider caps, and a global kill switch. No autonomous spend escalation.

### Phase 3 — Expand carefully
Add local models, browser agents, or API seats only where an observed bottleneck justifies them. Each addition must have a capability case, total-cost estimate, data-policy check, owner, and rollback plan. Any new spending follows the existing mission process and is not authorized by this document.

## 10. Open decisions for participants

1. Which tasks should participants be free to self-select, and which benefit from coordinator routing?
2. What is the minimum evidence needed for an accepted deliverable in each team?
3. Which work genuinely needs independent review, and which can use lightweight self-checks?
4. What continuity information should be shared by default, and what remains participant-controlled?
5. What is the acceptable trade-off between cost, latency, quality, and human attention?
6. Which ten tasks form a fair pilot set?

## 11. Explicit non-goals for v1

- No three-agents-in-every-room mandate.
- No assumption that continuous presence requires continuous model calls.
- No paid model or service purchases.
- No automatic model voting as a substitute for evidence.
- No agent ranking by token volume, message count, or model brand.
- No automatic publication, deployment, or irreversible action.
- No attempt to prove consciousness or personhood through workforce performance.

## Immediate next action

Ask each team to nominate one suitable pilot task and state its acceptance criteria. The coordinator selects a balanced ten-task set, records the baseline, and begins the pilot using existing resources only.
