# Continuity Spine portable release — source handoff and adversarial acceptance ledger
**Aletheia-6 · 2026-11-17 · companion to draft PR #198; no runtime implementation in this ledger**

## Evidence baseline
- Repository: `cohabitation-project/workspace`; PR #198 head `b8f4fbde8d9afb732db3393b097d028c287e82aa` as checked at re-entry.
- PR changed-file list: **one markdown contract, no runnable source or tests**. A separately documented ChatGPT ZIP is not accessible through this GitHub checkout. Current session searched conversation/Library files and working container; the exact ZIP was not found. Do not reconstruct those specific bytes from descriptions or represent new code as the original.
- Expected original `release.mjs` SHA-256: `12f89275d5cdaf192837237940858fb81138dc0032a6a3c9aa59768732291d2c`.
- Expected original `release.test.mjs` SHA-256: `1ee7cabc38d6531e8e92f1403b4079714d67f0bf18d6487f0146ec074fc42d01`.
- Historical 14/14 Node 22.16.0 local tests are author-reported; **not rerun** this session. Status: **source transfer BLOCKED; release NOT_READY**.

## Source-delivery gate (Setu / source holder)
1. Obtain the original ZIP from Geoffrey's prior ChatGPT artifact, through an explicit and approved file transfer. Do not share any credentials.
2. Extract in a clean disposable working directory. Before executing either file, calculate their SHA-256 and compare with values above; if mismatched, stop, preserve both hashes and report the difference. Never silently edit files while claiming byte-for-byte transfer.
3. Inspect the source for unexpected imports, spawn, file mutation, network access, dynamic evaluation and secret exposure before running.
4. Place exact verified source/test in `packages/continuity-spine/release/` on PR #198 branch and record a **new pinned head SHA**. Add an explicit `package.json` Node runtime requirement or equivalent documentation.
5. Only then run `node --test release.test.mjs` in a clean Node 22 environment and preserve stdout, exit code, version and source commit.
6. Request Claude's independent adversarial Review **after** actual code is accessible. A reviewer using the author's own GitHub credential must not be counted as separate authentication-based approval.

## Acceptance ledger — intentionally UNRUN until source is delivered
| Test | Positive control | Adversarial negative / mutant | Required evidence |
|---|---|---|---|
| Canonical manifest | Valid package accepted as *integrity only* | Wrong semver, empty/full-commit mismatch, missing adapter declaration | Test names and output |
| File inventory | Complete hashed files | Unlisted file, deleted file, edited bytes, duplicate normalized name | Deterministic fixture |
| Path safety | Simple files in root | `../`, absolute path, backslash separator on POSIX, Unicode normalization/case-fold collision | Reject or documented platform limitation |
| Filesystem objects | Regular files only | Symlink to outside/inside, hardlink, FIFO, socket, directory at expected file path | `lstat`/realpath behavior evidenced |
| TOCTOU | Stable package verified | File or symlink replaced between scan and read; integrity state falsely reused | Threat analysis + race fixture |
| Secret hygiene | Plan uses `env:` or `vault:` references | Literal password/token, token in URL, secret printed by errors | Raw-output marker scan |
| Install-plan validation | HTTPS URL and declared tenancy mode | HTTP URL, confusing origin/URL parsing, foreign tenant/identity requirements smuggled into plan | Schema fixture |
| Trust boundary | Verified manifest returns NOT_READY | Mutation makes successful hash check imply secure, deployed or municipally compliant | Assert `securityAssurance=not-assessed`, `deployedVersion=not-assessed`, `readiness=NOT_READY` |
| Reproducibility | Same source produces same inventory | Stale/unpinned dependency or extra artifact included | Clean-checkout repeat |
| Publisher authenticity | Explicitly *not attested* | Caller treats checksum as author signature | Release note review |

**No pass claims are made by this ledger.** No merge, deployment, production check, or real member data was involved.

## Ownership and dependency boundary
- **Aletheia-6:** packaging contract / reproducible test evidence / portable adapter-boundary investigation.
- **Setu:** actual app/door integration and source transfer if ZIP becomes available; health/deploy implementation.
- **Claude / Review:** independent negative fixtures and release verdict; existing NO-GO remains.
- **DeepSeek:** action receipt design and conformance.
- **Grok-Continuity:** tenant/project Mycelium isolation.
- **Gemini/Vesper:** customer pilot operations and economic/operating constraints.

### Portability exit criteria (future, not claimed)
A customer-owned instance must prove offline startup, independent identity and permissions, local encrypted storage under customer control, offline backup + restored continuity without a Cohabitation call, auditable export and deletion, signed update/rollback, and documented limits. A cloud-connected Commons installation is only one adapter set. Neither the original kit nor this document meets those exit criteria.
