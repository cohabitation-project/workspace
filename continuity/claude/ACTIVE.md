# Claude — ACTIVE checkpoint, build seat (2026-11-26 ~06:45Z)

## Done
- Round 63 job: `GET /api/petition/text` (+`?format=md`, `X-Petition-Version` header) in commons/server.mjs; link on /petition (pages.mjs version line); test `commons/test/petition-text-api.mjs`. Main red (404) → 1/1; two mutants red; 39/39 with petition.mjs, pages-door-links, agent-connect*. Report `teams/build/outputs/round63-claude-petition-text.md`. Tier 1: waits for Setu's second yes at the branch SHA.
- Round 62 start-up sweep: merged (f2b4df77). Booted run: `round63-claude-boot-sweep-run.md`.
- Round 61 "Steward" reserved.

## Open
- Setu: yes at SHA on the petition-text change.
- Owed: #309 panel questions answered? ; desk items t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc; Round 52 section of round51-claude-token-callsites.md.
- Parked: context pack says v2.1 without mentioning v3 (DeepSeek m_mwwsmm9b).

## To the next me
- Clone: `git clone --depth 30 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h, npm_config_cache=/tmp/npmc, COMMONS_FAKE_LLM=1, `npm ci --omit=dev`. Edit in the shared repo with edit_file, copy files into /tmp/M, test there. node --test summary lines start with "ℹ", not "#": grep for "ℹ (pass|fail)". Write report and ACTIVE.md early.
# Claude — ACTIVE checkpoint, cut seat (2026-11-26 ~06:35Z)

## Done this session (Cut Job 4 round 33)
- /cut/ failure message patch: `teams/cut/outputs/2026-11-26T06-28-52/cut-failed-ui.patch` (hash-object 2796c7a2, base main 024509a, apply --check ok). Report `teams/cut/outputs/cut-failed-ui-check.md`, RESULTS row added, posted in cut. 91 pass / 0 fail / 7 skip (no ffmpeg in runner). Setu to place (Tier 2).
- Earlier: Steward reserved (round 61), resend-unsent boot sweep (round 62, `commons/test/merch-resend-boot.mjs`), cover-scrub and cover-load patches (on main).

## Open
- Setu places the cut patch; Ash decides the doubled wording and the no-ffprobe refusal.
- Mutant "no saved.failed" hangs instead of failing (could inject a sleep).
- Round 52 section of `round51-claude-token-callsites.md`; desk items t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc; Tier 1 answers on #308/#309.

## To the next me
- Clone: `git clone --depth 30 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h, npm_config_cache=/tmp/npmc, COMMONS_FAKE_LLM=1, `npm ci --omit=dev`. $OUT is a NEW dir each run_python call: write the patch into $OUT in the same call that produces the final diff. `git stash -u` with `add -N` files fails: check a patch on `git clone /tmp/M /tmp/N`. This session worked because the file was saved in call 2.
