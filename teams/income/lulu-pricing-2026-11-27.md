# Lulu in the Marketplace: live costs + price proposal for Books & Writing
*Setu, 2026-11-27 · deliverable for t_dc2ecc2392 · cost source: a live read-only run of `scripts/lulu-cost-quote.mjs --live` against api.lulu.com (production), run by Geoffrey via Code on the Commons server, 2026-11-27 ~23:00Z. Quotes only — no print job was created, no money moved.*

## 1. What Lulu actually charges (live API, USD, excl. tax, shipped to a US address / AZ)

| Spec | Print | Fulfillment | Shipping MAIL | Shipping EXPEDITED | Landed MAIL |
|---|---|---|---|---|---|
| 6×9 paperback B&W 150pp | $5.74 | $0.75 | $5.69 | $20.74 | **$12.18** |
| 6×9 paperback B&W 300pp | $9.49 | $0.75 | $5.69 | $20.74 | **$15.93** |
| 6×9 hardcover B&W 300pp | $18.18 | $0.75 | $5.69 | $20.74 | **$24.62** |

Settled by the API's own numbers:
- **The fulfillment fee is $0.75** per order, not $1.75, same across all formats.
- Shipping is **flat by level, not by format**: $5.69 MAIL / $20.74 EXPEDITED (US). It should be shown to the buyer as its own line and passed through at cost — never silently folded into the book price.
- The big variable is print: pages and binding. Hardcover ≈ 2× the paperback at the same page count.

## 2. Landed-cost model (per US sale, standard shipping)

```
buyer pays        = list price + shipping ($5.69 MAIL, pass-through)
cost to fulfill   = print + $0.75 fulfillment            (from the table above)
payment processing= ~2.9% + $0.30 on the full charge     (Stripe, card)
co-op cut         = X% of list price                     (X is the council's to vote — see §4)
author keeps      = list − fulfill costs − co-op cut − processing
```

Worked at a **proposed X = 10%** (same shape as the Market's disclosed-cut principle; the number itself is proposed, not decided):

| Spec | List (proposed) | Fulfill | Co-op 10% | Stripe (~) | Author keeps |
|---|---|---|---|---|---|
| Paperback 150pp | $14.99 | $6.49 | $1.50 | $0.90 | **≈ $6.10** |
| Paperback 300pp | $18.99 | $10.24 | $1.90 | $1.02 | **≈ $5.83** |
| Hardcover 300pp | $29.99 | $18.93 | $3.00 | $1.33 | **≈ $6.73** |

## 3. Proposed price ranges for the Books & Writing section

Authors set their own list price inside a floor that guarantees nobody sells at a loss:

| Spec | Floor (author nets ≥ ~$1.50) | Suggested range |
|---|---|---|
| Paperback ~150pp | $9.99 | **$12.99 – $16.99** |
| Paperback ~300pp | $13.99 | **$16.99 – $21.99** |
| Hardcover ~300pp | $24.99 | **$27.99 – $34.99** |

Floors are per-spec, computed from the live cost at listing time (page count changes print cost), not a hard-coded table — the quote endpoint should refuse a list price below landed cost + cut + processing. The buyer-facing panel shows the full split live (print + shipping + co-op cut + author's share), per Geoffrey's direction: "price adjustments live, so people understand where everything is going and what it's costing."

## 4. Council decision item — what flips test mode to real paid print jobs
Nothing here turns payments on. The boundary flips only when ALL of these are true, and the first real job itself takes the spending rule (1 human + 5 council agents):
1. Seller of record confirmed (Anomaly 01 LLC) and Stripe moved from sandbox to live per the council's money rules.
2. **The co-op's cut on books is voted** (this doc proposes 10% of list; the vote may set anything).
3. A written refund/reprint policy for misprinted or lost books (Lulu reprints vs refunds — who eats what).
4. The $0.75 fulfillment fee and pass-through shipping shown in the buyer's split, as above.
5. One supervised end-to-end real order (a council member buying a real book) reviewed before the section opens to the public.

## Limits of this run
US destination only (AZ); international shipping bands not yet quoted — one more read-only run with EU/UK/CA addresses before international sales. B&W interiors only; color print is a different cost class. Tax excluded (Stripe Tax / Lulu handle by destination; not modelled here).

## Later offerings (Geoffrey, 2026-11-27 — ideas on the record, not built, not promised)
- **Editing help for tokens** — members and kin edit an author's manuscript, paid in Cohabi tokens; a different economy from the book sale itself.
- **Image generation in the flow** — covers and illustrations generated right where the author needs them.
- **Format machines for children's books** — layout tools for picture formats. Checked: Lulu provides templates and spec calculators, NOT an editor and NOT children's-layout tooling — so all three are real gaps, not duplicates of what the printer gives free.
