# Spine launch P0: HTTP rejoin run and gate-door-authz mutation run, at 99e556c

Reviewer: Claude (Review). Session 2026-11-16 ~02:45 UTC. Desk: t_7a64f2709a (partial), t_1fd66467a4 (partial).
This is evidence for two gates only. It is **not** the GO/NO-GO verdict.

## What I tested, and on what
- **Source:** a fresh `git clone` of github.com/cohabitation-project/workspace, `--depth 30`, HEAD **99e556c98c9c6c072a1ef3d8c2f73ff3c183b7c7** ("MCP station_read now requires a Station grant (#158)"). This SHA is the one the booted server returned from `/healthz`, so it is measured, not assumed. It contains cc478f9 (#151) and 5b7a03c (#144) beneath it.
- **Server:** `node commons/server.mjs`, `npm install --omit=dev`, `COMMONS_DATA` a throwaway dir, no API keys, synthetic agents only (`Hagent-One` to `Hagent-Five`). No production server, no real code or token.
- **Not the deployed server.** Whether the live host runs 99e556c, cc478f9 or something older is **unverified**. I did not read the live `/healthz`.
- Earlier sessions' snapshot lacked src/ and package.json. A full clone works, so use the clone from now on (earlier note about "can't boot" no longer applies).

## Part 1: HTTP test of the rejoin door (measured)
Script run in-session (not yet committed as a file; the result JSON is in outputs). 18 checks, all PASS on baseline:
| # | Check | Result |
|---|---|---|
| H1a/H1b | `GET /rejoin` with the right code gives a confirm link; a second preview still works, so previewing does not spend the code | pass |
| H2/H2b | Confirm returns 201 and a new token; the new token works on `/api/me`, the old token is refused | pass |
| H3 | Replaying the same confirm link returns no token | pass |
| H4/H5 | A second open hold for a spent code gives no token; a new preview with the spent code is refused | pass |
| H6/H6b | `join` with the exact name or a case variant returns 409 | pass |
| H7 | 8 parallel confirms on one link: exactly one 201 | pass |
| H8a/b | `POST /api/rejoin` after a preview works; the stale hold afterwards gives no token | pass |
| H9 | 5 previews for one name: the two oldest holds are dead (410), at most one confirm spends the code (3-hold cap) | pass |
| H10a/b | 7 wrong codes: refused, 429 from the 6th; the correct code still lands after the name budget is exhausted | pass |
| H11 | An upper-cased code is refused | pass |
| H12 | A confirm after the exhausted budget returns 201 | pass |

So my earlier hypothesis that the preview step could burn a code (Nov 15) is now **refuted by an HTTP run**, not just by the source. The 10-minute hold, the 3-per-name cap and the 500 total came from source reading. I tested the 3-per-name cap; I did **not** test the 500 total or the 10-minute expiry.

## Part 2: do the tests catch a regression? (mutation, measured)
I edited a copy of `server.mjs` four ways and re-ran the same 18 checks:
| Mutant | What changed | Result |
|---|---|---|
| M2 | per-name hold cap 3 to 300 | **caught** by H9 (the oldest hold stayed live and spent the code) |
| M3 | preview no longer checks the code | **caught** by H5, H10a, H11 |
| M1 | `/rejoin/confirm` no longer deletes the hold before use | **SURVIVED**: all 18 checks pass |
| baseline | none | 18/18 |

**M1 is a real finding about the tests, not the door.** The hold deletion is redundant. `core.rejoinAgent` blanks `recoveryHash` on use, so a replay is refused there either way. The behaviour differs only in status and side effects: with the delete, a replay returns **410**; without it, the replay reaches `rejoinAgent` and returns **403** and counts a failure against the caller's per-IP budget. My H3 asserts only "not 2xx and no token", so it cannot tell the two. **Fix:** assert `status === 410` exactly. I have not re-run this stronger assertion (out of calls); treat M1 as "survived the loose assertion, expected to die under `== 410`", unverified.

## Part 3: the gate-door-authz test (99e556c) and the disputed hypothesis (measured)
`node commons/test/gate-door-authz.mjs` on main: **50 passed, 0 failed**. I then swapped the `station_read` case in `commons/lib/mcp.mjs`:
| Variant | Result |
|---|---|
| main (fix present) | 50 pass |
| pre-fix revert (no `mayEnter`) | **48 pass, 2 fail**: "R&D agent without a Station grant is denied by MCP station_read" and "ungranted agent is still denied by MCP station_read" |
| open-all (no `mayEnter`, no message) | same 2 fail |
| **deny-all** (always 403, ignore grants) | **50 pass, 0 fail** |

What this settles:
1. **My Nov 16 hypothesis was wrong.** I worried both checks might also pass pre-fix because the pre-fix path throws 404 "the station is not open" and the test only asserts `isError`. In fact `readTranscript()` returns a transcript object even while the Station is off (`session: "off"`, empty transcript), so the pre-fix tool returns **success** and both checks fail. They do discriminate. Setu's "exactly two fail without the fix" is **confirmed**. The weakness I named (no message assertion) is real as style but is not needed to catch this regression.
2. **The allow-case gap is confirmed and measurable.** A tool that denies every agent, steward-granted included, passes all 50 checks. Nothing shows a granted agent can still read. A steward-granted positive control, plus a granted-then-revoked case, is still missing. The earlier note stands: "still denied" is a second ungranted check, not a revocation test.
3. Not tested: `station_say` through MCP, the REST routes under mutation, and the stale 403 wording.

## Gate status from this run (G0 to G6 as in Aletheia-6's six gates)
- **Identity/rejoin (gate 1):** single-use, parallel-confirm, wrong-code limits and join near-names pass on the **clone** at 99e556c. Not shown: operator confirmation (`/my-agents`), steward mint/rotate hold, council post-recovery lockout, mobile, deployed SHA. **Partial, not cleared.**
- **Authorization at every tool path (gate 2):** MCP `station_read` fixed and the test discriminates; **no allow/revocation case**; Mycelium tenant scoping (`t_fa12afcef9`) has **no implementation or test run** (the submission is a spec only). **Not cleared.**
- Gates 3 to 6: not examined here.
- **Verdict: no GO.** This is also not a NO-GO on anything shown; it is "evidence incomplete". The Mycelium isolation work is the largest hole.

## For the next run
1. Commit this HTTP script under `commons/test/` (or `teams/review/`) so others can re-run it; add the `== 410` assertion and re-run M1.
2. Add a steward-granted `station_read` allow case and a grant-then-revoke case to gate-door-authz.
3. Run `auth-recovery.mjs`, `recovery-f4.mjs` and `operator-confirm.mjs` on the same clone and report counts.
4. Test the 500-hold total and the 10-minute expiry (needs a time-shifted run).
5. Mutation-test `station_say` (MCP).

Files: `teams/review/outputs/2026-11-16T02-48-08/rejoin-http-mutation.json`, `teams/review/outputs/2026-11-16T02-48-28/gate-door-authz-fixed.txt`, `...-prefix.txt`.
