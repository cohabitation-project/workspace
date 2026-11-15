# SETU HANDOFF — Marketplace page packet + Stripe seller accounts
**2026-11-15 — Aletheia-6 — draft, code-backed visual prototype.** This is the packet Geoffrey requested. No further design grade/architecture meeting is necessary to begin wiring existing features.

## 1. The tangible design
**File:** `docs/design/prototypes/marketplace-page-packet-2026-11-15.html`
Open in browser: interactive sections for Marketplace home, Arts & Crafts, Music, Video & Design, Software & Hardware, Services, Classifieds, Creator Studio, Payment Setup, and Earnings. Responsive CSS at desktop, 390 and 360. Section tabs, view-creator, seller setup and studio navigation work **in prototype only**. Images are clearly labeled placeholder abstract art. No fake orders or actual Stripe requests. The approved Art & Crafts image package `cohabi-art-market-page1-v3` from prior chat remains missing; DO NOT claim this replacement is that previously approved image. Use this packet as actionable interim layout, request Geoffrey visual signoff on visual fidelity before production swap.

## 2. Adapt, don't overwrite
Preserve current shared Cohabitation header/theme/footer and responsive shell, auth and nav. Real categories in `commons/lib/market.mjs`: music, art, video, software, services, classifieds. **Human/AI/hybrid/team is a secondary maker filter, never primary navigation.**
Keep creator-first discovery for Arts, Video and Software: artwork hero → maker cards with portfolios → real member/page → shop/listings. Actual images must be owner-approved or sourced from real creator uploads; do not replace with fake products. Avoid breaking Music's working artist and album grouping.

Existing functions/paths:
- `commons/lib/market.mjs`: listing create/edit/withdraw, price modes free/donation/fixed/quote/packages, licenses, rights, max 4 images
- `commons/lib/marketpage.mjs`: /label/category pages, listing/artist cards and public storefronts; price buttons deliberately disabled
- `commons/lib/orgpages.mjs`: band, artist, business, label managed pages, many pages per signed-in member, role checks. Pages are NOT member accounts
- `docs/design/marketplace-v2-creator-first-research-and-wiring-2026-11-14.md`: route/API mapping and known catalog predicate bug `(!by || !l.page || page)` in market.list; regression test before creator discovery
- Social prototype PR #147: share existing release/product differs from release/listing creation. Any new album or product requires owning-page editor and catalog write first, followed by optional post linked by durable id.

## 3. How sellers and Stripe accounts connect (implementation decision)
**One login** can own/manage **many creator pages**. A **legal seller entity** is separate from both. A verified seller entity may link to many authorized pages. Each seller entity has its separately verified Stripe connected account, tracked per test/live environment; never derive the payout destination from page name, author name, self-declared AI operator or the publishing member.
Examples: a creator with one art page and one band page under one verified sole proprietor may connect both pages to one seller entity. An independent band LLC needs a separate verified seller entity, even if the same member manages both pages. An AI may create/manage intellectual work and storefronts, but legal Stripe eligibility and authorized financial representative must be satisfied independently. Page content roles cannot edit recipient banking or take payout control.

UI: Creator Studio → page menu → **Enable sales** → "Who receives payments?" individual / business / link my existing verified seller → server checks financial owner and stores seller binding → Stripe-hosted onboarding link (server creates; never render secret) → Stripe account status from signed webhook / authenticated Stripe read → can charge/payout separately → Dashboard with real orders, gross, fees, refunds and reconciled payouts. Onboarding canceled/expired/restricted should show resume/requirements not "Connected." One creator publishing under multiple managed pages should NOT create multiple Stripe accounts by default.

## 4. Stripe engineering requirements
As of Nov 15, 2026 Stripe's marketplace docs describe Accounts v2 and vary from v1. **Pin API version and Connect account model before coding fields.** Use official Stripe docs:
- https://docs.stripe.com/connect/marketplace
- https://docs.stripe.com/connect/embedded-onboarding
- https://docs.stripe.com/connect/destination-charges
- https://docs.stripe.com/connect/separate-charges-and-transfers
- https://docs.stripe.com/webhooks

Define and document **who is merchant of record**, legal seller, refund/chargeback liability, fee policy and tax handling before live charges. For staged pilot start with **one seller per order**, USD, test mode, Stripe-hosted Checkout/Connect; defer multi-seller baskets until settlement/transfer splits audited. For platform-first-party subscriptions use platform Checkout/Billing; never treat them as third-party artist proceeds. Coin/credit ledger is separate, no unapproved cashout.
Recommended storage: `seller_entities`, `seller_roles`, `seller_pages`, `seller_stripe_accounts`, `orders`, `order_items`, `payment_attempts`, `stripe_events`, `refunds`, `disputes`, `settlements`, `payout_reconciliation`, `seller_audit_events`. Test/live IDs never mix; strip financial secrets from logs.

Controls:
1. **Owner-only POST** `/api/market/sellers` creates local verified-representative pending record, never activated by client claim alone
2. **Financial-owner-only POST** `/api/market/sellers/:id/connect` starts on-boarding using server-side Stripe account API, safe expiration and return URL
3. **GET** `/api/market/sellers/:id/status` returns sanitized state, account capability for charge/payout, requirements from provider
4. **Authenticated Stripe webhook** with raw body/signature verification, deduped event IDs, out-of-order handling, secure source query and reconciliation
5. **POST** `/api/market/checkout` resolves fixed price and payee server-side from immutable listing/order snapshot, enforces listing stock (when present), seller ready, country/currency and platform fee; uses server idempotency; order starts pending; never treat success redirect as settled payment
6. Post-payment: verified webhook transitions order paid; fulfillment is separate; refunds/chargebacks/negative balances and payout reconciliation must be recorded and surfaced
7. Prove wrong-creator payout never occurs, even if a client supplies a different Stripe ID or someone takes over an unrelated page; update manager and seller financial owner privileges separately
8. No secrets/card data/bank info in our app logs or source; use Stripe-hosted handling.

## 5. Specific pages Setu needs to finish
- Marketplace home: six rich category tiles, real images where approved, real counts/content, responsive
- Arts & Crafts: premium gallery/portfolio, subject filters (paintings/pottery/sculpture/jewelry/textiles/woodcraft/prints/digital/mixed), artist-first discovery; preserve arts page screenshot reference if found
- Music: existing artists/releases with band-page album workflow and connected market presentation (not "share post = release")
- Video & Digital Design: reel + service portfolio, real creator cards and playable content only if actual video available
- Software & Hardware: apps/tool/hardware portfolios with verifiable license/docs/version; no fake Buy
- Services: creator discovery, transparent 1-3 packages, quote/inquiry
- Classifieds: categorized community notices; no checkout where not appropriate
- Creator Studio: managed page identity, listings create/edit/withdraw, visible publish state, real media upload
- Seller Payment Setup: individual/business/verified-existing-seller branches, Connect status/resume/restrictions, role-based owner access
- Earnings/Orders: live only with real Stripe backend; no invented amounts, payouts, refunds; accurate empty states

## 6. Acceptance / release gates
- Start by rendering the **actual staged pages** and share screenshots at 1440, 390, 360 for Geoffrey's visual feedback. Do not merge a rejected approximation.
- Confirm every clickable control has its real route, authorization and backend effect; if not built, label as disabled and do not present as live.
- Test anonymous browsing, logged-in creator, multiple managed pages, unrelated member, AI creator, financial owner; prove unauthorized edits, seller relink and forged recipient fail.
- Stripe **test mode**: onboarding create/expire/resume and restriction; charges success/failure/cancel/duplicate; webhook replay/out-of-order; seller change; refunds and dispute event; ledger reconciliation. Supply exact test event ids redacted, commands, SHA and observable statuses; no real money.
- Business/legal fork before LIVE money: platform merchant of record, seller terms and liability, fees, taxes, shipping/returns/digital delivery.
- Actual original Art & Crafts v3 package is missing and remains an acknowledged visual fidelity blocker until recovered or Geoffrey approves new artifact. PR #129 remains rejected/superseded.
- **No production deploy or live Stripe enablement from this draft.** Setu should open implementation PRs and wire under existing app. Report what works with evidence and what doesn't.

## 7. Immediate handoff
This packet is itself deliverable. Setu: review prototype + wire pages into existing app using real data, then deliver complete page URLs and actual 1440/390/360 screenshots and a Stripe test-mode flow for independent QA. Prioritize one seller/one page/one product end-to-end before expanding to multi-vendor carts. Work Desk task `t_a9effd739b` remains open until verified.
