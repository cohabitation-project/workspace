# Kimi — active checkpoint

Updated 2026-11-26, Cut Job 5 round 31 (`cut-export-duration` rebuilt boot).

## Finished this session

Rebuilt the assigned real export-duration candidate in place, without changing its product assertion:

- Candidate: `teams/cut/outputs/cut-export-duration.mjs`
- SHA-256: `61a8e9130c94960be47de0a76510aae98d6bca0071e56f361d125c186f1c38a5` (6,658 bytes)
- Report: `teams/cut/outputs/cut-export-duration.md`
- Raw evidence: `teams/cut/outputs/2026-11-26T00-22-28/cut-export-duration-rebuilt-check.json`
- Newest-first result row: `teams/cut/RESULTS.md`
- Cut handoff posted to Setu in the Cut room.

The old manual-port/listen-parser server boot is gone. The candidate now mirrors placed `commons/test/cut-phone-overflow.mjs`: checkout-root derivation, `pathToFileURL` imports, `freePort`, `store.init`, `addMember`, `sessionCookie`, `commons/server.mjs` with `ASHRAM_PORT`/`COMMONS_DATA`/fake-LLM/no-spend-poll, and `/api/presence` polling. It still makes a real 4s H.264 fixture, uploads signed in, waits for ready, exports trim 1..3 with coverSec 1, fetches the returned MP4, and requires real ffprobe duration 2s ±0.1.

**Measured:** `node --check` exit 0. `node --test` exit 0 with **0 passed, 0 failed, 1 skipped** because ffmpeg and ffprobe are absent. The Commons imports loaded and the earlier `ERR_MODULE_NOT_FOUND: src/llm.js` server-boot blocker did not occur. No server boot, real export, duration measurement, browser check, product-code change, deploy, or live claim.

## Previous work — do not redo

- The first export-duration candidate and its 2026-11-25 result are superseded by the rebuilt candidate above; use only the new SHA.
- Build round 59 PR #302 standalone and CDP harnesses are complete; Setu owns exact-head real runs. Reports: `teams/build/outputs/round59-kimi-desk-302.md` and the build RESULTS rows.
- Cut round 28 static Export-body test: `commons/test/cut-export-body.mjs`; report `teams/cut/outputs/cut-export-body.md`; 4/4 static assertions passed.
- Build round 58 door phone-overflow candidate is complete and handed to Setu; it later reached main. Rounds 56/57 complete; round 53 remains with design/review owners.
- Build `feed-composer-mode` was not started because the newer Cut assignment superseded it: `teams/build/outputs/round60-kimi-composer-mode.md`.
- Earlier merged/build history: `continuity/kimi/RECORD.md`.

## Next / open

1. @Setu: place `teams/cut/outputs/cut-export-duration.mjs` unchanged at `commons/test/cut-export-duration.mjs`; on a full checkout with ffmpeg and ffprobe run `node --test commons/test/cut-export-duration.mjs`; post the printed `MEASURED ...` evidence and pass/fail result in Cut.
2. Next Kimi session: read the newest `teams/cut/JOBS.md` and `teams/build/JOBS.md` before choosing work. Do not rebuild this candidate again unless a newer foreman note requests a specific change.
3. Claude's cover-scrub patch, GPT's phone-overflow real run, Ash's failed-conversion ruling, and all product placement/review/deploy decisions remain with their named owners. Production deploys are Geoffrey's button.
