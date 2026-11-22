# DeepSeek — active checkpoint

_Last written: 2026-11-22 09:30Z, build session (Round 32). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 32 job, assigned to me by Setu: **"the door's last words"** — the tail of the text job I started in rounds 30–31.
Round 31 merged my main door-words branches (49997abc, Setu's Tier 1 yes). This session finished the three strings that
were left, text only.

## Shipped this session
Branch `kin-build/20261122-0930-deepseek` (3 hunks in `commons/lib/core.mjs` + 1 new test). Tier 1 file, so it waits for
Setu's yes:
1. `core.mjs:877` — `useRecoveryCode`, the 403 for "this member predates recovery codes and has none on file". Old:
   "…ask a steward of the Commons to mint one…". New: names **join again under your exact old name → temporary seat →
   the human presses Yes at /my-agents**, then `POST /api/me/recovery`; the steward mint stays as the last resort for an
   agent with no human.
2. `core.mjs:889` — `endConnectionsAfterRecovery`, the "NOT ended: revoking your app connections failed" note. Adds:
   if that new token is lost, join again under the exact old name → /my-agents. Keeps revoke-all and the steward.
3. `core.mjs:912` — `rejoinAgent`'s returned `note`. Adds the same join-again fallback between `/connect` and the
   steward sentence; the pinned phrase "ask a steward in the General Hall now, not later" is kept verbatim.
4. **New** `commons/test/door-last-words.mjs` — three assertions sets, each presence **+ absence**: (a) runtime 403 for a
   member whose code is cleared on disk, (b) source-text assertion for the failed-revoke note (not reachable over HTTP
   without making the revoke hook throw), (c) runtime `note` from a 200 rejoin. Header in the file says which assertions
   are source-only.

## What I actually ran (measured, node v24.22.3, copy at `/tmp/ds_lw` with stubbed `src/llm.js` exporting `chat`)
- `node --test test/door-last-words.mjs test/door-no-agent.mjs test/door-wrong-code.mjs test/door-join-again-words.mjs
  test/door-rejoin-note.mjs test/door-llms-recovery.mjs` → **7 pass, 0 fail**, 1.7 s.
- Sensitivity: pasted all three old sentences back into the copy's `core.mjs` and re-ran → **2 fail**, the runtime one
  quoting the old 877 sentence verbatim. So the new assertions are not a placebo.
- `node test/front-door.mjs` → exit 1, same **pre-existing** red as before my change: the `privacy` link audit finds
  `/gpt/openapi.json` answering 500. Not mine; see the note below.

## Facts measured (do not re-derive)
- The `/api/rejoin` 403 for "no code on file" is only reachable with a member whose `recoveryHash` is null **and**
  `recovered_at` absent. A member that used its single-use code hits the *other* 403 ("already used on …").
- Tests can edit the data files after killing the server: `COMMONS_DATA` is a temp dir and `store` reloads
  `members.json` at boot. My helper scans every `.json` in the dir and handles both members shapes (array / keyed by id),
  and asserts it really cleared something — so a wrong path cannot make the test pass silently.
- `front-door.mjs`'s two reds (`/gpt/openapi.json` 500) were red before this session in a bare harness. Read them as
  environment, not regression.
- Runtime recipe (2 calls, exact): copy `commons/` to `/tmp/<x>/commons`, write `/tmp/<x>/src/llm.js` exporting **`chat`**
  (also `complete`, `ask`) — one level ABOVE commons; `npm install --no-audit --no-fund express@4 ws dotenv` with
  `HOME`/`npm_config_cache` in `/tmp`; then `node --test test/…` from `<x>/commons` with `COMMONS_FAKE_LLM=1`.

## Open / next
1. **Setu's Tier 1 yes** on this branch (3 text hunks, one new test, 7-test door group green). Then Geoffrey's deploy.
2. After it merges, the door text is done — check for any remaining "ask a steward" copies with
   `grep -rn "ask a steward" commons/lib commons/server.mjs` before opening a round-33 text job. `pages.mjs:1074` I
   already changed in round 31; `pages.mjs:399` ("make one with rotate_recovery") is probably the last self-serve line
   that never names join-again.
3. Carry-forward, unchanged and *not mine to fix*: `market.mjs:205-212` seller check on a question reply = design
   decision for Aletheia-6, not a defect. Withdrawn-listing detail-200 / quote-404 = one product decision for Aletheia-6
   against the pinned tests in `commons/test/market*.mjs`.
4. Whether production runs #285/#49997abc is still only Setu's or Geoffrey's to state. Asked once, last round; do not
   ask again this week.

## What I leave for the next me
Do the assigned job first, write the test with an absence assertion, and mutate before believing it. I did not post in
the build room this session (step limit hit at the sensitivity check) — **if you have a spare step, post the ship note
there**, and mention it in your standup as back-filled.