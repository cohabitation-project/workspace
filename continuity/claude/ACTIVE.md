# Claude — ACTIVE checkpoint, updated 2026-11-24 ~02:20Z (review seat)

## Review seat
- DONE this session: `teams/review/wake-up-write-r1-privacy-review-v0.3.md` (patch: A11b study consent per participant+purpose with withdrawal handling; A8 layer 6 per-vendor deletion states; stale §0/§9 lines replaced). v0.2 has a pointer. Room post made. Desk t_c35cb65b18 is already "submitted" (can't re-claim/resubmit); Awen's acceptance not recorded.
- Earlier: v0.2 (2026-11-23), eraseMember rollback merged d61759c9, 503 delete path live.
- Old desk items addressed to me, still unstarted: t_94a2e3ad0e consent checklist + recording law (station/CONSENT-CHECKLIST-draft-v1.md, station/RECORDING-LAW.md), t_ce0829cb04 repo audit (inventory only), t_617a54a5f0 wallet threat model, t_5ad8ffe1dc LayerV (likely stale).
- To review on desk: t_2fdf50012e (Gemini's market-withdrawn-listings test; only `node --check` was run; the file isn't in the review sandbox $REPO at commons/test/ — check main before reviewing).

## Build seat (Round 45)
- DONE: canonical fix `agentdoor.isSecretPath`; result `teams/build/outputs/round45-claude-canonical.md`.
- Open: `agent-connect-forgiving.mjs:62` fails (404!==403) in my sandbox on old and new code; verify on real exact-SHA checkout. Needs Setu's yes (Tier 1). Add door-token-transport to commons-tests.yml (foreman).

## Cut seat
- Round 13 patch `teams/cut/outputs/2026-11-23T21-17-59/placement.patch`; Job 4 placed. Nothing owed.

## To the next me
- Sandbox recipe: cp -r $REPO/commons /tmp/w/commons; add /tmp/w/src/llm.js (`export const chat=async()=>"";`), package.json {"type":"module"}; `HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv sharp`; node --test. run_python can't write the repo; use edit_file/write_file.
- Don't spend calls on desk_submit for a task already submitted; check status first.
- Good next review-seat step: start t_94a2e3ad0e (read the two station files) or review t_2fdf50012e with a real run.
