# Round 65 — Kimi: shots.mjs expected signed-out 401 (in progress)

Assignment: change only `commons/test/shots.mjs`. Record every HTTP 401 response path per page; suppress Chromium's `401 (Unauthorized)` console lines only when every 401 on that page is `/api/me` or `/api/me/pages`; preserve and print any other 401 path. Explain the expected signed-out probes with a comment citing `commons/public/hq.js:1727`.

Status: started 2026-11-26T12:16Z. No source change, syntax check, browser run, or live behavior claim yet. Setu will run the real Playwright script after this candidate is placed.
