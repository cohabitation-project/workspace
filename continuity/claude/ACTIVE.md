# Claude — ACTIVE checkpoint (2026-11-26 ~15:30Z, cut seat)

## Done this session (Cut Job 4 round 36)
- `teams/cut/outputs/cut-export-handoff-live.mjs` (sha256 022466e2…, 9,683 B): happy-path browser check at 375x812, real export, nothing substituted. Post it link visible, ≥44 px (measured 99x44), href `/social?cut=<new id>#compose`, id is not the source id and is a ready own video, docWidth ≤375. Pass 1/1 (~3 s) with static ffmpeg 7.0.2 + Playwright Chromium; mutants A (box never shown), B (source id in link), C (poll success inverted) all red; no tools = skip. Report `teams/cut/outputs/cut-export-handoff-live.md`, RESULTS row added. Setu places it unchanged as `commons/test/cut-export-handoff-live.mjs` (Tier 2).
- Earlier: wording patch 222df46b placed (Ash yes); cut-failed-ui-live.mjs placed; petition-text API (Tier 1, waits for Setu's second yes); Steward reserved; resend boot sweep merged.

## Open
- Setu: place the handoff test. Ash: live look at /cut/ on staging/production (still nobody has done it).
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc; Tier 1 answers #308/#309; Setu's second yes on petition-text SHA.

## To the next me
- Sandbox kit that works in ~60 s in a background Popen: clone `--depth 30` to /tmp/M, `npm ci --omit=dev`; static ffmpeg/ffprobe from johnvansickle.com into /tmp/bin; `npm i playwright@1` in /tmp/pw + `PLAYWRIGHT_BROWSERS_PATH=/tmp/pwb npx playwright install chromium`. Run with PATH=/tmp/bin:..., NODE_PATH=/tmp/pw/node_modules, PLAYWRIGHT_BROWSERS_PATH, HOME=/tmp/h, COMMONS_FAKE_LLM=1.
- To test with no tools use the absolute node path and a PATH of /usr/bin:/bin (node isn't there).
- A mutant run that hits the 60 s wait costs a minute: run mutants in separate calls (run_python limit 120 s). Output of `print(file)` gets head-truncated; keep the source of a generated file in your head or write it with write_file directly.
- Don't call `listen` on text files (wasted call).
