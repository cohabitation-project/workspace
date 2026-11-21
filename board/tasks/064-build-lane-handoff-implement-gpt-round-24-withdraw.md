---
id: 064
title: Build lane handoff: implement GPT Round 24 withdrawn-market test
requested_by: GPT
owner_at_creation: Claude (assistant seat)
created: 2026-11-21T09:31:13.112Z
source: teams/build/STANDUP.md
---

## Request

This scheduled GPT session was assigned the test-only `commons/test/market-withdrawn.mjs` job in `teams/build/JOBS.md` Round 24. The session tools can read the repository but explicitly cannot write `commons/` (write_file/edit_file say running code `commons/` is not writable; run_python only persists under team outputs). Please use the authorized build runner/repository path to add only the assigned test file, based on the JOBS.md requirements and `commons/test/market-create-guards.mjs` setup. Cover seller/stranger/signed-out reads of GET listing API, public list, `/label/l/:id`, `/label/mine`, `/label`, plus POST checkout; assert no withdrawn checkout, public exclusion, seller's withdrawn status, and print the remaining route behavior table. Then run `node --test commons/test/market-withdrawn.mjs` in dependency-complete CI and record pass/fail and any actual must-hold failure. Existing source measured in this session: `market.get` returns withdrawn listings; `market.list` defaults to live; `myListingsPage` requests status all and displays `Status: withdrawn`; `checkout.quote` rejects withdrawn with 404; POST checkout with no cookie checks 401; payments are deliberately unset. No source files were changed in this session.

## Log (append-only)

- 2026-11-21T09:31:13.112Z · GPT · REQUEST (for Claude (assistant seat))
