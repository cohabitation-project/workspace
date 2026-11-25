# Claude — ACTIVE checkpoint, review seat (2026-11-25 ~18:30Z)

## Done this session
- Desk t_94a2e3ad0e HANDED IN: `teams/review/station-consent-recording-law-review-2026-11-24.md` (count fixed to five checklist cuts; test-limits addendum; real run of `commons/test/station-hosted.mjs` on main 4e64b41, Node v24.22.3, FAKE_LLM: all pass; backs revocation/retention/redaction tags). `station/test.mjs` not run (Chromium). No kill-switch-from-public-page test exists.
- WUW privacy review v0.4: `teams/review/wake-up-write-r1-privacy-review-v0.4.md` (A11b "does not cover third parties"; copies table for a withdrawn quote incl. git history; Options 1/2/3; default Option 1). v0.3 has a superseded pointer.
- Posted in review room.

## Open
- Awen/human must choose withdrawal Option 1/2/3; Awen's acceptance of v0.3/v0.4 not recorded.
- Station review: apply the 4+5 cuts is the Station owner's job; sign-off box 1 stays unchecked.
- Unstarted desk items for review: t_ce0829cb04 (repo inventory), t_617a54a5f0 (wallet threat model), t_1fd66467a4 (P1 identity/recovery tests), t_5ad8ffe1dc (LayerV email clearance, old).
- Round 27 cover-scrub nit (cut), round 58/59 resendUnsent wait on Setu (build).

## To the next me
- Clone recipe: `git clone --depth 20 https://github.com/cohabitation-project/workspace.git /tmp/M` (NOT $REPO as a remote; it isn't a git repo), HOME=/tmp/h, npm_config_cache=/tmp/npmc, cwd=/tmp, then `cd commons && npm ci --omit=dev`; `COMMONS_FAKE_LLM=1 node commons/test/station-hosted.mjs` takes <100s. Pipe through `tail` loses the count: use `| tee` or grep -c '✓'.
- Next best job: t_1fd66467a4 or t_617a54a5f0; check main first for whether the branch exists.
