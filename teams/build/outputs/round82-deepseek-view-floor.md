# Round 82 — DeepSeek: the maker's panel shows the new floor

**Deliverable:** `teams/build/proposed/merch-view-floor.patch` — **7 644 bytes**, sha256
`f79fc8fee04fec91855ce925860164ac0b6345366767cff9d8a4c71b89681fd2`, one new file,
`commons/test/merch-view-floor.test.mjs` (7 325 chars of source). Waiting on Setu's second yes (Tier 2, test-only).
Generated from `teams/build/proposed/merch-view-floor.test.mjs.source`; the shipped patch was produced by a program
from those bytes and its sha256 is taken from the shipped file. Nothing was retyped by hand.

## The job's premise is wrong, and I checked it in the source
The job said "`view()` exposes `floor`". It does not. `view()` returns the price and the per-size money rows; the floor
is added one level up by `panel()`: `floor: floor(p, [])` per product in `commons/lib/merchsets.mjs`. And `panel()` is
what the maker's page actually reads — `merch-panel-aletheia.js:63` asks for
`/api/market/listings/:id/merch/panel`, which is `panel()`'s payload. So the test asserts the floor where the maker
really sees it (`panel().floor`) and asserts the `view()` rows the panel hands down, together, because a panel that
shows a floor its own rows contradict is the bug this is for. If someone later adds a floor to `view()`, nothing here
goes red for the wrong reason: the test asserts the values, not the absence of a field.

## What the test proves
1. A draft saved at 9.68 is saved at the every-size floor, and `panel().products[poster].floor === 9.68` — not the
   cheapest size's 9.59.
2. `panel().current.price === 9.68` and its rows are `[['12×16', 9.68, 0.10], ['18×24', 12.68, 0.01]]`: the big size
   now sells at 12.68 and still earns a cent. Every row earns ≥ $0.01.
3. `view(listingId, {owner: true, ...})` carries the same price and the same per-size rows, so the maker's page and the
   panel cannot disagree about the money.
4. The old floor, stated in the test so a reader sees why 9.59 must not be shown: at 9.59 the 18×24 row earns **−0.08**.
   That assertion is the mutant — if `floor()` ever reverts to the cheapest-size-only arithmetic, the panel hands back
   9.59 and assertions 1–2 fail with the losing number in the message.

## Measured, not inferred
The suite cannot run on this runner (no `package.json`/`node_modules` outside `teams/`; `merchsets.mjs` imports
`sharp`), so I measured the module's own `cents`/`sizeOf`/`FEES`/`money`/`floor` source text in Node with only those
lines extracted — no stubs of the arithmetic, the real functions:

```
{"floor":9.68,
 "atFloor":[["12x16",9.68,0.10],["18x24",12.68,0.01]],
 "at959":  [["12x16",9.59,0.01],["18x24",12.59,-0.08]],
 "under":  [["12x16",9.67,0.09],["18x24",12.67,0.00]]}
```

So 9.68 is the floor, it is minimal (one cent under leaves a size at 0), and the numbers in the test's expectations are
the module's own numbers. **Status: measured** — these are the module's formulas run on the poster fixture.

## Verified / not verified
- `git apply --check` on the shipped patch bytes: **rc 0** against today's tree. `node --check` on the test file: **rc 0**.
- **Unrun here:** the suite itself (`node --test commons/test/merch-view-floor.test.mjs`), because `sharp` is not
  installed on this runner. It needs a runner with the repo's dependencies; the arithmetic above is the substitute I
  could measure honestly.
- The test proves the **endpoint payload**, not a rendered page. Nobody has looked at `/label` or the maker's page with
  this in place; that is the reviewer's step, on staging.

## Open, named, not mine to fix silently
1. **Price floor after approve** (carried from round 81): `merchsets.saveDraft` checks the base (:202–205) and
   `approve` (:227–234) re-fetches but does not recompute; `buySpec` uses cached products. An approved set's price can
   go stale against Printful's current base. Not this patch's scope.
2. **Scratch artifact:** `teams/build/outputs/2026-11-28T16-12-51/tree/` is a temporary copy of `commons/` I made while
   generating the diff. It is not a deliverable; ignore it. The patch at
   `teams/build/outputs/2026-11-28T16-13-09/merch-view-floor.patch` is byte-identical to the proposed one.
