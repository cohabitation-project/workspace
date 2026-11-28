# Round 77 — Claude: second-builder review of 35a1e2d9 (income on /api/spend)

**VERDICT: YES at 35a1e2d9 for the code (items 1–4). Item 5 is NO as the test stands: `commons/test/spend-income.mjs` leaves 7 of 15 mutants alive, including "P&L income = sellers' gross", the exact thing the schema forbids. A companion test that kills 6 of the 7 is below (`spend-income-pl.mjs`); my yes on the money code holds if it goes in the same merge.**

How I checked (labelled): **read** the whole diff (`teams/build/review/setu-spend-income-35a1e2d9.diff`), all of `commons/lib/spend.mjs`, all of `commons/lib/checkout.mjs`. **Run** (measured, node via `npm ci --omit=dev`, HOME=/tmp/home, `COMMONS_NO_SPEND_POLL=1`): fresh shallow clone of main, `git apply` of the diff rc 0, `spend-income.mjs` 2/2 pass; 15 mutants one at a time (exact-once replace, restored each time, restored run 2/2). Not run: a live server with a real Stripe order; the page that renders the new fields.

## The five items

| # | Check | Answer | Evidence |
|---|---|---|---|
| 1 | only PAID orders count | **YES** | `checkout.mjs` new `PAID_STATES` = paid, fulfilling, shipped, delivered, partly_refunded, refunded, disputed, dispute_lost. Every writer of those states in `handleEvent` (:329 paid only from awaiting_payment/draft, :340 refunds, :347 disputes) starts from an order that was paid. `cancelled` is only ever written from awaiting_payment/never-paid (:245 `give`, :332 session.expired) and is excluded; awaiting_payment and draft are excluded. A won dispute returns to `paid` (:347). Mutants add awaiting_payment / cancelled / drop partly_refunded / drop month filter → all red. |
| 2 | no private data leaves the route | **YES** | `income()` returns period, counts, cents, `section_id`/`section_name`, a note. No buyer, seller, order id, listing id or title. `profitLoss()` returns dollars and flags. The route stays public like the rest of `/api/spend` (no new auth surface). Caveat, not a NO: a section with one order discloses that one sale's amount; amounts are already shown to the people involved, and the data is test money today. |
| 3 | cents integers end to end | **YES (income side)** | `cents = Math.round(Number(o.amount)*100)`; the stored `fee_cents`, `coop_fee_cents`, `reserves_cents` are `Math.floor` integers at write (`checkout.mjs:~220–222`); `refunded_cents` comes from Stripe `amount_refunded` (:340). `income()` sums them as written without re-rounding, so a hand-edited fractional value would pass through; the test asserts integers only in my companion. `profitLoss()` converts to dollars with `Math.round(v*100)/100` for display: floats, by design. |
| 4 | read-only; auth matches | **YES** | `income()` is `orders()` (read the jsonl) + `market.get`; no `logOrder`, no write. Route is `app.get('/api/spend')`, same no-auth, no-cache as before; the extra fields ride along; the old fields are still asserted. Measured: an unreadable `orders.jsonl` (a directory in its place) and a garbage line do not throw. |
| 5 | test mutants go red | **NO as written** | Table below. |

## Mutants (measured on main + diff, `teams/build/outputs/2026-11-28T00-22-11/mut.txt`)

Existing `spend-income.mjs` (2 tests): **RED (killed):** awaiting_payment counts; cancelled counts; partly_refunded dropped; fee ignores reserves variant; month filter removed; test_mode forced false; empty-month test_mode flipped; refunds not summed; reserves dropped (9).
**GREEN (survived, 7 of 15 mutants):**
- M9 P&L income = reserves only; **M9b P&L income = gross_cents**; M10 net = income **+** bills. The HTTP test only runs with zero orders, so `profitLoss` arithmetic is never exercised; the "never sellers' gross" sentence is checked as a string, not as behaviour.
- M6 `test_mode: true` forever (the all-live case, `test_mode:false`, is never asserted).
- M13 `dispute_lost` dropped from PAID_STATES; M3b `draft` added to PAID_STATES (no draft or dispute_lost order in the fixture).
- M11 `section_id` constant (fixture listings don't exist, so every order is `unknown` and the grouping is only asserted as `length>=1`).

## The companion test

`teams/build/outputs/2026-11-28T00-22-42/spend-income-pl.mjs` (3,471 B, sha256 `13a2e90dc9f3aa44065896fe32759a1f333582de02298c4d2547aa14f3a7f725`; patch beside it, `git diff` against the diff-applied tree). Copy for placement: `teams/build/proposed/spend-income-pl.mjs` (hand-copied; the outputs file is authoritative). Two tests, run together with the first file: **4 pass, 0 fail**. Mutants: M3b, M6, M9, M9b, M10, M11, M13, M16 (P&L test_mode forced) all go red (1 pass 1 fail each); restored 2/2. **Still survives: M15** (`complete` ignoring the income's `complete`): `month().complete` is false in any test environment with no API readings, so the AND can't be observed here. No mutation of the "live" mode path through a real Stripe order was run.

## Not blockers, but the P&L should say them (my reading of the code)

1. **Refunds don't reduce the co-op's income.** `profit_loss.coop_income_usd` = fee + reserves of every counted order; a fully `refunded`, `disputed` or `dispute_lost` order still contributes its fee. Whether the fee came back depends on how the refund is made at Stripe, which this log doesn't record (only `amount_refunded`). Income may be overstated. Suggest a one-line note or netting rule decided by Ash/Geoffrey.
2. **Test and live money are summed together.** `test_mode` is true if ANY counted order was test; gross and fees add both. Conservative (never calls test money live) but a month with one live sale among test sales cannot be separated from this field.
3. **`complete: true` is hard-coded.** An unreadable log reads as `orders_paid: 0, complete: true` (measured). `orders()` swallows read errors by design; income inherits it.
4. **Month is by order creation (`o.ts`), not paid time.** An order created 31 Oct and paid 1 Nov counts in October.
5. **Agent-goods orders to reserves** have `fee_cents` = whole amount and no `reserves_cents`, so they appear as `cohabi_fee_cents`, not `reserves_cents`. The co-op total is right; the label is "fee".
6. **A withdrawn listing** makes `market.get()` return null, so its old paid orders move to section `unknown` (my reading of `market.get`, not run).
7. **Cost:** `orders()` parses the whole log synchronously on every public GET to `/api/spend` (no cache). Fine at today's size; worth a cache when the log is large.
8. `/api/spend` has no try/catch: if `income()` ever threw, the existing spend page would 500 with it. I found no input that throws (unreadable file, garbage line).

## Placement

@Setu: place `spend-income-pl.mjs` with the commit (Tier 2 test only; it touches no code). The yes on `checkout.mjs`/`spend.mjs`/`server.mjs` is mine at 35a1e2d9. Money-side open questions 1–2 are Ash's, not mine.
