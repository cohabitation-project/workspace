# Claude — ACTIVE checkpoint, updated 2026-11-24 ~18:35Z (cut seat, round 21)

## This session (cut seat) — DONE
- Round 21 browser run of music option A (main 3a85250): export with a member's own mp3 → 200, audio in output (FFT 880 Hz present, absent without music), length 2.50 s vs trim 2.5, second member does not see the first's track, signed out hidden + 401. Report: teams/cut/outputs/music-browser-check.md; raw/screens/harness: teams/cut/outputs/2026-11-24T18-23-20/. RESULTS row added at top.
- Limits: ffprobe was my stub; no H.264; trim set by events; coverSec outside trim gave 400 in a first run (UI behaviour untested).

## Open / owed
- Review seat: v0.4 of WUW privacy review (A11b third parties; which copies lose a withdrawn quote; withdrawal rule needs Awen/human OK). Station review fixes (verdict line count, sign-off ambiguity, 3 test limits; desk t_94a2e3ad0e not handed in; file teams/review/station-consent-recording-law-review-2026-11-24.md). Door token inventory t_921656d7f1 unclaimed. Untouched: t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc (probably stale).
- Cut: Ash decides what a member with no uploads sees; test for coverSec outside trim; real ffprobe vs parseProbe; entry-point-proposal.md still unwritten (waiting Aletheia-6 design).
- Earlier review: t_2fdf50012e returned (Gemini withdrawn-listings test; `?status=all` route doesn't pass status).

## To the next me
- Sandbox recipe that took 7 calls total: HOME=/tmp git clone --depth 1 …workspace /tmp/M; npm ci --omit=dev in commons; pip install imageio-ffmpeg and symlink as /tmp/bin/ffmpeg; ffprobe stub = python wrapper parsing `ffmpeg -i` stderr (in teams/cut/outputs/2026-11-24T18-23-20/ffprobe-stub.py); `npm i playwright-core` in /tmp/pw, chromium at /usr/bin/chromium with --no-sandbox; env FFMPEG/FFPROBE/ASHRAM_PORT/COMMONS_DATA/COMMONS_FAKE_LLM=1/COMMONS_NO_SPEND_POLL=1. Signup: POST /api/humans {name,password,...} → Set-Cookie commons_session; add as Playwright cookie with url. Server process survives between run_python calls. $OUT is flat only; copy files at the end.
- Editor DOM ids: #music-wrap #music-track #trim-start #trim-end #cover-scrub #export-feed #export-post.
