# Cohabi Market route audit — phase 1 (visitor-side), 2026-11-18

Task: t_8fb75a0e9f (Aletheia-6 → Setu). Audit-first, no greenfield; audit what is built vs live.
Pinned main: 33654d1. Live production: /healthz sha ba2b038c5a93adcf53120cc22c661976df5297ce (checked 16:30 UTC).
Method: signed-out walk of every page route in the built-in browser, desktop + mobile (375×812 emulated),
each row observed, not inferred. Signed-in flows are phase 2 (below).

## Route matrix — observed

| Route | Expected | Observed (desktop) | Mobile | Status |
|---|---|---|---|---|
| /marketplace | 301 → /label | redirects to /label | — | OK |
| /label | market home, 6 category tiles, featured rows | renders; tiles link distinct cats; featured rows carry real listings only; honest tier labels ("BEING DESIGNED", "nothing here is an offer") | clean: chips scroll, no overflow, bottom nav | OK |
| /label?cat=music | Music page | dedicated design; artist/band vs record labels already distinguished in copy ("Record labels are separate managed organizations") | not re-checked | OK (copy aligns with Labels-and-Musicians direction; full split is open work) |
| /label?cat=art | Art & Crafts | dedicated design, maker CTA, real listing (Picture production) | not re-checked | OK |
| /label?cat=video | Video & Digital Design | renders, portfolio-first copy, honest empty state | not re-checked | OK |
| /label?cat=software | Software & Hardware | renders, own first-stage design, 2 real listings | not re-checked | OK (visual redesign is the known open item, per Geoffrey via Aletheia 16:14 UTC) |
| /label?cat=services | Services | renders, 2 real listings, maker filter chips | not re-checked | OK |
| /label?cat=classifieds | Classifieds | renders; honest "notices, not things you pay for here"; empty state truthful | not re-checked | OK |
| /label?q=zzznope | search empty state | explicit "Nothing listed here yet" + join CTA; no inert search | — | OK |
| /label/l/:id | listing detail | Picture production: price mode (quote), license, rights statement, maker attribution all present | not re-checked | OK |
| /label/a/:slug | artist on the Label | real artist slugs render; a business slug 404s here BY DESIGN ("No such artist on the Label") | — | OK (not a broken link: businesses live at /page/:slug) |
| /page/:slug | business/org storefront | /page/firedamm renders: kind badge, "a page is not a member: no vote, no coins" | spot-checked, fine | OK |
| /label/releases | label releases | renders (Last of the Real Estate) | not re-checked | OK |
| /label/new | listing creation | signed out → 303 /signin?next=/label/new | — | OK |
| /studio (= /page/new) | Creator Studio | signed out → 303 /signin?next=/page/new | — | OK, one nit below |
| /label/new/simple | simple page form | not walked (phase 2, needs sign-in) | — | PENDING |

## Findings

1. **No broken visitor-facing routes found.** Every link walked goes where it says. The suspected
   "wrong package" worry (rebuilding the landing page) is confirmed unnecessary: the page exists and
   meets the honesty contract.
2. **Nit:** /studio redirects to /signin?next=**/page/new** rather than next=/studio. Same destination
   after sign-in, but the address bar loses the "/studio" name. One-line fix if we care; cosmetic.
3. **Open per direction (not route breakage):** Software & Hardware + Services visual redesign
   (Geoffrey via Aletheia-6, 16:14 UTC); Labels-and-Musicians as two discoverable groups (copy is
   halfway there); FireDamm-pipeline CTAs on relevant pages marked COMING SOON where not live;
   Books/Writing category (missing; on the open list); label *application* workflow (beta-free page
   creation exists; an apply/review/approve flow does not — Aletheia 16:17 UTC).

## Phase 2 (needs sign-in or a test account)

Storefront creation via Creator Studio end-to-end, listing creation, sandbox checkout
(checkout.mjs/stripe.mjs, test mode), payout-account onboarding state, /label/l/:id/edit,
/label/new/simple. Ash's visual review runs alongside.

— Setu, 2026-11-18 16:30 UTC

## Phase 2a — member listing + checkout chain (2026-11-18, ~17:15 UTC, live production ba2b038)

Run as Setu (member token), with one disclosed test listing (l_28c837673aa2a9, $1 fixed, created
and withdrawn within the hour; it stays in the record).

| Step | Observed | Status |
|---|---|---|
| market_create (member, fixed price) | listing live immediately at /label/l/:id, on Storefront tab | OK |
| live listing render | price, license (MIT), rights statement, AI-made badge, honest "Payments open soon. Nothing can be bought" | OK |
| checkout quote, agent seller | `{currency:"COINS", payable:false, why:["agent's work is paid in Cohabi coins when the wallet supports it"]}` | OK — honest; agents route to coins, not Stripe |
| checkout quote, human seller (l_d89556f95ed6b6, $1195) | `{currency:"USD", payable:false, why:["the maker hasn't connected a payout account yet"]}` | OK — fails closed for the right reason |
| market_withdraw | off the shelf, stays in record | OK |

**The one real blocker for end-to-end sandbox checkout:** no seller has completed test-mode payout
(Stripe Connect) onboarding, so every USD quote is payable:false before a Checkout session can
start. Correct behavior; it just means the sandbox chain can't be exercised further until a seller
onboards in test mode. Two ways to unblock, either fine:
(a) Geoffrey runs /wallet#get-paid test-mode onboarding on his own seller account (minutes), or
(b) a disclosed test human seller on staging.cohabi.org does it with Stripe's published test data.
Until one happens, "sandbox checkout tested end-to-end" cannot truthfully be claimed by anyone.

Phase 2b remaining (needs a signed-in human session): Creator Studio 6-step wizard walk, publish/edit,
/label/new form, /label/l/:id/edit. Ash's visual review runs independently.
