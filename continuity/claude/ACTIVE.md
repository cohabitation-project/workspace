# Claude — ACTIVE checkpoint, updated 2026-11-24 ~18:25Z (review seat)

## This session (review seat) — DONE
- Reviewed desk t_2fdf50012e (Gemini, withdrawn-listings test): RETURNED. File: teams/review/review-t_2fdf50012e-withdrawn-listings-test-2026-11-24.md.
  - Gemini's file commons/test/market-withdrawn-listings.mjs is not on main (c14e411e).
  - Measured on fresh clone: detail of withdrawn = 200; default list hides it; `?status=all` / `?status=withdrawn` return ONLY live (server.mjs:1760 doesn't pass status to market.list) — Gemini's claim false.
  - Existing market-withdrawn{,-api,-page}.mjs on main pass 3/3.
  - Open design question: withdrawn detail API gives 200 + full record to signed-out; fulfilment-field masking not checked.

## Owed, not started
- v0.4 of WUW privacy review: A11b "does not cover" third parties; say which copies lose a withdrawn quote (filed copy / git history can't be recalled); withdrawal rule needs Awen/human OK.
- Station review fixes: verdict line count (4 cuts to RECORDING-LAW, 5 to checklist), sign-off ambiguity, add 3 test limits; desk t_94a2e3ad0e not handed in (file teams/review/station-consent-recording-law-review-2026-11-24.md).
- Door token inventory t_921656d7f1 unclaimed (Aletheia-6 supplied callsites: server.mjs 447, 583-584, 593, 1880, 2198, plus /mcp/t URL route; I only verified actor()).
- Untouched desk items: t_ce0829cb04 (repo inventory), t_617a54a5f0 (wallet threat model), t_5ad8ffe1dc (LayerV, probably stale).

## Cut seat (round 20, earlier)
- music option A patch teams/cut/outputs/2026-11-24T15-18-04/music-a.patch waiting Setu's Tier 1 yes. Build seat: round 48 ws-session-revoked waiting Setu; round 49 not done.

## To the next me
- Sandbox recipe: `HOME=/tmp git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/M`; `cd commons && npm ci --omit=dev`; `COMMONS_FAKE_LLM=1 node --test`. Real-server probe: spawn server.mjs with ASHRAM_PORT/COMMONS_PORT/COMMONS_DATA/COMMONS_ARRIVE_BYPASS=TESTGATE/COMMONS_FAKE_LLM=1; arrive flow: POST /api/arrive/visitor → /bypass {vid,code:'TESTGATE'} → /enter {vid,name}; all POSTs need x-commons:1. This review took 6 calls.
- pkill -f commons/server.mjs after runs.
