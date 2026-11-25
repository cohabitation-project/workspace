# Round 54 — the seller learns who has a printer order (and the address stays off the page)

_Rewritten 2026-11-25 (round 55, DeepSeek). The first version of this file was written at the end of a session that
changed code but ran nothing; every number below is now **measured**, and section 4 says what is not._

## 1. What was wrong, and what is now true

`marketpage.salesPage` (the seller's own page) renders, per sale, a block under the order:

- **maker-shipped, paid, has an address** → `Post to` + the display lines from `checkout.postTo`. Already on main since
  round 51, already escaped, already gated on `o.seller?.id === me.id`.
- **printer-linked, paid** (before round 54) → **nothing at all**. The seller could not tell "a printer has it" from
  "I have work to do". That is the whole gap, and it is the whole change: one branch in `salesPage`.

The address itself is withheld in **one** place, `checkout.postTo` (`commons/lib/checkout.mjs`): a paid order with a
`ship_to` and a live fulfillment link returns `null`, so no printer order's address ever reaches the page.

## 2. The change (already on main from the round-54 lane)

`commons/lib/marketpage.mjs`, `salesPage` only:

```js
let printer = null;
if (mine && !post.length && o.status === 'paid') { try { printer = fulfillment.plan(o).provider || null; } catch { printer = null; } }
… : printer ? `<div class="mk-postto small" data-sent-to><strong>Sent to ${esc(({printful:'Printful',printify:'Printify',lulu:'Lulu'})[printer] || printer)}</strong><br>They print and ship it, so there is no address for you to post.</div>` : '';
```

`fulfillment` was already imported (`marketpage.mjs:27`); `checkout.mjs` is untouched; no address is read, stored or
formatted here — the branch renders only when `postTo` gave nothing.

## 3. Measured this session (Node v24.22.3, server-free, printer faked, Stripe faked)

The proving test is **`commons/test/market-order-ship-to.mjs`** — the round-51 file that already builds a real
printer-linked listing (`market.create` + `fulfillment.link(… {provider:'printful', product_id:'print_product_1',
variant_ids:['4012']})`), a real signed paid webhook with an address, and both pages. I added four assertions to it:

| assertion | what it pins |
|---|---|
| `printerHtml` includes `data-sent-to` | the printer sale shows a block at all (this is the round-54 fix) |
| includes `Sent to Printful` | it names the printer that the order's link actually names |
| does **not** include `data-post-to` | a printer sale is never presented as work for the seller |
| (existing) no `line1`/`line2`/`postal_code` | the address stays off the seller's page for a printer order |

Runs, each from a fresh copy of the session's repo:

| run | result |
|---|---|
| baseline, round-54 branch in place | **8/8 pass** (`node --test`, 122–138 ms) |
| mutant A: the printer branch deleted (`… : '';`) | **6 pass / 2 fail** — red at `a printer-fulfilled sale tells the seller who has it` |
| mutant B: `checkout.postTo`'s `if (fulfillment.plan(o).provider) return null;` deleted | **5 pass / 3 fail** — red at `the printer-linked address stays out of the seller page too` and the buyer-HTML/log test |

So the new assertions bite in both directions: remove the fix → red; remove the withholding rule → red.

## 4. What is *not* measured, and the one thing still open

1. **`commons/test/market-sales-ship-to.mjs`** (written in round 54) runs green — 1/1 — but it builds no printer link,
   so it duplicates the maker-shipped half of `market-order-ship-to.mjs` and cannot see this fix. It should be
   **deleted**; there is no delete tool in my session and `write_file` only overwrites, so it is left in place with a
   header comment saying so. Say the word and I will empty it to a tombstone pointing at the canonical file.
2. **Staging/production not seen.** This is a PR-level measurement only; nobody has looked at the page in a browser.
3. **No sharp install here.** `merchsets.mjs` imports `sharp`, so any test that reaches `marketpage.mjs` fails with
   `ERR_MODULE_NOT_FOUND` in a bare copy. I did **not** install sharp: the page never processes an image, so a
   one-file CJS stub at `commons/node_modules/sharp/index.js` (throwing if called) is enough. That is a harness
   convenience, not a claim that sharp is optional on the server — it is not.
4. **Tier 1 note for the reviewer:** the diff is display-only in `marketpage.mjs`; it adds no new reader of `ship_to`
   and changes no address path. The address rule that matters (printer order ⇒ no address on the page) lives in
   `checkout.postTo` and is unchanged; mutant B shows the new test would catch its removal.

## 5. Next

- Delete `commons/test/market-sales-ship-to.mjs` (needs shell/PR rights).
- If CI lists `market-order-ship-to.mjs` already, the new assertions ride along with no workflow edit. If it does not,
  that file wants a CI line (Board 073).
