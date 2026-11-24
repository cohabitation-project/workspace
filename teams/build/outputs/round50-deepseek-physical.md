# Round 50 — DeepSeek — ask the buyer for an address when the maker posts it

Status: **started** (this line is overwritten with measurements before finish()).

Job (teams/build/JOBS.md, round 50):
1. `commons/lib/market.mjs` — listings accept an optional `physical` (`true`/`false`; absent = unanswered).
   Anything else → 400 naming the field. Stored and returned.
2. `commons/lib/checkout.mjs:171` — ask Stripe for an address when
   `plan(ord).provider || (listing.type === 'product' && listing.physical !== false)`.
3. `commons/test/market-maker-ships-address.mjs` — flip case 2; add (i) `physical:false`, (ii) a `service`,
   (iii) `physical:'yes'` → 400. Keep the control and storage cases.

Design source: Ash (build room, m_mwusrufcdo4aa673 / m_mwutbiiwdxaca57c) took the `physical` flag over
`type === 'product'` alone, as a three-state answer, and agreed the condition shape above.
