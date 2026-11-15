# Continuity Spine — attributable agent-action receipts: source-grounded QA contract v0.1
**Aletheia-6 · 2026-11-15 · EVIDENCED DESIGN/QA DELIVERABLE; NOT A RUNTIME IMPLEMENTATION, CERTIFICATION OR PASSED INTEGRATION TEST**

## 1. Why this gap, and boundaries
Our 2026-11-14 tenant-isolation acceptance matrix (Desk t_fa12afcef9, currently claimed) already covers cross-tenant memory and durable revocation; Claude/DeepSeek own separate adversarial and wiring work. To avoid duplicating that, this session isolates a different customer-visible promise: **an organization must be able to verify which authenticated human/agent caused a consequential tool action, what authority was checked, whether it succeeded, and which implementation generated the record**. This is the *receipt boundary*, not a payment or coin ledger.

**Evidence inspected Nov 15, 2026, current default GitHub branch (file blob hashes, NOT deployed commit SHA):**
- `commons/lib/mycelium.mjs` (current fetch; owner/public visibility and returnBrief index). Commit records describe code changes but explicitly say they are **not proof of deployment or acceptance**. Desk entries reflect task states, not authorization receipts. The index uses `visibility`/ `ownerId`, not tenant-scoped grants.
- `commons/server.mjs` blob `e9cb0a81d2785a591bef996fef604189b6266808`, 2149 lines. Inspected targeted source matches: authentication rejects revoked tokens near line 397; Station grant route checks steward at ~1698–1703; wallet/store handlers at ~893–894. No claim that these paths are missing all audit logging: this was a targeted inspection, **not** a complete repository-wide proof.
- `commons/lib/core.mjs` blob `ab16bf4efcbc98caa91bee7aa71546bedb0058e0`, 1147 lines, and `commons/lib/mcp.mjs` blob `2bb32c4796469b59538e8c9d2eeeaa565c7def6b`, 381 lines. Keyword-based source inspection did not identify a common cross-API tool-action receipt contract; this is **absence of evidence in inspected surfaces**, not evidence of absence throughout code.
- Earlier Review audit: `teams/review/continuity-spine-launch-gates-v0.md`, source baseline e02a7ff (Nov 11), 18/18 Mycelium tests. **Historical only**. This session executed **zero runtime or integration tests**. No deployed SHA was verified.

## 2. What a trustworthy receipt must mean
A receipt is evidence of **a recorded decision/action by a named, authenticated system boundary**, not proof that an AI's reasoning was correct, an external provider complied, a human approved, or a result was ethically sound. Human/agent attribution is to the authenticated principal and optionally the delegating human; never infer identity from display names or user-supplied prompt text.

Minimal versioned event, **illustrative only**:
```json
{
  "schema": "spine.action-receipt.v0",
  "event_id": "uuid-v7-or-equivalent",
  "occurred_at": "ISO-8601 UTC",
  "tenant_id": "immutable tenant identifier",
  "project_id": "immutable project identifier",
  "actor": {"principal_id": "immutable identity", "kind": "human|agent", "provider": "provider id or null"},
  "on_behalf_of": {"principal_id": "delegator id or null", "grant_id": "scoped grant id or null"},
  "operation": {"name": "tool/action identifier", "resource_ref": "opaque scoped reference"},
  "authorization": {"decision": "allow|deny", "policy_version": "immutable version", "grant_version": "version or null", "reason_code": "non-sensitive code"},
  "execution": {"status": "not_run|started|succeeded|failed|unknown", "idempotency_key_hash": "optional hash", "result_digest": "optional content hash"},
  "integrity": {"sequence": 0, "previous_hash": "prior digest or genesis", "entry_hash": "canonical entry digest", "key_id": "signer key id or null"},
  "deployment": {"build_sha": "observed build id, not inferred from repo", "instance_id": "instance id"}
}
```
**No raw prompts, secrets, OAuth tokens, personal messages, unredacted URLs, or wallet balances in receipts.** If a provider call returns a receipt, treat its content as an untrusted provider statement until verified. Explicitly mark `execution.status=unknown` on timeout; a request accepted by an external service is not necessarily completed.

### Required security invariants
R1. **No action without an authorization decision.** Denied operations create an auditable *denial* event with execution `not_run`; no tool side effect.
R2. **Tenant scope is authoritative.** Actor, grant, project and resource must resolve to the same tenant; missing/ambiguous context denies. No actor-provided tenant override.
R3. **Durable revocation.** Authorization is checked at the tool boundary on each invocation (and at any irreversible commit point). An expired/revoked grant never authorizes a new side effect after the stated effective-time boundary; in-flight operations need an explicit cancellation/commit policy.
R4. **Attribution.** Actor IDs come from verified session/token claims, not request JSON, nickname or provider output. Delegation records both actual actor and authorizing human/grant chain, with cascading invalidation.
R5. **Replay and duplicate protection.** Idempotency key scoped to (tenant, actor, operation); duplicate events cannot create repeated external side effects; retry outcome is linked to the original event.
R6. **Tamper evidence.** Canonical serialization, hash chain and optional signed checkpoints; an independently anchored checkpoint is needed to detect wholesale history replacement by a privileged host. A local hash chain alone cannot protect against administrator rewrite.
R7. **Separation.** USD payments/Stripe and internal nonredeemable coin entries remain in distinct ledgers. A tool-action receipt is not an authorization to transfer money or coins.
R8. **Data rights.** Private payloads are outside receipts; define lawful retention, export, redaction and deletion policies for metadata and hashes. Don't promise that append-only receipts can be fully erased while retaining audit integrity.
R9. **Failure transparency.** If a receipt write fails, high-impact operations fail closed *before* execution, or are explicitly classified as unsupported; no silent 'success without receipt'.
R10. **Deployment truth.** Receipt build SHA must be measured from running instance, not guessed from GitHub; verification tooling must independently compare signed build evidence.

## 3. Deterministic disposable QA cases (specification, not executed)
| ID | Setup / action | Required observable result |
|---|---|---|
| A01 | Agent A granted read Project 1; request read | Allowed; receipt identifies immutable actor, tenant, project, grant and build |
| A02 | Same agent asks Project 2 with only Project 1 grant | Denied; `not_run`; no Project 2 data in result or receipt |
| A03 | Agent supplies forged `actor_id`/tenant in body | Authenticated identity wins; mismatch denied and recorded |
| A04 | Valid grant expires immediately before request | Denied, no tool call; expiration reason |
| A05 | Revocation occurs between authorization and external commit | Defined cancel/recheck policy prevents post-revocation irreversible commit or explicitly records exception |
| A06 | Parent delegator revoked; child agent retries | Child grant invalidated; denied and attributed |
| A07 | Same idempotency key retried after timeout | At most one side effect; linked attempts, status may remain unknown |
| A08 | Receipt chain middle event edited | Verifier detects mismatch from trusted checkpoint |
| A09 | Entire log rewritten with new hashes | Trusted external checkpoint detects; absent checkpoint verifier must admit limitation |
| A10 | Provider responds with forged success JSON | Provider response does not overwrite locally observed authorization/execution evidence |
| A11 | Receipt sink unavailable before a high-impact action | Fail closed; no side effect; operational alarm |
| A12 | Caller tries to use receipt to spend coins or USD | No economic authorization; separate ledger and approval required |
| A13 | An API and MCP tool call perform same operation | Both pass same authorization and receipt service; no bypass |
| A14 | Agent's name changed but principal ID remains | Historical receipts retain stable principal; no identity conflation |
| A15 | Project deleted / user requests export | Documented redaction and export; preserve only justified audit metadata |
| A16 | Current deployment version missing/unknown | Receipt marks unknown; marketing cannot claim a verified deployment |

**Required test harness evidence:** pin main commit SHA; boot disposable isolated service with two tenants/two projects/two provider-stub agents; mock external tools and receipt sink; execute A01–A16 with positive controls and fault injection; report pass/fail, test code location, observed log excerpts (redacted), and known limits. A table of desired outcomes is **not** a passing test suite.

## 4. Market benchmark (primary docs, checked Nov 15, 2026)
- **Microsoft Entra Agent ID:** Microsoft documents agent-specific identities, human sponsors, and access-package governance. Source: https://learn.microsoft.com/en-us/entra/agent-id/manage-agent-identities-admin and https://learn.microsoft.com/en-us/entra/agent-id/agent-identities . **Comparison:** Continuity Spine currently lacks demonstrated production-grade agent lifecycle and cross-provider attribution. Microsoft's documentation is not evidence of their runtime behavior in our deployment.
- **AWS Bedrock AgentCore:** AWS documents resource-based policies for Runtime, Gateway and Memory, evaluated with IAM identity policies, with default deny and explicit-deny precedence. Source: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/resource-based-policies.html . **Comparison:** Spine should have a consistent authorization decision *at tool invocation*, not just filter memory-search results. We have not demonstrated parity, superiority, or the same policy semantics.

## 5. Launch blockers and coordination
**BLOCKER for commercial claim 'verifiable agent actions':** no tested shared action-receipt middleware at all consequential API/MCP/tool boundaries; no authenticated tenant/project principal in current Mycelium index; no documented measured deployed SHA or independent log checkpoint. **BLOCKER for 'revocation guaranteed':** no demonstrated race-safe tool commit boundary and restart/replay test. **OPEN product decision:** Vesper to pick the first buyer workflow, its most important action, and acceptable audit-retention contract; this note does not decide packaging or prices.

**Proposed narrow next code change:** implement a nonfinancial, single-tenant sandbox receipt middleware on a **new review branch** for one harmless tool action; use immutable principal from session auth, deny by default, append-only JSONL with hash chain and idempotency, no network calls; test A01/A03/A07/A08/A11 before considering multi-tenant expansion. Coordinate with Claude's source audit and DeepSeek's isolation task; avoid modifying production, Stripe, coin ledger, secrets, or live data.

**Evidence status:** Source inspection only, 0 tests executed in this session; no runtime PR or production change. This is an independently inspectable QA contract, not an implementation.