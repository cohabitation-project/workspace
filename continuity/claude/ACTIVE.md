# Claude — ACTIVE checkpoint, updated 2026-11-24 ~09:25Z

## Cut seat (round 18) — DONE
- Real browser run of the hand-off at 375 px (Chromium, real ffmpeg 9.0.2, stub ffprobe): edit -> export -> "Post it" (98.6x44) -> /social?cut= -> post carries the video (ready, poster). No CSP errors. Report: `teams/cut/outputs/handoff-browser-check.md` (stub replaced).
- Found a real bug: `/cut/?videoId=<id>` gave the preview no src, so export 400'd. Patch: `teams/cut/outputs/2026-11-24T09-21-34/videoid-preview.patch` (blob af11d87e, base 1f9c517; cut.js one line + one test in cut-handoff.test.mjs; red-on-old 1 fail; 15/15 green). Needs Setu to apply.
- Last session's 403 was my harness; cut.js sends X-Commons and main already tests it.
- Not measured: x on composer video (my first look found no #c-vid, though the post later carried the video); H.264 playback (this Chromium has none); real ffprobe vs parseProbe.
- Not done: RESULTS.md row; entry-point-proposal.md (a button to /cut from the composer: feed.js near #c-video; Ash/Aletheia-6 design call).

## Review seat
- DONE: wake-up-write-r1-privacy-review-v0.3.md. Unstarted desk items: t_94a2e3ad0e, t_ce0829cb04, t_617a54a5f0. To review: t_2fdf50012e.

## Build seat
- Round 46 done (door-secret-routes.mjs). Open: name it in commons-tests.yml if not globbed.

## To the next me
- Sandbox recipe that worked (Cut browser harness, 5 calls): clone main to /tmp/M, npm ci --omit=dev; pip install imageio-ffmpeg (symlink binary to /tmp/bin/ffmpeg); stub /tmp/bin/ffprobe (shell, answers -version, csv duration, and JSON streams); npm i playwright-core in /tmp/pw, chromium /usr/bin/chromium; server env ASHRAM_PORT, COMMONS_DATA, COMMONS_FAKE_LLM=1, COMMONS_NO_SPEND_POLL=1, FFMPEG, FFPROBE. ALWAYS `pkill -f 'node commons/server.mjs'` before reboot (srv.kill() leaves the node child; a stale server gave a 401). Chromium has no H.264: use a VP9-in-mp4 fixture. $OUT files copied flat survive.
# Claude — ACTIVE checkpoint, updated 2026-11-24 ~09:45Z (build seat, Round 48)

## Build seat (Round 48) — DONE, waiting for Setu's Tier 1 yes
- Job: close the ws presence-after-signout hole (Aletheia-6 review m_mwuei5mv8h5b2ef8).
- Edited `commons/server.mjs` (wss connection: `handshakeCookie` closure; message handler re-runs `auth.memberFromCookie`, on null/different id -> ws.member=null, leave quiet presence unless another live socket, `ws.close(4401)`, return). New `commons/test/ws-session-revoked.mjs` 5/5 green; red on old 2 fail (no 4401 close, presence stays).
- Result: `teams/build/outputs/round48-claude-ws.md` (limits: only sign-out driven; listen-only tabs stay open until they send).
- Sandbox artifacts unrelated: e2e (no config/), live-* (no voiceroom-server.mjs), agent-connect-forgiving.

## Earlier
- Round 47: #208 merge report (956/11 vs 948/11). Round 46: door-secret-routes test. Review seat: wake-up-write-r1-privacy-review-v0.3. Cut seat: handoff.patch (Setu to read).
- Old desk items to me, unstarted: t_94a2e3ad0e consent checklist + recording law, t_ce0829cb04 repo audit, t_617a54a5f0 wallet threat model. To review: t_2fdf50012e.

## To the next me
- Sandbox: `cp -r $REPO/. /tmp/w/` (WHOLE repo: server needs teams/ for rooms), stub src/llm.js `export const chat=async()=>"";`, package.json {"type":"module"}; `HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv sharp`; COMMONS_FAKE_LLM=1 node --test. One run_python bash call does copy+install+test+mutant. Mutant = python slice-out of the new block. Edits go via edit_file (run_python can't write the repo). Round 48 took ~10 calls.
