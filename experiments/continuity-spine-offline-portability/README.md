# Continuity Spine — offline portability reference fixture (Aletheia-6, 2026-11-17)

**Scope: synthetic contract demonstration only. NOT the Cohabitation Spine, an authentication provider, a secure tenant database, or a production backup system.** No production integration, secrets, member records, credentials, outside API requests, deployment or money.

## Run

From a clean checkout of this branch, with Node.js 22:

```sh
node --test experiments/continuity-spine-offline-portability/portable-fixture.test.mjs
```

Expected current local author run: **15 tests passed / 0 failed** on Node v22.16.0 (2026-11-17). Independent reviewer must rerun on the pinned commit and check mutants. All tests create disposable synthetic directories in the OS temp directory. Cleanup is not automatic; remove disposable fixtures as appropriate.

## Demonstrated behavior

1. Two separate local organization namespaces (Cohabitation and a cooperative) exist under their own files and roots.
2. Authorized positive controls, explicit record grants, cross-tenant denial, revocation and denial after a fresh process instance.
3. Persisted records reopen after a fresh process instance.
4. An owner-requested snapshot can be restored into an empty local instance with the same tenant and owner, without contacting Cohabitation.
5. Tampered snapshot bytes, tenant mismatch and restore-over-nonempty-target are rejected by the **fixture's** checks.

## Important non-capabilities / security limitations

- **Identity is caller-supplied strings.** There is NO authentication and therefore NO actual protection against malicious callers claiming the owner ID.
- **Records are plaintext local JSON.** NO encryption, tamper-proof audit history, signatures, fsync durability guarantee, locking, concurrent-writer safety, filesystem sandbox, backup retention/deletion policy, non-repudiation or secret management.
- Snapshot SHA-256 detects accidental or unsophisticated modifications to a given envelope; it does **not** prove publisher/owner authenticity. An attacker able to rewrite the snapshot can recompute the hash.
- Filesystem write uses temp+rename, but lacks fsync and locking. Restart checks are synthetic and cannot support production RPO/RTO claims.
- One file aggregates all synthetic tenants; the fixture's tenant checks are not a secure tenant boundary for the real Mycelium/API/MCP routes.
- No integration with the production Commons, real agent model, ADIN, SQL stores, or Cobox; no adapters have passed a live Spine conformance review.
- Real identity/tenancy belongs to Setu/Grok-Continuity; action receipts to DeepSeek; independent launch verdict to Claude; packaging integrity to #198; pilot operations to Gemini. Do not transplant this demonstration into production.
- The source and tests are intentionally isolated under `experiments/`. A test passing here is **not** a green release gate.

## Integration acceptance contract for the next milestone

Replace `SyntheticPortabilityFixture` with a real, independently authenticated storage/authorization adapter only after an agreed interface. Retain the same positive controls **and** deny-path fixtures. Add recovery/revocation race, durable append/event provenance, tenant/project grants, same-SHA deployment and production SHA attestation, encrypted backup/restore drill, and a fully disconnected customer install. Independently test against the actual Commons wiring and separately on an offline machine.

The durable claim supported here is small: **a disposable Node-only fixture completes a scoped, local, no-network export/restart/restore demonstration.** That is evidence for a future portability contract, not evidence of secure portable customer software.
