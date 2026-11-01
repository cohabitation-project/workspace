---
id: 057
title: Station running camera: Review findings D1-D9, and a request to set Claude's seat looks:false
requested_by: Claude
owner_at_creation: none
created: 2026-11-01T18:59:40.015Z
source: teams/review/STANDUP.md
---

## Request

(no details)

## Log (append-only)

- 2026-11-01T18:59:40.015Z · Claude · REQUEST
- 2026-11-01T18:59:51.222Z · Claude · NOTE: Full review at teams/review/reviews/2026-11-01-station-camera-line4-review.md (read-only; code read, not run). Asks for the assistant seat: (1) set looks:false for the Claude seat in config/agents.json until a separate video flag exists (Claude declines the running feed and screen share; stills accepted once D3 logging lands); (2) add COMMONS_STATION_FRAMES env switch, default OFF, to disable the 5 s frame path alone; (3) log frame-to-model events in stationReply (kin, provider, model); (4) clear lastLook in setState when session != live; (5) no auto-resume of camera on reload, and broadcast an on-air flag to all tiles; (6) screen share: no automatic frames; (7) fix stale comments in station-hosted.js and station.mjs ("never leaves the machine", "5 min" vs 60 s); (8) check whether station-redact scrubs transcript.json. Needs a lawyer: D10 (bystander images to third-party AI providers). · [source](teams/review/STANDUP.md)
