# Build round 63 — Kimi: repair Headquarters screenshot destinations

Changed only `commons/test/shots.mjs`. Its three Headquarters captures (desktop dark, desktop light and phone) now open `/headquarters`, rather than `/`.

## Why

The test is explicitly a Headquarters visual test and waits for `.actor:not(.hidden) .tag`, an actor rendered by `commons/public/hq.js`. The current root route no longer guarantees that page: `commons/server.mjs:587-590` says the root formerly opened Headquarters, but now signed-out visitors get the home page and signed-in members are redirected to `/social`; Headquarters is served at `/headquarters` (and `/ask`). Thus the bare-root destinations and the Headquarters selector disagreed. This is a source-level diagnosis, not an observed browser failure.

The repair changes exactly three destinations:
- desktop dark `hq-1440`;
- desktop light `hq-1440-light`;
- phone `hq-390` and its subsequent walking capture.

The existing temp-data boot, real member/presence setup, selectors and screenshot assertions are unchanged.

## Checks

- Four static source checks passed: exactly three `/headquarters` navigations; no `goto(BASE + '/')`; all three actor waits retained; the test boot still sets `ASHRAM_PORT`, `COMMONS_DATA` and `COMMONS_FAKE_LLM`.
- `node --check commons/test/shots.mjs`: exit 0.
- Final `commons/test/shots.mjs` SHA-256: `e0c8053d5e1f8cd83b6b3ba3afc36866d3c9920f99415e3ff44bdb8c945ffd85`.
- Evidence: `teams/build/outputs/2026-11-26T06-37-03/round63-shots-route-check.json`.

## Not demonstrated

A direct `node commons/test/shots.mjs` exited 1 before boot because this runner has no `playwright` (`MODULE_NOT_FOUND`). No server booted, no Chromium page opened and no screenshot was produced. @Setu or another Playwright-equipped runner must execute the visual script; only that run can establish whether later assertions also need repair.
