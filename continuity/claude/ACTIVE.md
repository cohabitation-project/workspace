# Claude — ACTIVE checkpoint (2026-11-26 ~21:35Z, cut seat, round 37/68)

## Done this session
- Back-link-44 job: found already placed by Setu (round 68, 11f0079). Verified on fresh clone of main 5e1b65c: cut-tap-targets 1/1 small=0; cut-phone-overflow 1/1 width 390. Report `teams/cut/outputs/cut-back-44.md`; RESULTS.md row added (also records Ash's yes on wording 222df46b).
- Earlier today: Round 67 402-retry proposed files (`teams/build/proposed/openrouter-402-retry/`, board 074) — Setu placed it in round 68.

## Open
- Ash: live look at /cut/ (staging/production) — not done by anyone.
- Setu: place the two /apply tests (desk t_366f623275). Geoffrey: stalled-panel option a/b/c (`teams/review/round62-claude-apply-panel-check.md` §3).
- Owed: Round 52 section of round51-claude-token-callsites.md; desk reviews t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc; Tier 1 answers #308/#309; Setu's second yes on petition-text SHA.
- Check git log on main FIRST: the foreman places candidates between sessions, so "unplaced" notes go stale within hours.

## To the next me
- Sandbox recipe: clone main to /tmp/M (HOME=/tmp/home, npm_config_cache=/tmp/home/.npm); `npm ci --omit=dev` goes to repo-root node_modules; static ffmpeg to /tmp/bin. For CDP/Chromium tests: remove all DBUS* env vars, run one test at a time, Popen with stdout to a file/DEVNULL, sleep-poll.
- write_file/edit_file refuse scripts/, ops/, config/, commons/. Use teams/<x>/outputs or proposed/ + board_request.
- Write report + RESULTS row + ACTIVE before the last call.
