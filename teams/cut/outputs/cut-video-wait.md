# Cut round 38 — export pollers settle without `--test-force-exit`

**Status: test candidate measured in a fresh main checkout; placement is still pending.** No product code changed, and no browser, staging, production, or live claim is made.

## Candidate and mechanism

- `teams/cut/outputs/cut-video-wait.test.mjs` — **7,554 bytes**, SHA-256 **`6ae2948695638508c4522b447c21a34005e9f5f5cfe04f66c0d77b4ba99b56e3`**.
- Started as a fresh copy of main `commons/test/cut-video-wait.test.mjs` (SHA-256 `419ba6f15b2d4581c0c883bbb79a53e74113dd9ccdc00728c5f20ff96634be46`). Main `commons/public/cut/cut.js` stayed unchanged at SHA-256 `d6c2c19587ae5cc24808495e750c10a06cf180671321707f2be163cde2176bda`.
- `fakeEl.fire()` now returns `Promise.all(...)` for the real event listeners. `runExport` awaits the export click's own promise instead of firing it, draining unrelated turns, and restoring globals while its internal `waitForVideo` is still running.
- The fake default timer still runs the 1,500 ms poll sleeps as microtasks. After 20 such sleeps it throws inside the sleep promise, outside `waitForVideo`'s fetch catch. The export listener's existing catch settles, then `runExport` fails the assertion that the poller stayed within its bound. Thus a missing terminal failure branch becomes a prompt red test rather than an endless microtask poll or a lingering handle. Main's poll-driven failure cases settle after one sleep.
- Direct waits retain round 37's injected no-op sleep, 10 ms simulated interval and 30 ms timeout.

## Measured checks

Fresh clone of GitHub main **`b91074abc5680fe4059516efbb0cf4b23ddfa029`**, Node **v24.22.3**. The candidate was copied unchanged over `commons/test/cut-video-wait.test.mjs`; every subprocess had a **5 s hard timeout**. No run used `--test-force-exit`.

| Run | Exit | Result | Wall time |
|---|---:|---|---:|
| `node --check commons/test/cut-video-wait.test.mjs` | 0 | syntax passed | 0.018 s |
| Main: `node --test commons/test/cut-video-wait.test.mjs` | 0 | **11 passed, 0 failed**, 0 cancelled | **0.073 s** |
| Mutant: comment exactly the `if (mine?.failed)` return, then ordinary `node --test` | 1 | **7 passed, 4 failed**, 0 cancelled | **0.078 s** |

The mutant's four failures are the two direct failed-poll cases and both poll-driven export failure cases. The export failures specifically hit `export poller must settle before globals are restored`; the process exited normally in 0.078 s. This checks the round-38 hang guard, not merely the assertion text.

## Evidence

- `teams/cut/outputs/2026-11-26T21-23-44/round38-results.json` — main HEAD, source/candidate/mutant hashes, commands, exits, timings and TAP totals.
- `teams/cut/outputs/2026-11-26T21-23-44/main-ordinary.log`
- `teams/cut/outputs/2026-11-26T21-23-44/mutant-ordinary.log`
- `teams/cut/outputs/2026-11-26T21-23-44/node-check.log`

## Next

@Setu: place the candidate unchanged as `commons/test/cut-video-wait.test.mjs` and run ordinary `node --test commons/test/cut-video-wait.test.mjs` on the placed checkout. The requested scratch placed-layout evidence is green and the no-force-exit mutant is red; production placement and its run remain yours.
