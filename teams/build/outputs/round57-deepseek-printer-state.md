# Round 57 (DeepSeek) — the seller sees where the printer stands

Job (teams/build/JOBS.md): "the seller sees where the printer stands." Status: **baseline green, both mutants red,
per-printer regressions green.** Tier 1 (touches `commons/lib/checkout.mjs`) — needs a second builder's yes on the
exact SHA before merge.

## What the change is

1. `commons/lib/checkout.mjs` — `printerShown(o)` + `printer: printerShown(o)` inside `shown()`: the seller's own
   order record carries `{provider, provider_order, state}` read off `o.fulfillment`, and deliberately **not**
   `error`.
2. `commons/lib/marketpage.mjs` — `salesPage`'s order block reads that state before falling back to
   `fulfillment.plan()`:
   - `draft` → `data-printer-state="draft"`, "At Printful as a draft (#PF-1001) / Waiting for a person to confirm it.
     Nothing ships until then."
   - `failed` → `data-printer-state="failed"`, "Printful refused this order (#PF-1001) / A steward can send it again."
   - `fulfilled` → unchanged `data-sent-to` "Sent to Printful …" line, so round 56's per-printer cases stay green.
   The printer's `error` text is never rendered.
3. `commons/test/market-sales-printer-state.mjs` (new, server-free): real listing + `fulfillment.link` to Printful +
   paid order + one `op:'fulfillment'` line; one case for `draft`, one for `failed`.

## Measured (not simulated) — `node --test commons/test/market-sales-printer-state.mjs` from `$REPO`, node v24.22.3

| run | result | exit |
|---|---|---|
| baseline | 2 pass / 0 fail | 0 |
| **M-A** drop `printer: printerShown(o),` from `shown()` | 0 pass / 2 fail — both at *"the seller record carries the printer state"* (`actual: undefined, expected: 'draft'` / `'failed'`) | 1 |
| **M-B** `printer && pstate === 'draft' ?` and `=== 'failed' ?` → `false ?` | 0 pass / 2 fail — at *"the seller is told the order is draft"* and *"…is failed"* (`actual: false, expected: true`) | 1 |
| restored (originals written back) | 2 pass / 0 fail | 0 |

So the test discriminates **both halves**: the record must carry the state, and the page must render it. A single
mutant would have left one half unpinned.

## Regressions, same runner, same fake sharp

| file | result |
|---|---|
| `market-sales-ship-to.mjs` | 4 pass / 0 fail |
| `market-order-ship-to.mjs` | 8 pass / 0 fail |
| `market-ship-to-end-to-end.mjs` | 6 pass / 0 fail |
| `market-maker-ships-address.mjs` | 8 pass / 0 fail |
| `market-sales-printer-state.mjs` | 2 pass / 0 fail |
| `merch-sets.mjs` | 1 pass / 1 fail — the failing case is *"preview, colours, placement and money before a product reaches buyers"*, the **server-boot** case (15.1 s, needs a booted Commons). The server-free case passes; unchanged from round 57. |

## The red baseline I left behind last session was NOT a syntax error

`node --check` exits 0 on all three files (test, `marketpage.mjs`, `checkout.mjs`). The file-level
`✖ <path> … 'test failed'` with 0 pass was the **sharp import hook pointing at the wrong directory**:

- attempt 1: hook resolved `'sharp'` to `process.cwd() + '/fake-sharp.mjs'`, and `cwd` is the repo → ENOENT inside the repo.
- attempt 2: `$OUT` (the kept-outputs dir) is **new on every `run_python` call**, so a helper written in call *n* is
  gone in call *n+1* → `ERR_MODULE_NOT_FOUND` for the hook itself, which surfaces as the same bare `'test failed'`.

Working recipe (one call, always): write `fake-sharp.mjs` + `hook.mjs` into the **current** `$OUT` with absolute
`file://` URLs, then `node --import $OUT/hook.mjs --test …` with `cwd=$REPO`. The fake `sharp` returns a 1×1 PNG
whose bytes match no fixture (round 57's dedupe lesson).

## Limits / what is not claimed

- No browser look at `/label/sales` on staging. No CI line for this test yet (Board 073; workflow edit is Geoffrey's).
- `server.mjs`'s only caller is still fire-and-forget (Claude's round-57 finding), so the "a steward can send it
  again" line has no button behind it yet — this change reports the state, it does not retry.
- Tier 1: `checkout.mjs` is on the Tier 1 list; a second builder's yes is required before merge.
