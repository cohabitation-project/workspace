# Marketplace — design & layout brief v0 (for Grok Bot)

*Written by Setu, 2026-11-06, at Geoffrey's request ("Grok would like to help with the design and layout of the
marketplace"). Design and layout only. No money moves in anything this brief produces.*

## The goal
The Last of the Real Estate label grows into a **cooperative marketplace**: Etsy × SoundCloud/Bandcamp, built by
and for a cooperative of humans and AIs. Artists list music, art and goods. Listeners stream and follow. The co-op
offers services (streaming, distribution, social posting/promotion). It is the main room behind the public
porch, **cohabi.org** (the social feed up front, with doors to the Label/marketplace, to Headquarters, and to
"see the community that built this").

## Decided (by Geoffrey, 2026-11-06; don't redesign these)
- **Services are cash-only, for everyone.** Members get services included up to a cap; beyond the cap they pay
  cash like non-members. Cash goes to the reserves.
- **Tokens are never accepted for services.** Tokens are for work between members (job boards) and for store
  goods (the existing /store), and that second channel is disclosed to counsel.
- **Not yet decided, so the design must leave room for both:** supporter accounts vs co-op members; the size of
  the cap; equal monthly allocations for every member (the rules draft is c_mw5dqpp02eab1d01).

## Hard constraints
1. **The buy/checkout button is OFF**, shown disabled and labeled "opens after the council vote and legal
   review." It's a shop window, not a register. No payment processor, no prices that read as offers.
2. **No proprietary reverse engineering.** Study public layouts and open-licensed code only; use REA only within
   its own DISCLAIMER.md. Adapt only what a license permits, with credit.
3. **Same visual family as the Commons:** profiles are MySpace-like (themes, top 8, song, custom CSS). Reuse the
   `.pf-*` styles in `commons/public/site.css` and the existing /label look rather than inventing a new brand.
4. **Mobile-first.** Profiles were rough on phones until today (01bd79b). Nothing may scroll sideways.
5. **Every human/AI item is labeled honestly**: `by: "human"` vs agent-made, as releases.json already does.
   AI-made work is never presented as human.
6. **Feed rules apply:** the marketplace is not posted to the social feed as ads. Listings live in the market.
7. **Accessible:** keyboard navigable, alt text on every image, real contrast, no autoplay audio.

## What "done" looks like for v0
- `teams/income/marketplace/LAYOUT.md`: the page map (market home, artist storefront, listing page, services
  & tiers page, the cohabi.org entry point), with what's on each page and why.
- `teams/income/marketplace/proto/`: **static HTML mockups** of those pages, using real catalog data from
  `label/releases.json`. They're viewable as files and wire nothing to the server.
- A short **"open questions" list** of what the council or counsel must decide before any of it goes live.
- Post in the Income room linking the commit, stating what you checked and what you didn't (the house style:
  read vs run vs assumed).

## Repo paths to read first
- `label/releases.json`, `label/README.md`: the real catalog (Geoffrey's albums, kin releases)
- `commons/public/label.js`: the current /label page
- `commons/public/store.js`, `commons/lib/ledger.mjs` (STORE wares, store:buy): the live coin store
- `commons/lib/pages.mjs` (`storePage`, the profile page ~L177–290) and `commons/public/site.css` (`.pf-*`)
- `docs/label-terms-v1.md`: artist terms, splits, credits
- `docs/BACKLOG.md`: the COHABI.ORG and POST PIPELINE entries
- Contribution `c_mw5dqpp02eab1d01`: the token rules draft

## How to commit
- **On a branch, never main:** `experiment/marketplace-layout-v0-20261106`. Merge to main goes through review in
  the Review room, then Geoffrey's go.
- **Cite only commits that exist.** Before you name a hash in a room, check it's in `git log` of the branch you
  name. (Your REA pin today was exact to the byte. Keep that standard.)
- Commit when confident, as Geoffrey said. If you're unsure about a design choice, commit it anyway with the
  question written in LAYOUT.md. A visible question is better than a hidden guess.

## Deadline
None set. Aim for a first pass someone can click through in a few days. Ship small and early rather than whole
and late.
