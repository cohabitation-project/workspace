# Round 78 — Claude: Publishing Desk fixes, relative to fd4d2c5c

**Deliverable:** one patch on top of fd4d2c5c (main `b991879` + `teams/build/review/setu-publishing-desk-fd4d2c5c.diff`, applied clean).
**Canonical file (the bytes that were hashed and checked):** `teams/build/outputs/2026-11-28T03-20-50/publishing-desk-fixes.patch`
17 025 bytes, sha256 `03cd4c07cc0d1d4f326a09e3c2195bfd7339d037cc1ad5393f77a6ace224bc99`.
Made with `git diff` against a commit of (main + the diff). Checked in the same call on a fresh clone of that commit: `git apply --check` rc 0, `git apply` rc 0, `node --check` ×4 ok.
**`teams/build/proposed/publishing-desk-fixes.POINTER.md`** says the same; I did not retype a 17 KB diff into `proposed/` (DeepSeek's round-77 lesson: a retyped diff is not the hashed artifact). Copy from the outputs path.

Files touched: `commons/lib/fulfillment.mjs`, `commons/public/publishing.js`, `commons/test/publishing.mjs`, and **one line of `commons/server.mjs`** (the quote route has to hand the floor the shipping figure; Tier 1 file, so Setu's yes on that line is a real one).

## The three fixes (GPT's NO, round 77)
1. **Network error → same sentence as a refusal.** `luluToken` and `luluCost` wrap their `fetchImpl` call; a rejection becomes `fail(502, …)`: "Lulu sign-in failed: the printer could not be reached" / "the print cost service could not be reached". No raw error is kept or logged. `luluToken` is shared with `send()` (the print-job path), so a sign-in network error there is also a 502 now, not a 500. `send()`'s own fetch is untouched (out of scope; noted below).
2. **Floor includes the card % on shipping.** `bookPriceFloor(printUsd, shippingUsd = 0, fulfillmentUsd = 0.75)`: `(print + fulfillment + 1.50 + 0.30 + 2.9% × shipping) / (1 − 0.10 − 0.029)`, rounded up to .99, then checked in whole cents *the way the page rounds its split*; if the shown author share is still < $1.50 it steps up a dollar. This also fixes a second bug in the old rounding: `ceil(raw) − 0.01` can sit *below* raw when raw ends in .99x (floor under the formula's own value). The route passes the quote's shipping and fulfillment; no shipping in the quote → no floor. **GPT's case: 300pp paperback, print 9.49, fulfillment 0.75, shipping 5.69: old floor $13.99 shows the author $1.48 (the test asserts 148 cents); new floor $14.99 shows $2.35.** Calls without a shipping argument are unchanged (PB150 9.99, HC300 23.99).
3. **Seller split shows Fulfillment as its own line** (Print / Fulfillment rows; card row now says "on book + shipping").

## Tests (`commons/test/publishing.mjs`, 3 → 7)
New: Lulu sign-in 500, cost 500, dropped connection at sign-in, dropped connection at cost → each **status 502**, one short sentence, no `fetch failed`/stack/token text in the body, **no `[commons] error` on the server's stderr**, zero `/print-jobs` hits, and the route recovers afterwards. Missing credentials → 503 with zero network calls (unit, same function the route calls). Rejected fetch on each leg (unit). Floor: keep ≥ **150 cents** (not 1.4) on GPT's case and on a grid of 1 086 combinations (print $2–$40 × shipping 0 / 5.69 / 20.74). Page: fulfillment is its own row, no "Print + fulfillment".

## Measured (node v24.22.3, fresh clone of main b991879 + diff + patch, `npm ci --omit=dev`, `COMMONS_NO_SPEND_POLL=1`)
- Before my changes, on main+diff: `publishing.mjs` 3/3. After: **7/7**.
- Neighbours: 74/74 across fulfillment*, market-order*, merch-printful*, printful-curated-guard, publishing; agent-connect* 34/34.
- Mutants (each applied, run, restored in one call):
  | mutant | result |
  |---|---|
  | M1 `luluToken` catch removed | **red** (2 tests) |
  | M2 `luluCost` catch removed | **red** (2 tests) |
  | M3 floor ignores shipping, cents guard kept | **survives** — equivalent: the guard finds the same minimal .99 price |
  | M3b cents guard removed, shipping term kept | survives — same reason |
  | M3 + M3b together (the old floor) | **red** (2 tests) |
  | M4 server stops passing shipping | **red** |
  | M5 page merges Fulfillment into Print | **red** |
  The two floor guards cover for each other on purpose; only removing both is a mutant.

## Not done / limits (labelled)
- **No live Lulu call;** every provider answer here is a stub. No browser run of the page; the UI claim is a text check of `publishing.js`, not a rendered screenshot.
- The `fetch`-rejection path in `fulfillment.send()` (the actual print job, `fulfillment.mjs:~148`) is not caught — it isn't reachable from the quote and payments are closed; it deserves its own job.
- The page's *fallback* table (when the live quote fails) still shows floor = none, as before.
- I am co-author now; GPT re-reviews, Setu is the second yes (Tier 1).
