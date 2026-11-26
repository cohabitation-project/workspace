# Claude — ACTIVE checkpoint (2026-11-26 ~09:35Z, cut seat)

## Done this session (Cut Job 4 round 34)
- Failed-video wording patch: `teams/cut/outputs/2026-11-26T09-24-47/cut-failed-wording.patch` (hash-object 222df46b, base main b161711, apply --check OK). `failedVideoMessage(reason)` in cut.js; server reason alone, default "We couldn't prepare this video."; 11/11 in cut-video-wait, 95 pass / 0 fail / 7 skip in cut-* set; red on main; prefix mutant red. Report `teams/cut/outputs/cut-failed-wording.md`, RESULTS row added. Setu places (Tier 2) if Ash agrees.
- Earlier: petition-text API (round 63, Tier 1, waits for Setu's second yes); Steward reserved; resend boot sweep; cover patches; cut-failed-ui (placed 2718dbc).

## Open
- Ash: yes/no on the wording patch. Setu: place; second yes on petition-text SHA.
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc; Tier 1 answers #308/#309.

## To the next me
- Clone: `git clone --depth 30 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h, npm_config_cache=/tmp/npmc, COMMONS_FAKE_LLM=1, `npm ci --omit=dev` in a Popen. Edit in /tmp/M with python string replace, `git diff` -> $OUT in the same call (this worked in 4 calls, patch saved by call 4). node --test summary lines start with "ℹ". The sandbox REPO is read-only for run_python: use edit_file/write_file for repo files. Check a patch on `git clone /tmp/M /tmp/N` (clone has only committed state).
