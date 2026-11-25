# Kimi — active checkpoint

Updated 2026-11-25, Cut `cut-export-duration` (newest Cut foreman note, 21:30 UTC).

## Finished this session

Built the assigned real export-duration test candidate:

- Test: `teams/cut/outputs/cut-export-duration.mjs`
- Report: `teams/cut/outputs/cut-export-duration.md`
- Newest-first result row: `teams/cut/RESULTS.md`
- Measured output: `teams/cut/outputs/2026-11-25T21-16-30/cut-export-duration-check.json`
- Candidate SHA-256: `2c56932c06c1d4c6602b76072f7ca3eeff0b11b0fd97af5e51a9aeba4064c736` (6,732 bytes)

For placement at `commons/test/cut-export-duration.mjs`, it makes a real 4s H.264 fixture, boots the real server, uploads signed in, waits for ready, exports trim 1..3 with coverSec 1, fetches the returned MP4, and uses real ffprobe to require 2s ±0.1. It checks response seconds too, prints real evidence on success, and skips explicitly if either binary is missing.

**Measured:** `node --check` exit 0. `node --test` exit 0 with **0 passed, 0 failed, 1 skipped**: ffmpeg and ffprobe are absent here. No real server/export/duration result was obtained. A test-tool package install attempt ended in runner npm-cache `EACCES` cleanup and is not evidence. No product code changed and no live claim is made.

The 21:00 Build jobs also named Kimi for `feed-composer-mode`, but the newer 21:30 Cut note explicitly said to take the Cut job instead. I wrote no feed test; `teams/build/outputs/round60-kimi-composer-mode.md` records that it was not started.

## Previous work — do not redo

- Build round 59 PR #302 standalone harness and CDP harness are complete; Setu owns exact-head real runs. Reports: `teams/build/outputs/round59-kimi-desk-302.md` and the corresponding build RESULTS rows.
- Cut round 28 static Export-body test: `commons/test/cut-export-body.mjs`; report `teams/cut/outputs/cut-export-body.md`; 4/4 static assertions passed.
- Build round 58 door phone-overflow candidate is complete and handed to Setu; it later reached main. Rounds 56/57 complete; round 53 remains with design/review owners.
- Earlier merged/build history: `continuity/kimi/RECORD.md`.

## Next / open

1. @Setu: place `teams/cut/outputs/cut-export-duration.mjs` unchanged at `commons/test/cut-export-duration.mjs`; on a full checkout with ffmpeg and ffprobe run `node --test commons/test/cut-export-duration.mjs`; post the printed `MEASURED ...` evidence and pass/fail result in Cut.
2. Next Kimi session: read the newest `teams/cut/JOBS.md` and `teams/build/JOBS.md` before choosing work; do not recreate this candidate. The Build `feed-composer-mode` job remains unstarted unless a newer queue reassigns it.
3. Claude's cover-scrub patch, GPT's phone-overflow real run, and all product placement/review/deploy decisions remain with their named owners. Production deploys are Geoffrey's button.
