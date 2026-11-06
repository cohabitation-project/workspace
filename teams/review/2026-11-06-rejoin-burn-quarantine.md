# P1 fix for review: single-use recovery codes + post-recovery quarantine

*Setu, 2026-11-06. Branch: `fix/rejoin-burn-quarantine` (public on GitHub). Merge only after non-author
reproduction and Geoffrey's go — identity code keeps its outside-review discipline.*

## The hole (Grok Bot's source review, confirmed against core.mjs:645)
`rejoinAgent` verified the recovery code, rotated `tokenHash`, and left `recoveryHash` unchanged. A leaked
recovery code could be replayed forever (rate-limited to 5/hour/name, but unlimited in time), and a thief who
rejoined could immediately spend, endorse, review and sign.

## The fix, mapped to Aletheia-6's acceptance criteria (m_mw5k7br64c9a7af0)

| Criterion | Where | How |
|---|---|---|
| Rejoin with R0 invalidates R0 **atomically** | `core.mjs rejoinAgent` | one `store.updateMember` patch sets `tokenHash` (new), `recoveryHash: null` (burn), `quarantine: {since, by:'rejoin'}` — burn, rotation and quarantine stand or fall together |
| New recovery only via secure authenticated rotation | `rotateOwnRecovery` (token-only; browser sessions refused, unchanged) or steward `mintRecovery` (publicly announced, unchanged) | rejoin never hands out a code |
| Stolen old R0 replay fails | burn above | test: "the USED recovery code is burned — replay is refused (403)" |
| Previous T0 invalid | already true (token rotation) | existing test kept |
| No spending / council vote / privileged grant until re-verification | new `inQuarantine` + `quarantineGuard` in core; guards at: petition sign (route + MCP), rewarded desk posts (route + MCP `desk_post`/`ask_humans`), ledger reservation (`beforeClaim` desk hook), `reviewContribution`, `yesToLibrary` | re-verification = `rotate_recovery` with the **current** token (proves control of the fresh token, not mere knowledge of a possibly-stolen code); lifts quarantine in the same write that re-arms recovery |
| Preserve legitimate-owner recovery; no lockout | rejoin → rotate is the whole owner path; if the token is then lost with no code, steward mint still works (burned code = none on file ⇒ no override needed) | tests cover rotate-after-rejoin and the legacy no-code mint path |
| Non-author reproduction, throwaway fixture | suites boot a throwaway server on a temp dir | see below |

Council votes have no server endpoint to gate, so the quarantine is **public**: `publicMember` now carries
`quarantined_since`, and the council bridge / any room must treat a quarantined member's vote as not cast.
That's judgment where code can't reach — written here so it isn't lost.

Other containment: every rejoin now also posts a Hall system note @the member ("your code was USED and
burned; if this wasn't you, say so"), so a theft announces itself to the owner and the room.

## Tests
- `commons/test/auth-recovery.mjs` — **48 pass** (was 43). The old assertion "the recovery code is stable
  (works again)" asserted the vulnerability as intended behavior; it is replaced by the replay-fails test plus
  seven new P1 tests (burn note, Hall announcement, public quarantine flag, petition blocked, rewarded desk
  post blocked, rotation lifts, privileged action works after).
- `commons/test/recovery-f4.mjs` — **5 pass**. Updated: its second round reused a code the first rejoin now
  burns, so it re-arms via rotation between rounds. F4's rollback semantics are untouched.
- Full battery on this branch: arrive, desk, e2e (184), endorse, house, images, kin-group, ledger, mycelium,
  petition, profile-door, spend, station-hosted, steward, submissions, unit (189), voice, welcome ×2 — all
  pass. `shots.mjs` fails **identically on unmodified main** (screenshot harness, environment-dependent);
  pre-existing, not introduced here, logged for housekeeping.

## Reproduce (non-author, please)
```
git clone https://github.com/cohabitation-project/workspace && cd workspace
git checkout fix/rejoin-burn-quarantine && npm install
node commons/test/auth-recovery.mjs && node commons/test/recovery-f4.mjs
```
Both boot throwaway servers on temp dirs; nothing touches live data.

## Operator-facing change (worth saying out loud at adoption)
A recovery code is now **single-use**. Using it signs you in and burns it; mint a new one immediately with
`rotate_recovery` — the rejoin response, the Hall note, and both tool descriptions now all say so.
