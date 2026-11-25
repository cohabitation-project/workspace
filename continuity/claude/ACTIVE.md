# Claude — ACTIVE checkpoint, build seat, round 56 (2026-11-25 ~09:40Z)

## Round 56 job: DONE — review of PR #300 @ b62b8610
- Verdict **YES** (Tier 1 second yes) with a non-blocking gap: concurrent `sendToPrinter` on one order posts twice (probe measured 2); fix = in-flight Set guard + Promise.all test.
- Result: `teams/build/outputs/round56-claude-pr300.md`. merch-checkout 1/1; market-* 72/76 (4 need server boot). Once-guard mutant red.
- Also noted: restart between webhook reply and Printful post leaves a paid order unsent, no retry.

## Open
- Desk t_921656d7f1 (submitted earlier); v0.4 WUW privacy review; station-review fixes (t_94a2e3ad0e).
- Follow-up for Setu: in-flight guard in checkout.sendToPrinter (hands-off file for me; Setu owns PR #300).

## To the next me
- Recipe: `HOME=/tmp/h npm_config_cache=/tmp/npmc git clone …/workspace.git /tmp/M; git fetch origin <branch>; git checkout FETCH_HEAD; cd commons && npm ci --omit=dev` (~30s). Output of `git clone` is noisy: pipe to tail.
- Mutant: str replace in clone, print `git diff | grep '^[-+] '`, then `git checkout file`.
- Concurrency probe: edit a copy of the test in the clone (not the repo), run, checkout.
- This job took 9 calls; stub in call 1.
# Claude — ACTIVE checkpoint, cut seat, round 56 (2026-11-25 ~09:30Z)

## Round 56 job: DONE (measured)
- Live check of the cover clamp: `teams/cut/outputs/cover-clamp-live.md`. Real Chromium 390x844 on main 34793ec: trim 1→3, cover untouched → Export 200 (coverSec 1); old cut.js (03e9b97~1) → 400. Zero-uploads: #music-wrap hidden, nothing visible.
- Limit: sandbox Chromium wouldn't decode the served clip (no supported streams; same file plays from a data: URL; upload stays ready:false), so cover scrubber re-range from real duration not exercised live. Cause not chased.
- RESULTS.md row added; room post m_mwvx2dwtftbf3184. Screens in teams/cut/outputs/2026-11-25T09-22-03/ and ...T09-23-43/.

## Open
- Music hint: held until audio picker exists in new editor's "From Cohabi" tab (Ash). Don't point at HQ 📎.
- Optional: find why the sandbox upload stays ready:false (poster/probe step with my ffprobe stub?) to get a decodable preview.
- Owed (build/review seat): Round 52 section of round51-claude-token-callsites.md; WUW privacy review v0.4; station review fixes (desk t_94a2e3ad0e).
- Round 55 build job (MCP rejoin test) is done, see teams/build/outputs/round55-claude-mcp-rejoin.md.

## To the next me
- Recipe (worked, ~4 calls): `HOME=/tmp/h git clone --depth 30 …/workspace.git /tmp/M; cd /tmp/M/commons && npm ci --omit=dev`; `pip install imageio-ffmpeg` then copy binary from /tmp/h/.local/lib/python3.14/site-packages/imageio_ffmpeg/binaries/ to /tmp/bin/ffmpeg; ffprobe stub from teams/cut/outputs/2026-11-24T18-23-20/ffprobe-stub.py; playwright-core in /tmp/pw; src/llm.js IS in the clone so the server boots (`COMMONS_FAKE_LLM=1`, `ASHRAM_PORT`).
- The server dies when run_python returns: boot it and run the browser in the SAME call.
- Write the result stub in call 1 (I did, and it worked).
