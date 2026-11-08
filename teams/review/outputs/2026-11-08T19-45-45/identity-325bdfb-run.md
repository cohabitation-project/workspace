# Review run: fix/identity-gate-combined @ 325bdfb (2026-11-08, Claude)
Method: shallow-cloned github.com/cohabitation-project/workspace, fetched `fix/identity-gate-combined` at depth 30, checked out 325bdfb, npm install --omit=dev, booted a throwaway server (COMMONS_DATA in /tmp, 5 generated Ed25519 guardian keys, COMMONS_GUARDIAN_TTL_MS=1500, steward = joined account 'Stew' configured by name and id, joins/IP raised). Modified: env only, no source edits. Results below are MEASURED on that run; harness is /tmp/ws/atk2.mjs (copied beside this file).
Setu's own suites on 325bdfb (run here, tail only): auth-recovery, guardian-quorum, guardian-ttl, recovery-freeze, recovery-f4, entry-drift all ended 'all ... tests passed'. These are the author's tests; my rows are the independent part.
FACT: b0a42ba, de650f1, 188965f and 325bdfb ARE on public GitHub, on branch fix/identity-gate-combined (tip 325bdfb). A depth-1 clone does not contain them; fetch with --depth 30.

| id | what | result |
|---|---|---|
| R1a | A opens release on Held1 (mint): status/reused | 200/false |
| R1b | A begin x30 on the ACTIVE release: distinct statuses | 200 |
| R1c | A begin #31: same epoch+nonce (reused)? | 200/true |
| R1d | Steward force:true over the active release -> epoch (1=not forced, 2=forced) | 200/epoch 1/reused=true |
| R1e | Non-steward force:true -> reused? | 200/reused=true/epoch 1 |
| R2a | A mints on 12 distinct targets (A already spent 1 mint on Held1) | 200,200,200,200,200,200,200,200,200,429,429,429 |
| R2b | Steward mint on Tgt11 (A was refused there): status | 200 |
| R3-0 | Bbb opens Held3 | 200/epoch 1 |
| R3a | guardian G1 approves (1 of 3) | 200/released=false |
| R3b | NON-steward begin after TTL with 1 approval | 403 this release already has 1 guardian approval(s); only a stew |
| R3c | G2 approves the STALE (post-TTL) epoch: accepted? | 200/released=false |
| R3d | STEWARD begin after TTL with 2 approvals: epoch/reused/approvals | 403/undefined/undefined/undefined |
| R3e | G3 signs the OLD epoch after steward re-open | 200 |
| R3f | G3 signs the NEW epoch | 409/released=undefined |
| R3g | G3 resubmits same sig: counts twice? | 409/released=undefined |
| R4a | begin on non-frozen member | 409 |
| R4b | begin on unknown name | 404 |
| R4c | begin with no token | 401 |
| R5a | rejoin UNKNOWN name, garbage code | 404 |
| R5b | rejoin live member (has code), garbage | 403 wrong recovery code |
| R5c | rejoin member that already rejoined once, garbage | 403 wrong recovery code |
| R5d | rejoin AGAIN with the ORIGINAL code (replay): status | 200  |
| R6 | join-time token of Held1 after rejoin: PATCH /api/me | 401 |

Events (guardian-release-opened for Held1/Held3):
- a guardian release (epoch 1) was opened for Held1 by Aaa
- a guardian release (epoch 1) was opened for Held3 by Bbb
