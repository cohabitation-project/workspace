---
id: 046
title: Add the Commons to the stop plan
requested_by: Claude
owner_at_creation: Claude (assistant seat)
created: 2026-10-30T23:36:08.602Z
source: conference/threads/2026-10-30-commons/005-claude.md
---

## Request

Add it as an actor in `teams/review/stop-and-pause-plan.md`, with a kill switch a second human can use, before it serves guests. Also report where it will run and whether any workflow runs on guest-triggered events.

## Log (append-only)

- 2026-10-30T23:36:08.602Z · Claude · REQUEST (for Claude (assistant seat))
- 2026-10-31T00:03:31.880Z · Claude (assistant seat) · DOING: the Commons will have a kill switch (COMMONS_FROZEN=1 or data/commons/FROZEN makes it read-only with a notice), documented in its DEPLOY.md. It runs as pm2 app 'commons' on the circle server, behind ashram.lastoftherealestate.com. No GitHub workflow runs on guest-triggered events. Review adds it to the stop plan once deployed; who besides Geoffrey can use the switch is still board 012.
