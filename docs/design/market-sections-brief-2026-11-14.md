# Market sections: each one works like its own site (design brief, 2026-11-14)

*Setu, from Geoffrey's direction today: "Each one of these sections needs to almost operate like its own website. An
artist needs to understand what's going on, how they can submit work, how they can set up a page, and then the page of
what an artist page looks like from a person looking at it, and what it looks like from where they're editing it, and
how they can control their drop shipping and design their products. You can't just give me a layout with some cards."
And: "look at the music page... that's got almost the most proper way of presenting what we're doing."*

This replaces the cards-only direction in PR #129. It builds on Ash's dropshipping + distribution spec
(Commons contribution `c_mwgw6dj81v036621`), Aletheia's research and wiring map
(`docs/design/marketplace-v2-creator-first-research-and-wiring-2026-11-14.md`), and the existing code.

## The model: the Music section

`/label?cat=music` (`musicLanding` in `commons/lib/marketpage.mjs`) already does what every section needs:
a hero that speaks to the creator ("Your music. Your identity."), a main action (create your artist or band page),
three numbered steps (identity → work → community), a plain statement of values, and only then the discovery grid.
Every other section gets the same shape, with its own words and its own creator tools.

## Every section has five screens

| # | Screen | Who it's for | What it must answer |
|---|---|---|---|
| 1 | **Section home** | Creators and visitors | What this is, why here, the main action, how it works in 3 steps, then featured creators and work |
| 2 | **Start here (creator guide)** | A creator deciding to join | How to submit work, how to set up a page, what's allowed (rights, human/AI/hybrid labels), what it costs (fees once voted; today: nothing is sold yet), what's live now vs coming |
| 3 | **Public creator page** | A visitor | The creator's identity, banner and portrait, bio for that craft, their works and products, how to ask or commission, human/AI/team label |
| 4 | **Creator studio (edit view)** | The creator, signed in | Edit page, add/arrange works, create products, see questions, connect fulfilment, see what's live |
| 5 | **Product / work page** | A visitor | The piece, its pictures, options, price state, who made it, ask a question |

Existing pieces to build on, not rebuild: artist/maker and band pages (`orgpages`, kinds `artist`, `band`,
`business`, `label`), `/page/new`, `/page/:slug`, listings (`/label/new`, `/label/l/:id`, edit, withdraw, ask),
member profiles `/m/:id`. Screens 2 and 4 are the big gaps today.

## The sections, and what is special in each

Geoffrey's settled order of doors (2026-11-12): **music distribution, writer publishing, artist dropshipping**, plus
video on the Feed and a software store later.

1. **Music** (exists). Keep it. Add screen 2 (distribution via the label's DistroKid account, the royalty pots that
   DistroKid doesn't collect, per Ash §3) and screen 4.
2. **Writing & Publishing** (new section). Write in the Journal, publish from it; ebook + paperback; Pressbooks for
   making the book, Lulu Direct prints and ships (Ash §4). Studio shows drafts, formats, print quote.
3. **Art & Merch** (today "Arts & Crafts"). Two kinds of work: originals the artist sells or commissions, and
   **merch** made through print-on-demand. The studio's "Products" area is where the artist controls dropshipping:
   design on the provider's own tool (Printful Design Maker / Printify Product Creator, per Ash §2.5, we build no
   designer), connect the products, set the retail price, see each order's cost split. Buyer-side "customize your
   cup" is phase 2 (rent, don't build).
4. **Video & Design.** Reels, commissions, service packages (quote / fixed / packages already exist in listings).
5. **Software & Hardware.** Apps, code, kits, robotics; license, compatibility, repo/docs links (Aletheia's map).

## Honest states (must be visible on every screen)

- **Live now:** making a page, listing work, getting public questions, labels for human/AI/team.
- **Coming:** checkout and payouts (needs the entity, seller of record, Stripe Connect), fulfilment connections,
  distribution. Show these as "coming" with what they'll do, never as working buttons.
- Coins: things released on the network can be bought with Cohabi coins (Geoffrey, decision #6). Show the coin price
  only where the decision applies, and nothing as live until the wallet supports it.

## Example creators

Geoffrey wants example creator pages so sections aren't empty, which disappear as real members join. Each is marked
**Example** on its card and page, uses an invented name, has no prices, sales or reviews, and lives in one file so it
can be removed in one go. A section hides one example per real creator who joins it, until none are left.

## Open decision to raise with Geoffrey (not decided here)

Ash's spec recommends a separate WooCommerce + Dokan store for checkout and dropshipping. The Commons already has its
own market code with pages, listings and profiles. Running both means two stores and two logins. Options: keep the
Commons market as the storefront and connect Printful/Printify/Lulu to it through their APIs, or move checkout to
WooCommerce and link to it. This changes what screen 4 connects to, so it should be settled before the studio is built.

## How we work it

1. **Aletheia** designs **one section end to end first, Art & Merch**: all five screens, desktop and phone, inside
   the shared Cohabi header and bottom bar. Then the same pattern for the others.
2. **Ash** checks the creator guide and studio against his fulfilment spec.
3. **Setu** builds exactly what's approved, wires it to the existing routes and data, tests, and sends Geoffrey real
   screenshots. Nothing merges until Geoffrey says go.
