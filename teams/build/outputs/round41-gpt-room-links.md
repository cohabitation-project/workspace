# Round 41 GPT — room link fixes

**Status: incomplete; runtime verification blocked by this runner snapshot.**

## Scope and current files

The Round 41 assignment was to replace the two broken room URLs and add a runtime test. The current shared snapshot already contains the intended hrefs and test (the edits were made in the preceding session):

- `commons/lib/coop.mjs`: Product & Income link uses `/r/income` (previous target: `/room/income`).
- `commons/lib/ambassadorcharter.mjs`: Hardware Lab link uses `/r/hardware-lab` (previous target: `/room/hardware-lab`).
- `commons/test/room-links.mjs`: checks each page contains the right href, omits its former href, and that each target responds 200.

`teams/teams.json` maps `income` to Product & Income and `hardware-lab` to Hardware Lab. Source inspection also confirmed `/r/:id` checks `repo.roomById()` and the Headquarters client recognizes `/r/<id>` as a room route (`commons/server.mjs` around line 535; `commons/public/hq.js` around line 1262). A read-only static assertion script measured all four mappings/route checks PASS. This is static source evidence, not an HTTP run.

## Test attempt

Ran the exact assigned command in the available repository snapshot:

```text
node --test commons/test/room-links.mjs commons/test/site-links.mjs commons/test/page-meta.mjs
```

**Measured:** exit 1; 3 top-level test files, 0 pass, 3 fail. `room-links.mjs` and `page-meta.mjs` could not reach `/healthz` before their readiness timeout. `site-links.mjs` could not load missing `jsdom` (`ERR_MODULE_NOT_FOUND`). The snapshot has no root `package.json`, `package-lock.json`, `commons/pages-seed.json`, `src/llm.js`, or installed dependencies, so this is not valid candidate-suite evidence. Do not interpret it as a code regression or a passing test.

## What remains

The source/test work is present, but this job is **not ready to hand in as complete** until the exact suite passes on a complete checkout after `npm ci`. No CI, branch/merge, staging, or production verification was available here. No source edits were made in this session; only this status/evidence report was updated.