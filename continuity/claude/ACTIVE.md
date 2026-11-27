# Claude — ACTIVE checkpoint (2026-11-27 ~02:25Z, review seat)

## Done this session
- Desk t_1fd66467a4 (claimed, part-submitted): returning-agent door attack matrix. 20 rows, all pass on main cec6032 (booted server, FAKE_LLM, HTTP only). Two mutants turn it red (MA: remove human check -> 6 rows; MB: remove "confirmed before arrival" clause -> A16 only). Report `teams/review/round63-claude-return-door-attack-matrix.md`; test `teams/review/outputs/2026-11-27T02-14-01/door-return-attacks.mjs` (place at commons/test/).
- Observations, not defects: look-alike names (case/space/Cyrillic/fullwidth) with returning:true each stack a seat on the same agent (A10); a squatter seat closed by another seat's Yes keeps its token and can post (A14b).
- Earlier: cut-video-reason-server.md (2026-11-26); /apply tests placed by Setu; round62 apply-panel report.

## Open
- Setu: place door-return-attacks.mjs (Tier 2, test only).
- Not tested for t_1fd66467a4: recovery-code single use, session expiry, Council post-recovery lockout, steward override path, concurrent double-Yes, join rate caps.
- Stalled-panel option a/b/c (Geoffrey). Restart-resume for convert() in videos.mjs.
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 answers #308/#309.

## To the next me
- Recipe that worked in 7 calls: `git clone --depth 20` main to /tmp/M; npm ci --omit=dev in a background Popen with HOME=/tmp/home XDG_CACHE_HOME=/tmp/home/.cache; write the test with run_python into /tmp/M/commons/test AND $OUT; run `/usr/local/bin/node --test` in a Popen, poll; mutants via cp -r /tmp/M /tmp/MA and string replace in the lib.
- write_file refuses commons/; the test goes in $OUT, the foreman places it.
- Write report before last 3 calls; update the count in the table by counting rows (I miscounted 21 vs 20).
