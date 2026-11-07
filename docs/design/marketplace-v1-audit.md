# Cohabi Marketplace v1: Phase 0 audit and first-chunk plan
*Setu, 2026-11-07, answering Aletheia-6's "Cohabi Marketplace Build Specification v1.0" (brought by Geoffrey). Plan, not built.*

## What already exists (reuse / extend / build)
| Spec piece | In the Commons today | Verdict |
|---|---|---|
| Identity, profiles, recovery | members (store.mjs), sealed keys, recovery codes, MySpace profiles, faces. P1 rejoin fix still unmerged | **Reuse.** Merge P1 before any real money (spec §14 asks for exactly this) |
| Free member / co-op member split | every account is a member; `social_only` flag exists; cooperative application is the forest gate (/arrive); council roles exist | **Extend:** separate fields for application status, role, voting eligibility (spec §2) |
| Teams (human + AI) | groups.mjs (create/join/leave, member lists); team rooms (teams.json) | **Extend groups** into provider teams with a named human lead |
| Listings, storefronts | none. The Label (releases.json, /label) is the only catalog; the coin /store sells house goods only | **Build:** listings + a Storefront tab on the profile |
| Bounties | the Work Desk (desk.mjs): tasks, claims, hand-ins, review by a different member, coin rewards | **Reuse:** a bounty listing *is* a Desk task. Link, don't duplicate |
| Quotes, orders, project workspaces | none. The closest is the Desk's claim → submit → review loop | **Build** (chunk 2), on the Desk's state-machine pattern |
| Private messaging | none: everything is public by design | **Build carefully:** the first private space in the Commons. Needs its own access tests |
| Internal credits | ledger.mjs: hash-chained double-entry Cohabi Coins, walletView, issuance, allowance | **Reuse as-is.** It already meets spec §9B |
| Real-money payments | none (no Stripe, no checkout) | **Not built in v1.** Phase 2, after the security gates |
| External wallets | none | **Later** (Phase 4), read-only first |
| Governance | endorsements/objections, council, contributions, public record | **Integrate** later (Phase 3); no second voting system |
| Media | images.mjs (uploads, made_by credits, tags); label audio files | **Reuse** images; audio stays Label-only for now (decided 2026-11-06) |
| Database | append-only jsonl/json files, not PostgreSQL | **Keep jsonl for the MVP** (matches every other module); move orders/payments to PostgreSQL before Phase 2 |
| Search | none beyond lists and filters | **Build simple:** in-memory filter + text match is enough at our size |

## Where the spec meets earlier decisions (need Geoffrey's call)
1. **Prices.** Geoffrey's Nov 6 brief for Grok Bot: the buy button is off and "no prices that read as offers" until the
   council vote and legal review. The spec wants prices on listings. Suggestion: show the seller's asking price, labeled
   "asking price, checkout not open yet." Or no prices until Phase 2.
2. **Services are cash-only; coins are never accepted for services** (decided Nov 6). The spec agrees (§9 separates them).
   So in v1, a quote request is a conversation, not a payment.
3. **Grok Bot's layout work** (branch experiment/marketplace-layout-v0-20261106) never reached GitHub. If it arrives,
   the pages should take his layout. Until then I'd reuse the feed and profile look.
4. **Privacy.** Project workspaces would be the first non-public space in the Commons. That's a real change to the house's
   "everything is on the record" rule, so it should be named and agreed, not slipped in.

## Chunk 1 (smallest coherent piece; on a branch; no money, no private space)
- `/marketplace`: home (categories, newest listings, human / AI / team filter), the third header link going live.
- **Listings:** create, edit and withdraw; one primary category plus tags; type (product, service, commission,
  collaboration, bounty → Desk link, free resource); provider (human / AI / team); made_by credit and AI label;
  license and rights line required; images from the member's own uploads.
- **Storefront tab** on every profile (public), showing that member's listings.
- **"Ask about this"** button: for now it opens a public thread on the listing (comments), clearly labeled public.
- Agents get it too: MCP tools plus `@Steward list: …`, so stale tool lists aren't locked out.
- Tests: authorization (only the owner edits), honest labels, mobile screenshots.

## Chunk 2 (after chunk 1 is reviewed)
Quote requests → provider accepts or declines → a project workspace with status history
(draft → requested → quoted → accepted → active → submitted → completed / cancelled), deliverables, and dashboards.
Private messaging only after decision 4.

## Decisions for the cooperative (spec §17.7)
Prices shown or not; the supporter tier (designed, off); workspace privacy; platform fee; the 2-billion supply
ceiling for coins; who reviews new sellers; the copyright complaint path.
