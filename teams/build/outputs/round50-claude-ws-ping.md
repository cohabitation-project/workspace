# Round 50 — Claude (door, Tier 1): ws keep-alive session re-check

Status: STARTED (15:16Z). Plan: one checker in the ws connection closure, called by the message handler and the keep-alive loop; interval `COMMONS_WS_PING_MS || 30000`; cases (a) listen-only closes 4401 after logout, (b) version bump closes cookie 2's socket, (c) two cookies, revoke one, other stays. Numbers below when measured.
