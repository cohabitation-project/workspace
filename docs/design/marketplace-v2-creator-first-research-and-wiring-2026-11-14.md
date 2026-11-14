# Cohabi Market 2.0 — creator-first sections, actual backend contracts and Stripe integration
Date: 2026-11-14 · Owner: Aletheia-6 (frontend/research) · Status: RESEARCH + BUILD-SPEC; user approval required for visual redesign; no production route changed.

## Decision inheritance and existing implementation
- Real route: `/label` (redirect from `/marketplace`). Categories defined in `commons/lib/market.mjs`: music, art, video, software, services, classifieds. Human/AI/hybrid/team remains attribution/filter, **not a category** (Nov 7 decision).
- Real category page: `marketpage.marketPage` in `commons/lib/marketpage.mjs`. Music already has a dedicated artist-forward landing in `musicLanding`, whereas art/video/software display a flat grid of **listings**, not **creators**.
- Real product create/edit/withdraw: `GET /label/new?cat=...`, `GET /label/l/:id/edit`; `POST /api/market/listings`, `PATCH /api/market/listings/:id`, `POST /api/market/listings/:id/withdraw`, inquiries `POST /api/market/listings/:id/ask`. Client in `commons/public/market.js`.
- Real provider identity: member `/m/:id`, optional managed page under `orgpages`, with real edit/manager and business/artist/band `pagePage`. `marketpage.storefront` already puts listings on member profile and links to listing edits. Member profile can carry artwork/banner, kind-specific bio. Existing creator pages MAY be seeded or created by existing owner path. Do not invent a separate shadow identity system.
- Real image selection: uploads live in `images.mjs`; listing form allows **four** pre-uploaded images; creator card art can use selected listing cover or managed artist page portrait/banner. To choose hero image independently requires new persisted field + owner authorization.
- Existing prices: `PRICE_MODES = free, donation, fixed, quote, packages`. **There is NO orders, payment, product-level token pricing, Stripe checkout, or financial dashboard endpoint.** Current buttons deliberately disabled with “payments open soon.”
- Existing catalog has an apparent bug: `market.list` includes the predicate `(!by || !l.page || page)` which can exclude member-owned paged listings in `storefront` unless `page` query is supplied; verify with regression tests before relying on creator grouping.
- Existing page `/submit` is the shared Library file-submission system; creator product publishing is `/label/new`, not that endpoint.

## Research-grounded patterns
Etsy official:
- Shop identity: name, logo, banner, About, human team and policies: https://help.etsy.com/hc/en-us/articles/115015672808-How-to-Open-an-Etsy-Shop .
- Creator storefront categories/sections, profile/favorites/portfolio and owner-managed shop items: https://help.etsy.com/hc/en-us/articles/360000345048-How-to-Create-and-Manage-Shop-Sections .
- Seven-part listing workflow with drafts, art uploads, seller attributes, prices/shipping: https://help.etsy.com/hc/en-us/articles/115015628707-How-to-Create-a-Listing .
- Physical options: materials, style, size, color, stock, shipping, personalization: https://help.etsy.com/hc/en-us/articles/115015664047-How-to-Add-Variations-to-Your-Listings .
- Seller finances: transactions, refunds, fees, amount ready for deposit: https://help.etsy.com/hc/en-us/articles/115015747228-How-to-Manage-Your-Payment-Account .
Do not clone Etsy trade dress, source code or content; adopt common UX patterns and keep Cohabi's own visual identity.

## Approved interaction model (subject to actual UI screenshot signoff)
- Primary discovery unit for art/video/software = **creator**: chosen showcase image, creator name, human/AI/hybrid/team label, skill/category badges, description, count of public works, 2-4 portfolio thumbnails, View studio (real /m/:id or managed page), Ask a question (real listing thread; only show when specific listing available). No fake “Buy” in preview.
- Creator public storefront: cover art + creator identity + category-specific bio + portfolio/work grid + filters + offerings/services + clear contact/inquiry. Keep underlying member identity and, if relevant, managed artist page distinct, connected.
- **Arts & Crafts subjects:** Paintings; Pottery & Ceramics; Sculpture; Jewelry; Textiles & Fiber; Woodcraft; Prints & Photography; Digital Art; Mixed Media; Other. Implement initially as `tags`/URL query atop existing category `art`; preserve original `art` category values. New persisted enum only after data migration/review.
- **Video & Digital Design:** Film, Video Editing, Animation, Motion Graphics, 3D, Brand Graphics, Storyboards, Live Production. Visual reel/cards should embed only validated media (privacy/consent), external verified demo links otherwise. Service packages use existing `packages` 1-3, quote and fixed fields.
- **Software & Hardware:** Applications, APIs, open-source code, website builds, AI workflows, Robotics, 3D Printing, CAD, Electronics, Kits. Display license, compatibility, documentation/repo links, version, physical-vs-digital/service; attach dedicated validated data fields when actually built. No pretending an app is downloadable if only a link/placeholder.
- **Music:** Keep existing dedicated listening/artist journey; perform accessibility/mobile and release-rights audit, not another redesign.
- Preserve 4 who-made-it filters; hero “Meet the makers” and “Explore work by discipline”; use responsive creator cards and subject chips. One maker can sell across categories.

## Creator listing/publishing workspace — two-phase implementation
**Phase 1 WORKS NOW using existing API:** Sign in → Create/manage creator page/profile → Upload up to four pictures on profile → /label/new?cat=art|video|software → Title, text, kind, category, images, rights/license, optional team/managed page, tags, USD asking price (or service packages) → POST API → redirect to live listing → edit/withdraw → public inquiry. Source already exists. Add clear “Manage work” tab with links to existing storefront; display owner-only actions, never fake owner powers.
**Phase 2 NEEDS BACKEND:** Seller-controlled draft/publish states; 8+ media gallery and artwork reorder/feature image; subject-specific material/medium/options/shipping/stock/variations (physical); preview/playback variants and licensing/delivery agreements (digital); quote/commission milestones; order/inventory, refunds, disputes, shipping, payouts and tax documents. All new features need new DB model or event persistence, API permissions and tests — do not wire only cosmetic controls.

## Pricing: 4 DISTINCT display intents
- Free: genuinely free resource/listing (keep, optional true free button only if verified link and license).
- USD cash: existing asking price (fixed/package/donation), **not a live payment** until seller-of-record and Stripe ready.
- Cohabi service credit: ONLY for first-party Anomaly 01 service consumption (new restricted ledger/product SKU). Not an all-purpose alternative currency, not artist merchandise, and not a transfer to independent sellers. Any “credit eligible” flag must check the service provider and approved credit product type.
- Both: permitted only where an eligible first-party service expressly accepts both independent USD checkout and a *nonredeemable credit balance* for that same first-party offering; never display on arbitrary Etsy-like third-party listings.
**Therefore a blanket “Cash / Coins / Both” buyer filter on all third-party arts is MISLEADING until the business/legal decision changes.** Show honest filter states and a disabled future facet with explanation; retain Free. If users insist on general seller tokens in the future, bring an explicit payment/product/compliance decision.

## Three Stripe rails — don't make account availability equal readiness
1. **Platform's own recurring subscriptions, first-party AI/software services and credit packs:** Stripe Billing / Checkout under the actual approved platform legal merchant. Credits held as separate internal service entitlements, not spendable by independent artists. Do not enable credit packs until seller/legal/provider review.
2. **Marketplace third-party independent sellers and creators:** Stripe Connect, with verified connected accounts and owner-managed onboarding through Stripe-hosted/embedded UI. Choose actual merchant of record; direct vs destination vs separate charges/transfers depends on seller relationship, tax/refund liability and product model. Do NOT automatically copy RollinHost's Stripe configuration. Stripe official design reference: https://github.com/stripe/ai/blob/main/skills/stripe-best-practices/references/connect.md .
3. **Separate internal ledger:** immutable order/payment/fee/refund/dispute/transfer journal, Stripe event IDs and idempotency, seller balances, pending/available payouts and reconciliation; no app-managed private payment credentials, no invented amounts in UI.
Flow: seller chooses USD model + clicks future Connect button → backend creates connected account/onboarding URL using server-side auth → seller completes provider KYC on Stripe → webhook validates identity and activates capability → cash checkout creates Order and Stripe PaymentIntent/Checkout Session → verified webhook finalizes order and fees; inventory/delivery/returns status update → payout ledger reconciliation → financial dashboard. The connected account must not be inferred ready merely because one human has a Stripe login.

## Realistic route/data map and UI controls (no dead Legos)
| UI screen/action | Existing route/service | Integration status |
|---|---|---|
| Browse and who-made-it filtering | `GET /label?cat=art&by=human`, market.list | LIVE code |
| Creator member identity/shop | `/m/:id`, marketpage.storefront | LIVE code |
| Creator organization page | orgpages pagePage, /label/new?as=... | LIVE code |
| Create listing | `GET /label/new`, `POST /api/market/listings` | LIVE code |
| Edit/withdraw | `/label/l/:id/edit`, PATCH/withdraw API | LIVE code |
| Ask about this work | `/api/market/listings/:id/ask` | LIVE code, PUBLIC |
| Creator-first grouping | join market.list by member/profile on server | NEW view, NO new API required |
| Faceted arts subject chips | `tags` search in current list | PARTIAL, backend search not exact facets |
| Drafts/gallery/variants/stock/shipping | new models/API/tests | NOT BUILT |
| Order/commission/payout/financials | separate domain backend + Stripe | NOT BUILT |
| Cash checkout | Stripe Checkout/Connect architecture | BLOCKED until approved seller and testing |
| Credits/both purchase | first-party only credit service + ledger | NOT BUILT; third-party disallowed by current credit design |

## Visual fidelity acceptance gate
Aletheia must NOT propose unbuildable art or turn a pretty mockup into a different deployed page. First create honest **rendered, code-backed** desktop/mobile mockups using production Cohabi headers/footer, existing member/store data and actual URL controls. Use the specific agreed creator-first card geometry and artwork from real uploaded creator content; new artwork requires approval and must not misrepresent real portfolios. Only THEN stage PR with 1440/390/360 screenshots from the actual server route and guest/member paths. Setu integrates, Ash independent QA; no general site re-theme without approval.

## Coordinated team roles to prevent duplicates
- Aletheia — UX research, creator-first view, responsive HTML/CSS implementation with functional existing back-end links and screenshots.
- Ash — dropshipping/fulfillment, supplier policy, manufacturer shipment/tracking, return risk, digital/physical distinction. Coordinate shared inventory/order objects.
- Gemini/Vesper — Stripe seller-of-record & Connect/credits fee/risk architecture; pay semantics; test account workflow; avoid claiming live acceptance.
- Setu — routing/backend, orgpages persistence, authentication, deployment, legal/merchant source of truth.
- Awen — formation/legal and creator rights/licensing/regulated payment boundaries.
- Council — only approve non-reversible legal, money, rights or governance changes; public catalog UX does not need to wait on corporate filing.

## First ship target
Live nonfinancial public workflow: visitor sees maker directory → opens actual maker profile → views real uploaded works and published listings → asks maker about a work (with public visibility warning); maker can upload, publish, edit, withdraw and update their profile. No transaction promised until appropriate merchant and ledger gates. Later connect orders and earnings once provider ready.