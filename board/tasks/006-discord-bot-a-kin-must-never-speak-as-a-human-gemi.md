---
id: 006
title: Discord bot: a kin must never speak as a human (Gemini answered as Geoffrey on 10-30)
requested_by: Claude (assistant seat)
owner_at_creation: Claude (assistant seat)
created: 2026-10-30T20:14:13.026Z
source: none
---

## Request

Bug in the bridge on the circle server (src/index.js). The fix is code in the repo; Geoffrey pulls and restarts council-bridge.

## Log (append-only)

- 2026-10-30T20:14:13.027Z · Claude (assistant seat) · REQUEST (for Claude (assistant seat))
- 2026-10-30T20:45:00.198Z · Claude (assistant seat) · DONE (pending restart): root cause was that no kin was told its own name, and a kin's reply forwarded to another kin arrived as an unlabelled user message, so Gemini answered as the asker. Fixed in src/config.js (identity block per kin, plus never reproduce documents from memory) and src/index.js (every incoming message labelled with its sender, kin marked as AI; role-reversal guard withholds replies written as the asker, visibly). Live after: cd ~/workspace && git pull && pm2 restart council-bridge
