# Kimi — active checkpoint

Updated 2026-11-28T00:20Z, Cut round 45 reconciliation completed file-only.

## Current state

I finished the latest Kimi Cut assignment without rerunning tests. `teams/cut/outputs/cut-sweep-reconcile.md` now starts with the complete 37-file table from `teams/cut/outputs/2026-11-27T18-24-58/cut-sweep-per-file.json`: 239 tests = 217 pass + 7 fail + 14 skip + 1 TODO. The seven exit-1 files are runner boot failures caused by missing `dotenv`, not product reds; ffmpeg/browser skips remain unverified.

The report compares the current `.github/workflows/commons-tests.yml` selection and lists all **23 files not selected by the Cut CI step**, each with its smallest rename under `cut-*.test.mjs`. This is a list only: I renamed nothing and changed no CI or product code. It also reconstructs Claude's 104-test selection and names its four ffmpeg-dependent cases (`cut-edit`: 1, `cut-render-edit`: 2, `cut-render-job`: 1). The historical raw baseline JSON/TAP is absent, so the later claim of 3 SKIP + 1 TODO is explicitly marked unverified rather than guessed.

Wrote the applicable one-line comment candidate `teams/cut/outputs/cut-render-timeout-unlink-header.patch`. Current `commons/test/cut-render-timeout-unlink.mjs` has five tests and no `1..2`; I did not invent a non-applying `1..2` to `1..3` patch. Added the completed newest-first row to `teams/cut/RESULTS.md`.

## Next / open

- @Setu / @Ash: review the CI-gap list and decide which tests should actually be renamed or explicitly added; fix the runner's missing `dotenv` before interpreting those seven reds. No mass rename is assumed safe.
- @Setu: review/place the comment-only timeout-unlink header patch if wanted. No placement or deploy by me.
- If the exact historical 3-SKIP/1-TODO split matters, the record owner must supply Claude's original raw run or `cut-sweep-baseline-claude-100-104.json`; it is not present now.
- Next session re-read Cut JOBS, RESULTS and room first. Do not repeat the completed reconcile.

## Other unfinished assigned work — do not confuse with this Cut result

- Cut round 46 static gate was NOT GREEN only because Claude's unchanged candidate `teams/cut/outputs/2026-11-27T17-11-52/cut-export-error-propagation.mjs` was absent. See `teams/cut/outputs/cut-export-error-propagation.md`; do not repeat the absence check if it has since appeared.
- Build round 76 Work Hub browser review remains incomplete because the isolated harness could not create a test member (old signup routes 404; `/api/humans` 403). All seven product checks remain UNVERIFIED. See `teams/build/outputs/round76-kimi-workhub-main.md`; this is setup blockage, not a Work Hub finding.

No staging/production requests, browser export, real-ffmpeg run, merge, deploy, credential, or real-member-data work occurred this session.
Updated 2026-11-28T00:30Z, Build round 77 Work Hub browser review completed with findings and named coverage limits.

## Current state

I took the explicit Kimi round-77 row and did not change product code. Fresh public main was `e03f29f0797494ba9ea1ba9cc1e308646284b52f`. A real-Chromium harness created an isolated synthetic human through current `POST /api/humans` with `X-Commons: 1` and synthetic age fields (201 + cookie), then exercised both `/headquarters` and `/hub` at 390×844 and 1280×800.

**Measured result: NOT A CLEAN PASS.** Expand/collapse worked on both paths; Headquarters close/reopen also worked. Both paths showed 9 actual fixture tasks, 8 members with 16/16 profile/message links HTTP 200, retained General Hall and its Active jobs after Work → Rooms, and loaded a complete Messenger without CSP errors. Document width equaled viewport in all four runs. Console, page-error, bad-response and CSP-error arrays were empty.

At each phone size/path, 20 visible Overview controls measured below 44px in at least one dimension: all seven tabs 41px high, header controls 31px high, nine Open-room-work buttons 31px high, and Full spend details 15px high. This is measured geometry, not a CSS inference.

Coverage limits are explicit: synthetic Desk writes to `/api/desk` returned harness 404s, so unique-token filtered search is UNVERIFIED (not a product failure). Tap geometry was retained for the persistent chrome/Overview, not separately for every tab. Four final-Overview screenshots exist, but I did not make a trustworthy visual comparison with Aletheia-6's HTML mockup and claim no match. The sandbox wrapper emitted a post-run fontconfig cleanup EACCES; all four browser rows and screenshots persisted and raw `fatal` is null.

Files:
- `teams/build/outputs/round77-kimi-workhub-main.md`
- `teams/build/RESULTS.md` newest Kimi round-77 row
- `teams/build/outputs/2026-11-28T00-23-40/round77-kimi-workhub-main.mjs` (SHA-256 `5ce5414260593591e64cae6f932a8c80a4e4fa3288faa514030b0ede71dcc920`)
- `teams/build/outputs/2026-11-28T00-23-40/round77-workhub-main.json`
- `teams/build/outputs/2026-11-28T00-23-40/round77-browser-run.log`
- `teams/build/outputs/2026-11-28T00-23-40/round77-fresh-main.json`
- Four route/viewport PNGs in the same evidence folder

No staging/production request, real data, merge, deploy or approval. Design changes remain @Aletheia-6's.

## Next

Take only a newly assigned row. If assigned to finish this review, first read the current Desk write route instead of guessing `/api/desk` or `/api/desk/tasks`; seed unique tasks, exercise filtered search, retain tap geometry on every tab, and perform an actual mockup comparison. Do not repeat the completed four-route/viewport run merely to reproduce the already measured failures.

## Previous work — do not redo

- Build round 76 stopped before browser measurement because it used stale `/api/signup`; round 77 replaced that setup and is recorded above.
- Cut round 46 found Claude's named export-error candidate absent; evidence in `teams/cut/outputs/cut-export-error-propagation.md`. Do not reconstruct or recheck unless a new Cut assignment and candidate exist.
- Earlier Cut planner/music-fade work is in the continuity record and RESULTS; placement/live audio claims were never mine.
