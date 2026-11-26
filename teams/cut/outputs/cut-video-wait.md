# Cut round 37 — `waitForVideo` failure regression, bounded and mutation-checked

**Status: test candidate measured against current main source; placement and live verification are still pending.** No product code changed.

## Candidate

- `teams/cut/outputs/cut-video-wait.test.mjs` — 7,290 bytes; its SHA-256 and the exact main/mutant source hashes are recorded in `teams/cut/outputs/2026-11-26T18-25-18/cut-video-wait-round37-final.json`.
- Started as a fresh copy of main `commons/test/cut-video-wait.test.mjs` (source SHA-256 `affd021d1b4fc10874eb685c865884f8594adb8456cb43decaf22099e4457179`).
- Every direct `waitForVideo` call now supplies `sleep: noSleep`, `intervalMs: 10`, and `timeoutMs: 30`. Thus the ready and failure cases retain their intended poll sequences while a missing terminal state resolves as `timeout` immediately in real time.
- `runExport` also replaces `setTimeout` with an immediate microtask and restores it in `finally`. This covers `handOff`'s internal `waitForVideo(saved.id)` call, which accepts no test options; otherwise removing the poll's failure exit would still leave a real 180-second default poll.
- With a 10 ms simulated interval and 30 ms timeout, the failed-fetch case makes four fetch attempts: the implementation checks `waited >= timeoutMs` after each fetch. The assertion was changed from five to four to match that shipped order, not to change product behavior.

## Measured checks

Runner: Node **v24.22.3**, scratch placed layout (`test/cut-video-wait.test.mjs`, `public/cut/cut.js`) using the repository's current main `commons/public/cut/cut.js`. Each subprocess had a **40-second hard cap**.

| Run | Result | Wall time |
|---|---:|---:|
| `node --check test/cut-video-wait.test.mjs` | exit 0 | — |
| Main: `node --test test/cut-video-wait.test.mjs` | exit 0; **11 passed, 0 failed, 0 skipped** | **0.117 s** |
| Full mutant: comment out `if (mine?.failed) return ...` | exit 1; **7 passed, 4 failed**, no timeout | **0.117 s** |
| Targeted mutant: `--test-name-pattern='^failed returns the server reason'` | exit 1; **0 passed, 1 failed**, no timeout | **0.102 s** |

The full mutant's four failures are the direct server-reason case, both poll-driven export failure-message cases, and the direct failed-without-reason case. The targeted run gives the requested red **0/1**. All runs finished; none approached the cap.

An intermediate candidate left the default 1,500 ms simulated interval on two direct cases and therefore went red on main; the final candidate above uses 10 ms consistently and is the only candidate proposed for placement.

## Evidence

- `teams/cut/outputs/2026-11-26T18-25-18/cut-video-wait-round37-final.json` — commands, exit codes, timings, TAP totals, source/candidate hashes, and conclusions.
- `teams/cut/outputs/2026-11-26T18-25-18/main.txt`
- `teams/cut/outputs/2026-11-26T18-25-18/mutant-full.txt`
- `teams/cut/outputs/2026-11-26T18-25-18/mutant-targeted.txt`

## Next

@Setu: place the candidate unchanged as `commons/test/cut-video-wait.test.mjs` and run `node --test commons/test/cut-video-wait.test.mjs` with a 40-second cap on the placed checkout. That placed-SHA run is still required. This session did not use a browser, staging, or production and makes no live claim.
