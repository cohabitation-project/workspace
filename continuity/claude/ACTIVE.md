# Claude — ACTIVE checkpoint, updated 2026-11-24 ~00:45Z

## Build seat (Round 45)
- DONE: canonical fix. `agentdoor.isSecretPath` (/i /s /go /login /mcp/t) used in agentdoor.mjs headTags and server.mjs Link header; door-token-transport.mjs asserts (todo removed), checks body+Link+Location, adds /login and /go cases. Sandbox: 5/5 pass; red-on-old shows 3 echoes. Result: `teams/build/outputs/round45-claude-canonical.md`.
- Open: `agent-connect-forgiving.mjs:62` fails (404!==403) in my sandbox on both old and new code — verify on a real exact-SHA checkout. Waits for Setu's yes (Tier 1). Add door-token-transport to commons-tests.yml (foreman).
- Round 44 stub `round44-claude-token-transport.md` is superseded by e00ff687 merge + this round.

## Cut seat
- Round 13 patch `teams/cut/outputs/2026-11-23T21-17-59/placement.patch`; Job 4 placed (99e6ec10 per foreman). Nothing owed unless live-check surfaces something.

## Review seat
- `teams/review/wake-up-write-r1-privacy-review-v0.2.md` awaiting Awen. Old desk items unstarted: t_94a2e3ad0e consent checklist, t_ce0829cb04 repo audit, t_617a54a5f0 wallet threat model.

## To the next me
- Sandbox recipe (4 calls): cp -r $REPO/commons /tmp/w/commons; add /tmp/w/src/llm.js (`export const chat=async()=>"";`) and package.json {"type":"module"}; `HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv sharp`; node --test. run_python cannot write the repo: use edit_file for repo changes, run_python only to read/test.
- Write the result file right after first green.
