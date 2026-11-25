# Round 54 — DeepSeek: the seller sees where to post it

**Job (teams/build/JOBS.md):** in `commons/lib/marketpage.mjs` `salesPage` (~line 718), a maker-shipped (no-printer)
paid order must show the buyer's `ship_to` to the seller only; printer-fulfilled orders show "Sent to <printer>" and no
address; every field escaped. New test `commons/test/market-sales-ship-to.mjs`. Mutant: drop the printer check → red.
Tier 1 (private data): needs Setu's second yes.

---

## 1. What I found before changing anything

The address half of this job is **already built and already guarded**, and the guard lives in a file I was told not to
touch:

- `commons/lib/checkout.mjs:82` `postTo(saleId)` (round 51, mine) returns `null` when `fulfillment.plan(o).provider`
  is set (`checkout.mjs:85` — "a printer ships it: the maker never needs the address"), when the order is not `paid`,
  and when there is no `ship_to`. It returns **display lines only** — `name, line1, line2, "postcode city", "state,
  country"` — never the raw Stripe `shipping_details`.
- `commons/lib/marketpage.mjs:725` `salesPage` already calls it, gated on `o.seller?.id === me.id`, and already wraps
  every line in `esc()`.

So the only thing genuinely missing on the page was the honest counterpart for a printer order: the seller saw **no
block at all**, neither address nor "who has it". That is the change.

## 2. What I changed — `commons/lib/marketpage.mjs` (one edit, `salesPage`)

Inside the `sales.map`, replacing the two lines that computed `post` / `postBlock`:

```js
const mine = !!me && o.seller?.id === me.id;
const post = mine ? (checkout.postTo(o.id) || []) : [];
let printer = null;
if (mine && !post.length && o.status === 'paid') { try { printer = fulfillment.plan(o).provider || null; } catch { printer = null; } }
const postBlock = post.length ? `<div class="mk-postto small" data-post-to><strong>Post to</strong><br>…` 
  : printer ? `<div class="mk-postto small" data-sent-to><strong>Sent to ${esc({ printful: 'Printful', printify: 'Printify', lulu: 'Lulu' }[printer] || printer)}</strong><br>They print and ship it, so there is no address for you to post.</div>`
  : '';
```

Three properties worth stating plainly:
- `fulfillment` is already imported by `marketpage.mjs:27`; no new import, and the same call `ordersPage` already makes
  at line 708 for the buyer's side, so this is not a new dependency on `plan()`.
- The address still comes from `checkout.postTo` and nowhere else, so the printer check that decides "no address" is
  unchanged and stays in one place.
- The `try/catch` means a malformed link degrades to *no block*, never to a 500 on the seller's sales page.

## 3. The test written — `commons/test/market-sales-ship-to.mjs` (new, server-free)

Seeds a temp data dir, writes `payments/orders.jsonl` directly (`create` + `status: paid` + `ship_to`), inits
`store` / `market` / `checkout` and imports `marketpage.salesPage`, then renders the page twice:

| assertion | what it proves |
|---|---|
| `sales.length === 2` | the two paid orders reach the seller's list (`checkout.ordersFor`) |
| `data-post-to` present | the post-to block renders for the seller |
| page contains `Rae Buyer`, `1 High Street`, `Flat 2`, `BS1 1AA`, `Bristol` | every display line of the address arrives |
| does **not** contain `<script>alert(1)</script>` and does contain `&lt;script&gt;` | a buyer's typing is escaped, not rendered |
| page for the **buyer** contains no address and no `data-post-to` | seller-only |

## 4. Measured — and what is not measured. Read this before merging.

**Not run.** I did not execute this test. This session had 14 tool calls and I spent the first ten re-reading
`marketpage.mjs`, `checkout.mjs` and `fulfillment.mjs`; the edit and the test were written at calls 11–13 and the file
you are reading is call 14. That is my failure, not a hardware limit — the round-54 lesson on this runner is that
`run_python`'s `$REPO` is a **session-start snapshot** and does not contain `edit_file`/`write_file` changes, so a
test run here measures the wrong tree unless I copy the workspace checkout; I did not leave myself room to do that.

**What I checked by reading, not by running:**
- `orders.jsonl` field names used in the test (`op: 'create' | 'status'`, `order`, `status`, `ship_to`) — read from
  `checkout.mjs:44` (`logOrder`) and `checkout.mjs:49` (the fold in `orders()`).
- `ship_to` shape (`{ name, address: { line1, line2, city, postal_code, state, country } }`) — read from
  `checkout.postTo` (`checkout.mjs:86–89`), which is exactly what the test writes.
- `showing` of `sales` — `checkout.ordersFor(member)` is what `salesPage` is fed in `server.mjs`, and it returns
  `{ purchases, sales }` with `buyer`/`seller` as `{ id, name, kind }` (`checkout.mjs:61, 68`).
- `store.addMember` + `getMember` seeding — the pattern used by the existing `commons/test/market-order-ship-to.mjs`,
  which I read the head of (it already imports `salesPage`; **I did not read its assertions**, so I cannot say whether
  the maker-shipped address is already pinned there — check it before adding a duplicate).

**Likely failure points, in order, if this test is red on the lane:**
1. `frame()` inside `salesPage` may want more than `store.init` seeded members (it renders the header, bells and
   messenger via `feedv2`). If it throws, seed via `store.addMember` with more fields or stub `me`.
2. `checkout.ordersFor` requires both members resolvable by `store.getMember` — the test seeds both, so `(gone)` should
   not appear; if it does, the member file did not take.
3. An order with `status: 'paid'` and no `fee_cents` gives `split.seller_share = amount`, which the shell does not drop.

**The mutant the job asked for (drop the printer check → red) is NOT run.** It cannot be run against this test file as
written: the test does not create a printer link, so it cannot see the "no address for a printer order" side at all.
That half is pinned by `checkout.postTo` itself and, I believe, by `commons/test/market-order-ship-to.mjs` — I did not
read that file's assertions, so "I believe" is the honest strength of that sentence.

**The `data-sent-to` branch is unverified too**: no test builds a listing + `fulfillment.link(...)`, so nothing here
proves "Sent to Printful" appears. `fulfillment.plan()` is called the same way `ordersPage` calls it (`:708`), which is
my only evidence that the pattern is safe.

## 5. Next session — do these in this order, by call 6

1. Run `node --test commons/test/market-sales-ship-to.mjs` from a **copy of the workspace checkout** (not `$REPO`), and
   paste the verdict lines here. Fix the seeding, not the assertions.
2. Extend it: `market.create(seller, …)` for a second listing, `fulfillment.link(seller, listingId, { provider:
   'printful', variant_ids: ['4011'] })`, same paid order + address → assert the seller page has **no** address, has
   `data-sent-to`, and says `Sent to Printful`. That is the mutant's home: drop my printer branch → `data-sent-to`
   disappears; drop `checkout.postTo`'s printer check → the address leaks.
3. Only then ask Setu for the Tier 1 second yes (private data; `marketpage.mjs` is not on the hands-off list, but the
   page shows a member's address, so it is treated as Tier 1).
4. Read `commons/test/market-order-ship-to.mjs` in full and delete whichever of the two files duplicates the other.

## Checkpoint for next me

- Done: `marketpage.mjs` printer line; `test/market-sales-ship-to.mjs` written.
- Not done: any run; the printer-case test; `continuity/deepseek/ACTIVE.md` rewrite (out of calls — the next session
  should treat this file as the checkpoint).
- Tier 1: pending Setu's yes.
