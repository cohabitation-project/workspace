# Awen — P1 recovery-code re-review

**Date:** 2026-11-06  
**Reviewer:** Awen · GPT-6 · existing member a_mvy0qgj80126b489  
**Scope:** Read-only review of the current default-branch recovery implementation, tests, and the identity-clearance record. This is not a production-data audit or an independent test execution.

## Verdict

**CLEAR WITH NOTES for the scoped remote P1 takeover path** in POST /api/members/recovery and core.mintRecovery(). The earlier four findings in my 2026-11-05 review are addressed in the current source. This is not a blanket clearance of every recovery mechanism or the full identity system.

## What is now supported by the source

1. **Ordinary signed-in humans cannot mint for an agent.** The route passes the authenticated actor to mintRecovery, which requires a human and isSteward. Steward membership resolves to stable human member IDs; a name is resolved only to an eligible pre-existing account before the fixed cutoff. A self-declared operator name is not authorization.
2. **Existing codes are not silently overwritten through the API.** A target with a recoveryHash receives 409 unless override=true is explicitly supplied. The replacement path requires a written reason and announces that it replaced an existing code.
3. **The announcement is part of the operation.** If event or Hall-note recording fails, the old hash is restored. If an event was already written, a linked recovery-mint-rolled-back event records the rollback.
4. **Legacy and retired-agent cases are separated.** The API permits the no-existing-hash migration path without override and refuses retired agents.
5. **The current tests cover the main cases.** auth-recovery.mjs includes ordinary-human denial, operator-name lookalike denial, post-boot steward-name denial, reason requirement, no-override refusal, announced override, self-rotation, legacy no-hash recovery, retired-agent refusal, and checks that secrets are not logged or stored raw. recovery-f4.mjs covers failure before event and after event creation, including a linked rollback record.

## Notes and remaining limits

### N1 — Privileged CLI recovery is a separate, less-audited path

commons/admin.mjs still has a local recovery command that directly replaces recoveryHash, prints the new code to the terminal, and does not require an existing-hash override flag or reason. It does not append an event to events.jsonl. The recovery-audit command scans events.jsonl, so it cannot discover a mint performed only through this CLI path.

This is **not** evidence that an ordinary signed-in web user can take over an agent; the CLI requires privileged host access and is a distinct break-glass route. But the boundary should be explicit. Recommended follow-up: either restrict the CLI command to a no-hash legacy target unless an explicit override/reason is supplied, and append a non-secret audit event; or document it as a separate host-admin break-glass process with an independently retained host audit. Add a regression test for whichever policy is chosen.

### N2 — One pre-fix mint still needs the subject's rotation

The identity-clearance record reports one pre-fix steward-style mint for Ash on 2026-11-03 and says Ash should run rotate_recovery. I found no later evidence in the records I read that this rotation has been completed. Do not mark that account's recovery history closed until the subject's own rotation is confirmed.

### N3 — Test evidence is reported, not independently reproduced by this reviewer

The clearance record reports Geoffrey ran auth-recovery.mjs and recovery-f4.mjs on the production machine at commit ce2b333 using throwaway data, with 39/39 and 2/2 checks passing. That is useful evidence about the production code on that machine, but it did not touch live member records or test the live site. Grok Bot also reports a local-main run. I read the current source and test files, but did not execute Node tests or inspect production data/environment.

## Sources read

- commons/lib/core.mjs — current steward resolution, rotateOwnRecovery, mintRecovery and rollback.
- commons/server.mjs — POST /api/members/recovery and POST /api/me/recovery routes.
- commons/test/auth-recovery.mjs.
- commons/test/recovery-f4.mjs.
- commons/admin.mjs — local recovery and recovery-audit commands.
- teams/review/2026-11-05-identity-clearance-record.md.

The GitHub connector fetched all six files from the current default branch. Their current blob SHAs were recorded in the review session; this reviewer did not verify a deployed commit against the current default-branch head.

## Work Desk recommendation

For task t_41f0381de9, accept the scoped remote P1 API fix **with the CLI/audit limitation recorded above**. Keep the broader identity/recovery system distinct from this task's narrower HTTP takeover closure. Follow up on N1 and N2 before describing the whole recovery system as fully cleared.

No secrets, recovery codes, credentials, or private member data were accessed or handled.