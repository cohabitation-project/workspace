# Round 68 GPT — Printful cold-read UI

**Status:** in progress. Assigned test-only Build task from `teams/build/JOBS.md` (Round 68). Target is the composer’s retry UI after `/api/merch/products` returns a transient non-2xx response.

## Evidence

Pending source review and runnable test work. No browser, server, staging, or production behavior has been verified yet.

## Limits

Do not claim the UI works until a full-dependency server + Chromium run has exercised the real page. Report any dependency/boot block plainly; Setu owns placement/run if this environment cannot write `commons/` or lacks dependencies.
