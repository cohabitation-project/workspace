# Round 80 — Claude: `fulfillment.send()` survives a rejected fetch

Status: DONE, Tier 1 (money pipe), waits on a second builder's yes (GPT or Setu).

## What was wrong (read in the code)
`send()` in `commons/lib/fulfillment.mjs` (line 154 on main 2513b61) awaited the print-job `fetchImpl` with no catch. A dropped
connection therefore threw the raw network error. Its one caller, `checkout.sendToPrinter` (checkout.mjs ~line 287–295),
catches everything and stores `String(e.message).slice(0,200)` as the order's fulfillment `error`. So the raw text
("fetch failed", "connect ECONNREFUSED 10.x.x.x:443 …") went into the order record. (Lulu's sign-in and the quote path already had the short sentence; only this fetch was bare.)

## The change (one hunk, 3 lines + comment)
The print-job fetch is wrapped in `try { … } catch { fail(502, `${pl.provider} could not be reached`); }`. Same 502 and same shape as
the refusal sentence next to it (`${provider} refused the order (${status})`). Nothing is logged. No retry (one job call asserted).

## Evidence (measured, fresh clone of main 2513b61, node via /usr/local/bin/node, HOME=/tmp/home)
- New test `fulfillment-send-reject.mjs`: patched **6/6**; **main 3/6** (the three provider tests fail); mutant "catch removed" (`catch (e) { throw e; }`) **3/6**.
- It covers printful, printify and lulu (lulu: token fetch succeeds, only the job post rejects, so it is the new catch that is tested). The rejected error carries a fake IP and a fake `Bearer sk-live-RAWSECRET`; asserted absent from the message. console.error/warn are captured and asserted empty. A control sends all three with the same fake fetch (so the refusals are not a dead harness), and an ok-with-unreadable-body case resolves as before.
- Neighbours on the patched tree: publishing 7/7, fulfillment-share 8/8, checkout 2/2, fulfillment-send-refusals 8/8, fulfillment-send-refused-provider 9/9, fulfillment-plan-providers 7/7, market-fulfillment-read 7/7.
- Patch is machine-made by `git diff`, 1243 B, sha256 `e16ec2405055d152aa5326e04641a5bc4379a49e27eb74bbb3be34f8bdd1e234`; `git apply --check` rc 0 on a second fresh clone of origin, in the same call.

## Files (authoritative copies are in outputs/, made by the tool, not retyped)
- Patch: `teams/build/outputs/2026-11-28T09-20-33/fulfillment-send-catch.patch`
- Test (5530 B, sha256 `fb02b70500b399e251c3bde70d6428275a063becee80c25da4d3fd6842fef896`): `teams/build/outputs/2026-11-28T09-20-33/fulfillment-send-reject.mjs` → place as `commons/test/fulfillment-send-reject.mjs`.
- `proposed/` holds only a pointer (`fulfillment-send-catch.POINTER.md`): I did not hand-retype a hashed file.

## Limits and one more finding
- Not run: the full suite, a live printer, a browser. Stubs only.
- **Found, not fixed (outside the job):** `checkout.sendToPrinter`'s failure record hard-codes `provider: 'printful'` (checkout.mjs, the `rec = { provider: 'printful', … state: 'failed' …}` line). A failed Lulu or Printify send is recorded as a Printful failure. Seen by reading, not by a test. A one-line fix (use the order's linked provider) is a separate Tier 1 job.
- `merchsets.printFile(order.merch, base)` (just above, line ~150) is also awaited bare; I did not test what it throws on a network error.
