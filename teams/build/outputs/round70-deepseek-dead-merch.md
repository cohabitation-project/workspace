# Round 70 — DeepSeek: the dead `#mk-merch` block is out of `market.js`

Job: `teams/build/JOBS.md`, round 70, DeepSeek row. Tier 2 (marketplace), file-only, server-free.
Written 2026-11-27 ~03:35 UTC. **All numbers below are measured in this session's sandbox unless labelled otherwise.**

## What was wrong (round 69's finding, re-checked here)

`commons/public/market.js` fetched `GET /api/merch/products` and wired the print-on-demand picker (`#mf-product`,
`#mf-variant`, `#mf-go`, `#mf-scale`, `#mf-y`, `#mf-msg`) — inside `if (form && merchBox)`, where `merchBox` was
`$('#mk-merch')`. No page renders that box any more: the picker moved to the maker panel at
`/label/l/:id/products` (`commons/lib/marketpage.mjs` renders it, `commons/public/merch-panel-aletheia.js` drives it).

**Measured (grep, this session, whole `commons/` tree):**

| pattern | hits |
|---|---|
| `mk-merch` anywhere in `commons/` | **1** — `commons/public/market.js:156` only |
| `mk-merch` in `commons/lib/` | **0** |
| `data-mockup`, `mf-on`, `mf-product`, `mf-go` in `commons/lib/` | **0** |
| `mockup` in `commons/lib/marketpage.mjs` | **0** |

So the block had no page to run on. Nothing in the tree could make it do anything.

## What I changed

**`commons/public/market.js`** — removed lines 155–204 (the `// Print on demand: …` comment, `const merchBox = $('#mk-merch');`, and the whole `if (form && merchBox) { … }` block) and replaced it with a three-line comment saying where the picker went and why this file no longer talks to the print partner. Nothing else in the file changed.
- 17056 b → **13223 b**, sha256 `935e0b24a4251917295ce4a3743f2763867bddbb94ffa874e4cba6c8c51dbce3`
- `node --check commons/public/market.js` → **exit 0**

**`commons/test/market-no-dead-merch.mjs`** — new, 4609 b, sha256 `365953b0fe971d44e2c199d061f2d1e932d39923c34a9bbfcb196ab8daa02ffe`, `node --check` exit 0. Server-free: it reads files, needs no `node_modules`, no boot, no Chromium (this runner has none — see JOBS.md). Three cases:
1. `market.js` contains no `mk-merch`, no `/api/merch/products`, no `#mf-go`.
2. Every file under `commons/lib/` (recursive, sorted) contains no `mk-merch`; `marketpage.mjs` checked by name too. A guard asserts the walk read more than 20 files, so the sweep cannot pass by finding nothing.
3. `market.js` still has its live work — `/api/market/listings`, `data-buy`, `mk-checkout`, `closest('[data-printer-send]')` — so a deletion that took the file instead of the block is red; and it asks for neither the product list nor mockups.

## Measured

`node --test commons/test/market-no-dead-merch.mjs` in a copy of the checkout (`/tmp/b`), **3 pass / 0 fail**, 69 ms:

```
✔ market.js no longer drives the dead print-on-demand box
✔ no page under commons/lib renders the box the market script used to need
✔ the rest of market.js is still there (the deletion took the block, not the file)
ℹ pass 3
ℹ fail 0
```

**Mutants — each applied to its own copy (`/tmp/m1`, `/tmp/m2`, `/tmp/m3`), the repo copy untouched:**

- **M1, the box comes back** (`const merchBox = $('#mk-merch'); if (form && merchBox) { fetch('/api/merch/products'); $('#mf-go')… }` put back before the round-64 comment) → **1 pass / 2 fail**. Whole failing blocks:

```
✖ market.js no longer drives the dead print-on-demand box (1.378958ms)
  AssertionError [ERR_ASSERTION]: commons/public/market.js still mentions mk-merch (the box no page renders)

✖ the rest of market.js is still there (the deletion took the block, not the file) (0.292086ms)
  AssertionError [ERR_ASSERTION]: commons/public/market.js still asks for the product list
```

- **M2, over-deletion** (`'[data-printer-send]'` → `'[data-printer-gone]'`, 1 replacement) → **2 pass / 1 fail**:

```
✖ the rest of market.js is still there (the deletion took the block, not the file) (0.723502ms)
  AssertionError [ERR_ASSERTION]: commons/public/market.js lost closest('[data-printer-send]'), which is not part of the dead block
```

- **M3, a page brings the box back** (`// mutant: <div id="mk-merch"></div>` appended to `commons/lib/marketpage.mjs`) → **2 pass / 1 fail**:

```
✖ no page under commons/lib renders the box the market script used to need (10.351561ms)
  AssertionError [ERR_ASSERTION]: these page files render mk-merch; if the box comes back, the panel logic must come back with it, not market.js: commons/lib/marketpage.mjs
```

**The mutant earned its keep.** My first run of M2 **passed** — because I had asserted the bare string `data-printer-send`, and renaming it to `data-printer-send-removed` still contains that substring. A test that can be fooled by appending five characters is not a test. I changed the assertion to the exact selector the handler queries, `closest('[data-printer-send]')`, and M2 went red on the rerun above. The base run was repeated after that edit: still 3/3.

## Two things I found and did NOT change (named for the foreman, not silently fixed)

1. **`market.js:56` is now unreachable.** The listing-form submit handler still has
   `const merch = !id && form.dataset.mockup && $('#mf-on')?.checked;` and, further down,
   `merch ? await send('/api/merch/listings', 'POST', body) : …`. Nothing sets `form.dataset.mockup` any more (only the
   deleted block did), so that branch can never run and the composer can never POST `/api/merch/listings`. The round-70
   job said remove the box only, so I left it; deleting the branch is a two-line follow-up once someone confirms the
   maker panel is the only route into that endpoint. My test deliberately does **not** pin `/api/merch/listings`.
2. **A stale comment in a placed test.** `commons/test/merch-products-http-cold.mjs:6` says it "reads
   `GET /api/merch/products` exactly as `commons/public/market.js` does". After this change `market.js` does not read
   it at all — the maker panel does. The test itself is still valid (it measures the route's 502-and-a-sentence
   behaviour, which is the contract `merch-panel-aletheia.js` consumes); only that sentence is now wrong. I did not edit
   a test Setu placed, and did not touch `printful.mjs` (round 68/69's work stands).

## What is not proved here

- **No browser, no server.** This sandbox has no `node_modules`, so I could not boot `commons/server.mjs`; per JOBS.md I
  did not try to install it. Nothing here claims the composer or the maker panel behaves in a browser. The claim is
  narrow and measured: a block of text that no page renders is gone, and it cannot silently come back.
- **Not proved dead in production data**: that `/api/merch/listings` has no other caller. I only grepped `commons/`.
- **No staging, no production, no deploy.** Tier 2, one new test + one deletion; the runner's PR lane carries it.

## Files

- `commons/public/market.js` — the deletion (13223 b, `935e0b24…`).
- `commons/test/market-no-dead-merch.mjs` — the test (4609 b, `365953b0…`).
- `teams/build/outputs/round70-deepseek-dead-merch.md` — this report.
- `continuity/deepseek/ACTIVE.md` — checkpoint for the next session.
