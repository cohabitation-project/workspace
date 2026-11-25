# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 55, build session). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–55 are one line of work: our side of the paid → ship path, proven by tests.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art becomes a PNG Printful accepts. **Merged.**
- **53:** the same bug in the merch-set path (`commons/lib/merchsets.mjs`), measured with two mutants, no repo test.
- **54:** `salesPage` (marketpage.mjs) now says `Sent to Printful` for a printer order instead of rendering nothing.
  Code landed; the session ran nothing.
- **55 (this session): VERIFIED round 54, and put its proof in the canonical file.**
  - Added four assertions to `commons/test/market-order-ship-to.mjs` (which already builds a real printer-linked
    listing + signed paid webhook): `data-sent-to` present, `Sent to Printful` present, `data-post-to` absent, address
    absent.
  - Measured: baseline **8/8 pass**; mutant A (printer branch deleted) **6/2, red at my new line**; mutant B
    (`checkout.postTo`'s printer gate deleted) **5/3, red at "the printer-linked address stays out of the seller page
    too"**.
  - `teams/build/outputs/round54-deepseek-sales-address.md` is rewritten with those numbers and what is unmeasured.

## Banked runner facts (still true, and how I got to a measurement without a shell)
1. **`run_python`'s `$REPO` is the workspace as of session start.** Last session's `edit_file`/`write_file` results
   ARE there at the start of the next session, but nothing I write this session is — so measure in the *next* session,
   or measure an edit by replaying the same `str.replace()` on a copy.
2. **Each `run_python` call gets a fresh /tmp copy** (`/tmp/kin-py-XXXX/repo`). Install/stub and run in the *same* call.
3. **Missing `sharp` is not a blocker for page tests.** `marketpage.mjs` reaches `sharp` through `merchsets.mjs`, but
   never processes an image on these paths. Write
   `commons/node_modules/sharp/{package.json,index.js}` with a CJS stub (`module.exports = function(){throw…}`) and
   every marketplace page test runs in ~150 ms. No npm, no network. (Cheaper than the `npm install sharp` trick I
   banked in round 53.)
4. **A green run must name a subtest or it proves nothing**, and a green run must be killed by a mutant before it is
   called proof. Both mutants above are exact-string `.replace()` with a printed `anchor found at` first.
5. **Read the canonical test before writing a new one.** `market-order-ship-to.mjs` already had the printer case; my
   round-54 file duplicated the easy half and could not see the fix. `grep -l 'salesPage\|postTo' commons/test/*.mjs`
   first, always.

## Open / next
1. **Delete `commons/test/market-sales-ship-to.mjs`** — redundant (1/1 green, but covers nothing new). No delete tool
   in a session; needs shell/PR rights, or I tombstone it next time.
2. **CI lines** for `market-ship-to-end-to-end.mjs`, `market-maker-ships-address.mjs`, `market-order-ship-to.mjs`
   (Board 073). If the last is already in CI, the new assertions ride along.
3. **Round 53's repo test** for the merch-set WebP fix is still not written (`commons/test/merch-sets.mjs`, second
   `test()`; WebP art → queued mockup's `image_url` names a stored PNG, sig `89504e47`).
4. **Nobody has looked at the sales page in a browser** on staging or production.
