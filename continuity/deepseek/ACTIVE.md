# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 57, build session). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–57 are one line of work: our side of the paid → ship path, proven by tests that can actually go red.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art → PNG. **Merged.**
- **53–54:** `salesPage` said `Sent to Printful` for a printer order (and nothing at all before that).
- **55:** that line pinned with a real `market.create` + `fulfillment.link` + paid order (`market-order-ship-to.mjs`).
- **56:** every printer gets its name — a `PRINTERS` loop over printful/printify/lulu in
  `commons/test/market-sales-ship-to.mjs`, one temp data dir + listing + link per pipe; dropping `printify` from the
  name map at `marketpage.mjs:733` turns exactly one case red. `teams/build/outputs/round56-deepseek-printers.md`.
- **57 (this session): round 53 is closed as a proof.** Measured, server-free, with a fake `sharp`:
  `commons/test/merch-sets.mjs`'s "set photo is made from a PNG Printful can print" case **is not vacuous** —
  M-A (`return it.id;`, i.e. hand Printful the WebP as uploaded) → red at *"Printful is never handed the WebP itself"*;
  M-B (`if (false) return it.id;`, needless copy of a PNG) → red at *"a PNG is passed through unchanged"*, but only
  once the fake sharp returns bytes **different** from the fixture. Baseline 1 pass / 0 fail both ways.
  `teams/build/outputs/round57-deepseek-merch-sets-mutant.md`. No `commons/lib` edit.
  - **New runner trap (bank it):** `images.upload` dedupes by `sha256` of the cleaned bytes
    (`commons/lib/images.mjs:139-151`). A "no copy was made" assertion is silently satisfied by a fake that returns
    identical bytes. Make fake `sharp` output distinct from every fixture.

## Runner facts (current — verified, not guessed)
1. **`$REPO` DOES contain this session's `edit_file`/`write_file` results** (verified rounds 55–56). Measure from `$REPO`.
2. **The fake-sharp stub is the best runner trick I have.** A one-file CJS module at `commons/node_modules/sharp/`
   exporting a function with `metadata/rotate/png/jpeg/resize/toBuffer` runs every marketplace page test and the merch-set
   WebP case in ~100–150 ms, no npm, no network. It must return **PNG bytes not equal to any fixture** (dedupe).
3. **`fulfillment.init(D)` is required** in a server-free test, as `checkout.init(D)` is.
4. **`fulfillment.link(member, listing, spec)` reads `provider` off `spec` itself** — keep `provider` in the object;
   Printful/Printify need `variant_ids`, Lulu needs `sku` (test-only `0850X0850BWSTDPB060UW444MXX`).
5. **Node v24's default reporter is not TAP** — parse `✔`/`✖` and `ℹ pass|fail N`. `--test-name-pattern="…"` isolates one
   `test()` and avoids the cases that need a booted server.
6. **A red baseline is never the bug under test.** Print the failure detail in the same call as the baseline
   (rounds 55 and 56 both paid for this: a missing `init`, then a missing `provider` field).
7. **The sandbox can't boot the Commons server** (`src/llm.js` missing from the snapshot). Server-free only.

## Open / next
1. **Delete the duplicate:** `commons/test/market-sales-ship-to.mjs` vs `market-order-ship-to.mjs` now overlap; keep one.
   A session has no delete tool — needs Setu or a shell PR.
2. **CI lines** for `market-sales-ship-to.mjs`, `market-order-ship-to.mjs`, `market-ship-to-end-to-end.mjs`,
   `market-maker-ships-address.mjs`, `merch-sets.mjs` (Board 073). Workflow edit is Geoffrey's.
3. **Unmeasured lead:** `printful.mjs` says "asking twice does not make two copies" (a once-guard on `printableArt`).
   No test may pin it — and the same sha256 dedupe would hide a broken guard. One call to check.
4. **Nobody has looked at `/label/sales` in a browser.** Rounds 54–57 are rendered-HTML string checks, not a visual check.
5. A fourth pipe joining `fulfillment.PIPES` would get no display name (the map is explicit) — the loop is the guard.
