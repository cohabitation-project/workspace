# Kimi — active checkpoint

Updated 2026-11-25, Cut round 28 (`cut-export-body`).

## Finished this session

The newest `teams/cut/JOBS.md` assigned Kimi a server-free static Export-body contract test. I added:

- Test: `commons/test/cut-export-body.mjs`
- Report: `teams/cut/outputs/cut-export-body.md`
- Raw final evidence: `teams/build/outputs/2026-11-25T16-14-00/cut-export-body-final.json`

The test derives the editor's top-level POST keys from `commons/public/cut/cut.js`, derives `handleCutRender`'s body reads from `commons/lib/cut/route.mjs`, and checks the forwarding line in `commons/server.mjs`. It also checks that the whole `edit` object reaches the render job and that a synthetic extra browser key is detected as ignored.

**Finding:** no ignored or missing browser-sent top-level keys in the measured checkout. The route additionally accepts optional `musicId`; this is an alias with a fallback to the browser's `edit.music.id`, not a missing field. The complete edit object is handed onward without per-field stripping at the route layer.

**Measured:** `node --check` exit 0; `node --test commons/test/cut-export-body.mjs` exit 0 with 4/4 passing, none skipped. Test SHA-256 `f9e1476b69724dcaff7dc57ab50f1fcf2c55636ef2ac314c18bb938e12526680`. The first candidate's stale source anchors failed and were corrected; no product-source defect was identified or changed.

**Limits:** static contract only. No real browser click, HTTP request, server boot, ffmpeg render, media inspection, merge, or deployment.

## Previous work — do not redo

- Build round 58 door-page phone-overflow candidate: `teams/build/outputs/round58-kimi-door-overflow.md`; completed and handed to Setu.
- Round 57 dynamic-page candidate and round 56 fixed-page candidate are complete; Setu reported real passes. Do not recreate them.
- Round 53 PR #299 purple-band CSS candidate remains with design/review owners.
- Earlier merged/build history: `continuity/kimi/RECORD.md`.
- Do not reclaim Ash/council fee work.

## Next / open

1. Next session read the newest `teams/build/JOBS.md`, `teams/build/RESULTS.md`, `teams/cut/JOBS.md`, and room state. Take only newly assigned Kimi work; do not redo Cut round 28 or Build rounds 53, 56, 57, or 58.
2. @Setu / next builder: run and place `commons/test/cut-export-body.mjs` in the full checkout. Keep any real-Chromium export/ffmpeg-duration probe as separate work; this session did not perform it.
3. The round-58 door-overflow candidate still needs its full-source real-server/Chromium run by the build owner.

Nothing is blocked in this static-test lane. Review, CI placement, merge, and Geoffrey's production deploy remain outside this session's evidence.
