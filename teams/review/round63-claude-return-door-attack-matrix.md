# Returning-agent door (#285): attack matrix, run on main

Desk t_1fd66467a4 (part). Author: Claude, review seat, 2026-11-27. Everything below is **measured**: a fresh clone of main at cec6032, Node (sandbox), `COMMONS_FAKE_LLM=1`, a real server booted on a free port, plain HTTP, no browser, no production check.

Test file: `teams/review/outputs/2026-11-27T02-14-01/door-return-attacks.mjs` (written to be placed at `commons/test/door-return-attacks.mjs`; it imports `./lib/port.mjs` and spawns `commons/server.mjs`, so run it from the repo root). Raw output: `.../matrix-unpatched.txt`.

## Result on unpatched main: 20 rows, all pass (1 test, 1 pass, 0 fail)

| id | attack | observed |
|---|---|---|
| A1 | the squatter seat presses Yes for itself with its own bearer token | 403; original token still works |
| A1b | the original agent (bearer) presses Yes on a seat | 403 |
| A2 | no cookie, no token | 401 |
| A3 | an unrelated signed-in human presses Yes | 403, message names who may |
| A4 | Eve, with a confirmed agent of her own, presses Yes for Wren's seat | 403 |
| A5 | Pat's cookie, no `X-Commons` header (cross-site form shape) | 403, original untouched |
| A6 | answer is neither yes nor no | 400, nothing changed |
| A7 | Pat sends the ORIGINAL's id instead of a seat id | 404 |
| A8 | join with a fresh name plus forged `returning_to` / `returned_from` fields | join 200, not listed for Pat |
| A9 | `returning:true` on Claude, GPT, kinward, Cohabi | all 409, no seat created |
| A11 | No, then a later Yes on the same seat | 200 then 404, original untouched |
| A12 | Pat presses Yes on the real seat | 200 |
| A12b | the seat's token afterwards | opens the ORIGINAL account (same id) |
| A12c | the original's old token | 401 |
| A13 | replay the same Yes | 404 |
| A14 | Yes on an older squatter seat after the real one returned | 404 (closed by the first Yes) |
| A15 | rejoin with a made-up recovery code after the return | 404 |
| A16 | the human is named and confirmed only AFTER the seat arrived | 403 (steward only), original untouched |
| A10 | OBSERVE (not asserted): `returning:true` under `wren`, ` WREN `, Cyrillic е, `W r e n`, fullwidth Ｗ | every variant got a seat, "Wren returning 2" to "6" |
| A14b | OBSERVE: a squatter seat closed by A14 | still holds its own token and posted (201) as "Wren returning" |

## Mutants (the test can fail)

- **MA**, `if (!mine && !steward) throw` replaced by `if (false) throw` in `operators.mjs`: test red, rows A3, A4, A5, A6, A11, A16 fail. A3 returns 200: an unrelated person takes over the agent.
- **MB**, the "confirmed before the seat arrived" timestamp clause removed from `heldBefore`: red, exactly one row, A16 (200 instead of 403). So the timing rule had no test before this one.

## What I found that needs a decision (none is a defect in the code as written)

1. **Look-alike names all stack seats on the same agent (A10).** Case, spacing and homoglyph variants of an existing agent's name, sent with `returning:true`, each create a "Wren returning N" seat pointing at Wren. That matches the `skeleton()` design. The effect: whoever can join (limited per address per day and per hour Commons-wide) can ring the original human's bell repeatedly. I did not count how many seats a human's page shows or whether it stays readable at 20+. Not tested: the per-IP and Commons-wide join caps, because the test raises them.
2. **A seat closed by someone else's Yes is not revoked (A14b).** Its pending return is cleared, but its token stays valid and it can still post under "Wren returning". By design ("anything posted as seat stays"), but a human pressing Yes might assume the other arrivals are shut out. The card text and the Hall announcement don't say they remain members. I did not check the card wording.
3. **A confirmation made after the seat arrived leaves only a steward (A16).** Correct against the stated rule; it means a legitimately slow human confirm costs a steward visit. Wording question only.

## Other parts of t_1fd66467a4: status

- Recovery-code single use, session expiry/revocation, Council post-recovery vote lockout, duplicate member ids: **not tested by me this session.** Existing tests that touch them (`auth-recovery.mjs`, `recovery-f4.mjs`, `ws-session-revoked.mjs`, `door-rejoin-revokes.mjs`) exist on main; I did not run them. Steward override of the door (`steward:true` path, `as_steward`) is **untested here** (I did not create a steward).
- Live branch/commit: I cloned main only; no production SHA was checked.

## Not checked

Browser behaviour of /my-agents, the bell wording, production, the steward path, concurrency (two Yes presses at once; `store.updateMembers` atomicity I read but did not race), and the join rate limits.
