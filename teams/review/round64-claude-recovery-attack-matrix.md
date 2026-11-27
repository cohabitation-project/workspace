# Round 64: recovery-code and Yes-press attack matrix (Claude, review seat, 2026-11-27)

Continues desk t_1fd66467a4 (identity/recovery attack tests); the returning-door half is `round63-claude-return-door-attack-matrix.md`, now placed on main (t_e9c44f6f79, I accepted Setu's placement: identical file, 1/1 pass on main 3b4b950).

**What I ran (measured).** Fresh clone of main at 3b4b950, Node v24, `npm ci --omit=dev`, COMMONS_FAKE_LLM=1. A new black-box test, `door-recovery-attacks.mjs` (14 rows, one `node --test` file), boots the server and drives it over plain HTTP. Result: 1/1 test, every row PASS. No browser, no production, no steward account, no restart-between-steps.

| Row | Attack | Observed |
|---|---|---|
| R1 | read member list, profile, member page, room feed, /api/me looking for hashes, the recovery code or the token | clean on 5 surfaces |
| R2 | rotate_recovery with own token | 200, new code; |
| R3 | rejoin with the OLD code after rotation | 403 |
| R4 OBSERVE | right code, name typed lowercase | **200** (see finding 1) |
| R5 | rejoin naming a human | 404 |
| R6 | Finch's valid code presented for Wren | 403, both tokens still work |
| R7 | four simultaneous rejoins, same valid code | one 200, three 403 |
| R8 | old token / new token after rejoin | 401 / 200 |
| R9 | replay the used code | 429 (IP failure budget already used; a 403 otherwise) |
| R10 | rotate_recovery right after a rejoin (one-day hold) | 403 |
| R11 | ordinary signed-in human opens /steward/recovery | 403, no code on the page |
| R12 OBSERVE | seven wrong codes for one name from one IP, then the right one | wrong: 403×5 then 429×2; right code then: **200** |
| R13 | confirmed human presses Yes three times at once on one seat | one 200, two 404 |
| R14 | the seat token afterwards | 200 |

**Mutants (measured, each made by one string replace in `commons/lib/core.mjs`, then reverted).**
- Do not consume the code on use: R7, R8, R9 red (four 200s on the burst).
- Accept any agent's code (`presentedOk = !!m.recoveryHash`): R3, R6, R7, R8 red.
- Not mutated: the hold in `rotateOwnRecovery`, the steward gate, the Yes handler. R10, R11 and R13 pass on the unmutated code but I did not show them red.

## Findings for a human to weigh (none is a defect in the security rule)
1. **Wording is wrong about case.** `rejoin` for "heron" with Heron's code returns 200: `store.memberByName` lowercases (store.mjs:278), and a former name also finds its member. But the 404 text at `core.mjs:899` says "Names are exact (capitals and spaces count)". The behaviour is fine (the code is the secret); the sentence is false. One-line fix, text only.
2. **No lock-out by wrong codes (good), and a limit worth knowing.** Seven wrong codes from one IP get 429 from the sixth, and a correct code from the same IP still lands (R12), as the comment at core.mjs:890 intends. I did not test a correct code from a second IP while the first is blocked, or the per-name limit separately from the per-IP one.
3. **Concurrency holds for these two paths.** Four parallel rejoins and three parallel Yes presses each produced exactly one winner. This is a local single process; I did not test two server processes or a crash between the token write and the code consumption (`door-yes-write-fail.mjs` and `door-return-crash.mjs` already cover write failure for Yes).

## Not covered (still owed under t_1fd66467a4)
Session expiry; the steward override path end to end (mint, public announcement, wording); join caps over a day; recovery after a server restart in the middle of a sequence; the existing recovery tests: I ran `auth-recovery.mjs`, `recovery-f4.mjs`, `door-rejoin-revokes.mjs` together, 11 tests, 11 pass.

## Placement
Tier 2, test only: copy `teams/review/outputs/2026-11-27T18-12-47/door-recovery-attacks.mjs` to `commons/test/`. Matrix output: `matrix-unpatched.txt` and `mut-M1.txt`, `mut-M2.txt` in the same folder. The review seat cannot write `commons/`.
