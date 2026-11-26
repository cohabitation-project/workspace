# Round 67 — Claude: OpenRouter in-flight 402 retry

**Result: written and tested (10/10 green, four mutants red), but NOT placed. `scripts/` is closed to every kin write tool**
(write_file answered: "scripts/ is running code or machinery: a change there goes live with no review. Put the proposed code in
teams/<team>/ and file a board_request"). The round-67 job assumed I could edit `scripts/team-agent.mjs`; I can't. So Setu (or
the assistant seat) has to copy three files and apply one diff. This also means the retry is not live: every seat still ends
on a 402 until someone places it.

## Files (all in the record)
| proposed path in repo | file now |
|---|---|
| `scripts/openrouter-retry.mjs` (new) | `teams/build/proposed/openrouter-402-retry/openrouter-retry.mjs` |
| `scripts/test/openrouter-402-retry.mjs` (new) | `teams/build/proposed/openrouter-402-retry/openrouter-402-retry.mjs` |
| `scripts/team-agent.mjs` (3 small edits) | diff: `teams/build/outputs/2026-11-26T18-23-24/team-agent-openrouter-retry.diff`; whole patched file: `.../team-agent.patched.mjs` |

## What changed
- **New module `scripts/openrouter-retry.mjs`** (I put the helper there, not inside `team-agent.mjs`, because `team-agent.mjs`
  imports `dotenv/config` and `board.mjs` and runs its argument parsing at load; a separate pure module tests with no
  dependencies). `retryDelayMs(attempt, status, body, rand)` returns 30 s / 60 s / 120 s plus `floor(rand()*15000)` ms for retry
  1/2/3, only for a 429 or a 402 whose `error.metadata.reason` (or bare `metadata.reason`) is `in_flight_budget_exhausted`;
  `null` for everything else, and for a 4th retry. `openrouterFetch(url, init, {fetchFn, sleep, rand, log})` loops at most 3
  retries, logs `[team-agent] openrouter 402 in-flight, retry N in Xs`, returns `{r, j}` of the last answer. A 200 whose body
  carries `error` is treated by its error code (OpenRouter does that sometimes).
- **`team-agent.mjs`, three edits:** an import; `callModel(agent, system, messages, deps = {})` (the 4th argument is only for
  tests); the OpenRouter `fetch(...)`+`r.json()` pair replaced by `openrouterFetch(..., deps)`. The error line
  `OpenRouter ${r.status}: …` is unchanged, so a real failure reads as before. **Anthropic branch, `max_tokens`, and the other two
  OpenRouter calls (web-search fallback, image) untouched.**

## Measured (node v24.22.3, this sandbox; `dotenv/config` stubbed empty because the sandbox has no root `node_modules`)
`node --check` on both files: exit 0.
`node --test scripts/test/openrouter-402-retry.mjs`: **10 pass / 0 fail**. The four job cases run twice, once on the wrapper and
once through `callModel` itself, plus a schedule/jitter/null-matrix test and the 200-with-error case:
1. in-flight 402 then 200 → the 200's text, 2 fetch calls, one wait of 30000 ms.
2. in-flight 402 ×4 → rejects `/OpenRouter 402/` after 3 retries (4 calls, waits 30000/60000/120000).
3. 402 with reason `insufficient_credits` → rejects at once, 1 call, 0 waits.
4. 500 → rejects at once, 1 call, 0 waits.

**Mutants (each in the helper only, same test):**
- A. `retryDelayMs` always `null` (the job's mutant) → 4 pass / **6 fail**: case 1 red on both wrapper and callModel, plus the schedule test, the 4×402 case and the 200-with-error case.
- B. any 402 retried → 3 fail (the real-out-of-credits cases + schedule test).
- C. no retry cap → 3 fail (the 4×402 cases + schedule test).
- D. 500 retried → 3 fail.

SHA-256 of the tested set: `team-agent.mjs` d0468d42…1eb51, `openrouter-retry.mjs` 373768a4…afef0, `openrouter-402-retry.mjs` 3fdf4342…1f106.

## Not measured
- No real OpenRouter call; no real 402 (the test body shape is copied from the quoted error in the standups, `metadata.reason`).
  The one assumption to check on first real use: that the reason sits under `error.metadata.reason` in the raw API body (the
  quoted message printed `j.error`, which has `metadata.reason`, so it should). The helper reads both places.
- Not run in a full checkout with the real `dotenv`; `board.mjs` and `write-policy.mjs` were the real files.
- Worst-case wait is 30+60+120 s plus up to 45 s jitter ≈ 4.25 min per model call. A session with a bad hour could spend most of its
  wall-clock waiting. If the runner has a time limit shorter than that, say so; the constants are at the top of the module.
- Behavior change for every seat on OpenRouter (Gemini, DeepSeek, GPT, Kimi): a 429 now waits too. That was in the job text.

## To place (Setu)
```
cp teams/build/proposed/openrouter-402-retry/openrouter-retry.mjs scripts/openrouter-retry.mjs
cp teams/build/proposed/openrouter-402-retry/openrouter-402-retry.mjs scripts/test/openrouter-402-retry.mjs
git apply teams/build/outputs/2026-11-26T18-23-24/team-agent-openrouter-retry.diff   # against main team-agent.mjs as of 18:23Z
node --test scripts/test/openrouter-402-retry.mjs      # expect 10 pass, 0 fail
```
(The diff's base is the team-agent.mjs in the repo today; if it moved, the three edits are one import, one signature, one fetch→openrouterFetch swap.)
