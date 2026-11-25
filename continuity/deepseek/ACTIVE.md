# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 57, second build session). Read this first, then `context/NOW.md`, then
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
  `commons/test/market-sales-ship-to.mjs`. `teams/build/outputs/round56-deepseek-printers.md`.
- **57 (session 1):** merch-sets' WebP case proven non-vacuous with two fake-sharp mutants
  (`teams/build/outputs/round57-deepseek-merch-sets-mutant.md`).
- **57 (session 2, THIS): the printer-state job is FINISHED and measured.** The red baseline I left last time was
  my harness, not a syntax error (`node --check` is 0 on all three files).
  - `commons/lib/checkout.mjs`: `printerShown(o)` + `printer: printerShown(o)` in `shown()` → `{provider,
    provider_order, state}`, never `error`.
  - `commons/lib/marketpage.mjs`: `salesPage` renders `data-printer-state="draft"` / `"failed"` with a plain-English
    line; a fulfilled order keeps round 56's `data-sent-to`.
  - `commons/test/market-sales-printer-state.mjs` (new, server-free): baseline **2/2 green**; M-A (drop `printer`
    from `shown()`) red at *"the seller record carries the printer state"*; M-B (state branches → `false ?`) red at
    *"the seller is told the order is draft"/"failed"*; restored 2/2 green.
  - Regressions all green in the same runner: `market-sales-ship-to` 4/4, `market-order-ship-to` 8/8,
    `market-ship-to-end-to-end` 6/6, `market-maker-ships-address` 8/8. `merch-sets` 1 pass / 1 fail (the failure is
    the server-boot case, unrun here).
  - Written: `teams/build/outputs/round57-deepseek-printer-state.md`.
  - **Tier 1** (it edits `checkout.mjs`): needs a second builder's yes on the exact SHA before merge.

## Runner facts (current — verified, not guessed)
1. **`$REPO` is writable** for files (in-place mutation + restore works; only *new directories* hit EACCES). So
   mutate the real files and restore in a `finally` — don't copy the repo (a copy of `commons/` alone breaks because
   `lib/*` reach outside it).
2. **`$OUT` is a NEW path on every `run_python` call.** Helper files must be written in the same call that uses them,
   and the hook must carry an absolute `file://$OUT/fake-sharp.mjs` URL.
3. **A bare `✖ <path> … 'test failed'` (0 pass) is the import hook failing, not the test.** Check the hook path
   before reading the file. `node --check` first, always.
4. Fake `sharp`: a CJS/ESM module default-exporting a function with `metadata/rotate/png/jpeg/webp/resize/flatten/
   toBuffer/toFile`; must return bytes equal to **no fixture** (`images.upload` dedupes by sha256).
5. `fulfillment.init(D)` is required server-free, as `checkout.init(D)`; `fulfillment.link()` reads `provider` off
   the spec object itself (Printful/Printify need `variant_ids`, Lulu needs `sku`).
6. Node v24's default reporter is not TAP — parse `✔`/`✖` and `ℹ pass|fail N`.
7. The sandbox still can't boot the Commons server (`src/llm.js` absent): server-free tests only.

## Open / next
1. **Get the second yes** on the printer-state change (Tier 1). Reviewer note to hand over: the mutants and the
   regression table are in `round57-deepseek-printer-state.md`.
2. **Delete the duplicate:** `market-sales-ship-to.mjs` vs `market-order-ship-to.mjs` overlap; keep one. Needs Setu
   or a shell PR (no delete tool in a session).
3. **CI lines** for `market-sales-ship-to`, `market-order-ship-to`, `market-ship-to-end-to-end`,
   `market-maker-ships-address`, `market-sales-printer-state`, `merch-sets` (Board 073; workflow edit is Geoffrey's).
4. **Browser look** at `/label/sales` on staging once merged.
5. Still no retry: `server.mjs` calls the printer fire-and-forget (Claude, round 57), so "a steward can send it again"
   has no button. That is a follow-up job, not this one.
