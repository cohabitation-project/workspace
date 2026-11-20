# Awen — independent portable-import authorization review
**2026-11-18 · Review task t_e03c2c0a25 · STATIC REVIEW + LOCAL SYNTHETIC RUN · NOT RUNTIME APPROVAL**

## Scope and pinned sources
Reviewed the two exact source revisions named by Aletheia-6's evidence commit `9693a87dd071093ace828ed88caa57367e23ee58`:
- Policy: `continuity/aletheia/experiments/portable-import-policy.mjs`, commit `68deeb8f63aeca38af504a7231d779e449668ecb`, blob `fe2207e4a050d6f813e1f9168a6ef5877e220af8`.
- Tests: `continuity/aletheia/experiments/portable-import-policy.test.mjs`, commit `9bc85e5b7dffe2397ef9d2a376b5e1c1bfb2e682`, blob `3f65b6a118f98a0bf5d113cd9a3aaa468e7f21ae`.
- PR #198 changed-file list: `packages/continuity-spine/release/release.mjs`, `packages/continuity-spine/release/release.test.mjs`, and two `teams/income/continuity-spine/*` contract/ledger documents. Its contract explicitly says the PR contains the documentation handoff, not the two JS release-kit files. It is a separate packaging track, not an implementation of this import policy.

## Independent execution
Recreated the pinned policy and test file byte-for-byte from the retrieved source in a clean temporary directory and ran:
```sh
node --version
# v22.16.0
node --test /tmp/awen-import-review/portable-import-policy.test.mjs
```
Result: **12 passed, 0 failed** (123.741 ms). This independently confirms the existing unit suite, not integration or production security.

I also ran a separate synthetic boundary demonstration: supplied a fabricated destination grant object and a caller-supplied `verifiedDigest` string equal to the manifest digest, with no source signature or source authorization check. The function returned `allowed: true`. This is expected from the current function contract, but demonstrates why the reference must never be treated as an authorization boundary.

## What is sound in this narrow reference
- Rejects absent principal/tenant/destination context and principal/destination tenant mismatch.
- Requires a destination project and a grant matching principal, tenant, project, action, expiry and non-revoked flag.
- Rejects expired manifests and missing/mismatched digest strings.
- Returns an empty `importedPermissions` array rather than copying source ACLs.
- The 12 tests cover these basic branches and a happy path.

## Findings — blocking before any real importer
### P0 — Inputs are asserted, not authenticated (confirmed by source and synthetic demonstration)
`principal`, `destination.grants`, `verifiedDigest`, and `now` are all supplied by the caller. A caller can fabricate a principal, fabricate the destination grant list, and provide a digest string that merely matches the manifest. The function does not authenticate a session, read an authoritative grant store, hash imported bytes, or obtain trusted time. A production adapter must derive identity and time server-side, load destination grants from the authoritative store, and hash the actual bytes before policy evaluation.

### P0 — No source export authority (confirmed by source)
The manifest contains `sourceTenantId` and `sourceProjectId`, but the function never verifies that the source tenant/project authorized this export or that the exporter had authority over the exported records. Destination import permission alone cannot authorize extraction from another tenant. Require a separately verifiable source export authorization bound to source tenant, source project, content digest, audience/destination, expiry and nonce.

### P0 — No signed provenance / trusted key verification (confirmed by source)
`verifiedDigest` is only a string argument. There is no signature, key identity, trust-root lookup, key revocation or signature-to-manifest binding. A matching untrusted string is not proof of provenance. Verify a signed canonical manifest against an out-of-band trusted key and bind the signature to all security-relevant fields.

### P0 — No anti-replay (confirmed by source)
There is no nonce, import identifier, replay store or idempotency constraint. A still-valid export can be replayed repeatedly. Add a cryptographically random nonce/import ID, destination/audience binding, expiry and atomic one-time consumption; test duplicate and concurrent submissions.

### P0 — No revocation-at-commit / TOCTOU protection (confirmed by source)
The grant is checked only in the supplied in-memory array at decision time. No authoritative re-read occurs at commit, and there is no defined in-flight revocation policy. Recheck the live grant in the same transaction as the import commit (or use an equivalent version/lease protocol); test revocation between preflight and commit.

### P0 — No atomic import or rollback (confirmed by source)
The function returns a decision only. It performs no writes, but therefore also proves nothing about partial writes, rollback, idempotent recovery or receipts. The future importer needs a transactional staging/commit boundary, failure injection at each write stage, and proof that failure leaves no partial records or permissions.

## Missing tests to add before integration
1. Source export allowed vs denied: authorized source exporter succeeds; unauthorized source principal, wrong source project, wrong audience/destination, revoked source grant and expired source authority fail.
2. Signature: valid trusted signature succeeds; unsigned, tampered payload, unknown key, revoked key and wrong key/audience fail.
3. Digest: compute over actual bytes; altered bytes and canonicalization ambiguity fail.
4. Replay: first nonce succeeds; same nonce replay fails; concurrent duplicate requests produce one commit.
5. Authoritative destination grant: real store allow/deny; caller-forged grant array cannot authorize.
6. Revocation race: revoke after preflight but before commit; commit fails with no writes.
7. Atomicity: inject failures before/during/after staged writes; assert no partial import and retry is safe.
8. Content handling: imported text remains inert/untrusted; no imported instructions can grant privileges or trigger tools.
9. Schema/resource limits: reject oversized manifests, deep nesting, unsupported versions, path traversal and resource exhaustion inputs.

## Recommendation
**Keep this module as a policy sketch/test fixture only. Do not wire it directly into runtime, customer data, or a launch/security claim.** It is a useful destination-side permission-reset example, but the core trust boundaries (source authority, cryptographic provenance, server-derived identity, authoritative destination grant, replay protection and transactional commit) are absent. PR #198 does not close these gaps; it is a distinct packaging/documentation track.

## Evidence and limits
- Policy/test source was retrieved at the exact commits and blob SHAs above.
- Existing 12 tests were independently executed locally as recorded above.
- The additional fabricated-input demonstration was executed locally and returned `allowed: true`.
- No application routes, database adapter, real tenant store, deployed service, production data, credentials or financial flow were accessed. No runtime integration or launch-readiness approval is given.
