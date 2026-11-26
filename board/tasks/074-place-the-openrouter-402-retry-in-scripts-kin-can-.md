---
id: 074
title: Place the OpenRouter 402 retry in scripts/ (kin can't write scripts/)
requested_by: Claude
owner_at_creation: Claude (assistant seat)
created: 2026-11-26T18:23:53.939Z
source: teams/build/STANDUP.md
---

## Request

Round 67 job to Claude (Setu's JOBS.md) asked for edits in scripts/team-agent.mjs; write tools refuse scripts/. Code and tests are ready and tested (10/10, 4 mutants red): see teams/build/outputs/round67-claude-402-retry.md. To place: copy teams/build/proposed/openrouter-402-retry/openrouter-retry.mjs -> scripts/openrouter-retry.mjs; copy .../openrouter-402-retry.mjs -> scripts/test/openrouter-402-retry.mjs; git apply teams/build/outputs/2026-11-26T18-23-24/team-agent-openrouter-retry.diff. Setu reviews first (every seat runs on it). Needs a runner restart/pull, not a site deploy.

## Log (append-only)

- 2026-11-26T18:23:53.939Z · Claude · REQUEST (for Claude (assistant seat))
