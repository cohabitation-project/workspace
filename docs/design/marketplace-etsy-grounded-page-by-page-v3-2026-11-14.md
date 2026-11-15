# Marketplace redesign — Etsy-grounded page-by-page approval plan v3
Date: 2026-11-14 · Prepared by Aletheia-6 · Status: DESIGN PLAN ONLY — no frontend approval, merge or deployment.

## Authority and lessons
- Geoffrey's clarification: Music provides a **high-level model for category welcome and artist journeys**, not an e-commerce layout to copy into Art & Merch.
- The three distinct user experiences across every marketplace category: **(A) public category market/discovery, (B) individual public creator storefront, (C) private creator studio/editing**. Additionally, individual work/product pages and creator onboarding are distinct views. Setu's five screens remain the scope, but are **reviewed one at a time**.
- Most recent feedback rejects both visual prototypes as implementation references: synthetic-looking pottery art, borrowed editorial styling, made-up header/footer, and generic cards-only flow. Preserve lessons, not their look. PR #129 is superseded cards-only experiment, not a deployable design.
- Shared application navigation and identity are mandatory; market content may appropriately have distinct retail visual character. Reuse actual `marketpage.frame`/existing app CSS and route components, do not invent a second global shell.
- Georgian creator assets: use properly licensed, attributed source imagery for mock examples; label **DEMO / FICTIONAL CREATOR**, never claim source photography is that maker's work, never display fake reviews or sales. For final production use actual user uploads or appropriately licensed demo inventory with provenance.

## Etsy source findings (checked 2026-11-14)
1. Public shop customization: Etsy seller can choose a logo, large/mini banner, featured listings, custom order and storefront layout. Ref: https://help.etsy.com/hc/en-us/articles/115015663247-How-to-Customize-Your-Shop-s-Appearance
2. Shop sections: create, rename, remove, and assign listings to customer browsable sections; Etsy allows up to 20 sections, one per listing. Ref: https://help.etsy.com/hc/en-us/articles/360000345048-How-to-Create-and-Manage-Shop-Sections
3. Private Shop Manager dashboard: outstanding shipping/messages/renewals, stats including visitors/orders/revenue, orders, shop advisor. Ref: https://help.etsy.com/hc/en-us/articles/360000343908-How-to-Use-Your-Dashboard-to-Manage-Your-Shop
4. Public-to-edit path: Etsy sellers can edit listings while browsing their public shop, but editing is owner-authorized. Ref: https://help.etsy.com/hc/en-us/articles/115015692667-How-to-Edit-a-Listing
5. Shop onboarding: name, logo, shop banner, creative story and creator team; separate from publishing individual works. Ref: https://help.etsy.com/hc/en-us/articles/115015672808-How-to-Open-an-Etsy-Shop
These are observations, NOT requests to copy Etsy brand, user photos, HTML or CSS.

## Shared IA and identities
- **One Cohabitation account**; opt-in separate artist/band/maker/business/author storefronts, each managed via authenticated identity and permissioned organization-page owners. Never ask for a separate WooCommerce account merely to view/manage an existing Cohabi page without explicit architecture review.
- Across Music, Art & Merch, Publishing, Video, Software & Hardware: shared authentication, who-made-it attribution (human / AI / human+AI / team), messages, rights/licensing, catalog records and later merchant/order ledger. But category-specific discovery and seller tools.
- Every public creator page remains linked to a member or member-managed organization. Never confuse a product uploader with the legal merchant/payee.
- Before enabling Stripe Connect, select entity/seller of record, connect-account authorization, source of funds, fees/refunds/disputes, taxes, KYC and payout restrictions. Internal nontransferable first-party service credits are not independent-artist fiat settlement.

## Page-by-page approval sequence (show ONE at a time)
### 1. Art & Merch MARKET HOME — FIRST
**Visitor goal:** search/browse original work and useful creator profiles; **creator goal:** understand what the market is and how to join/publish.
**Information hierarchy:** exact shared Cohabi header → market-specific search → visually strong department/category navigation (painting, pottery, sculpture, jewelry, textiles, woodworking, prints, digital, mixed media) → discover *real work* and featured makers (both, clearly distinguished) → human/AI/hybrid/team filter (always available) → Originals / Commissions / Merch & Print-on-Demand (only label what truly exists) → “How to participate” 3 compact steps → real join/list CTA → actual shared footer/mobile bottom bar.
**Assets:** image-led category photography/artwork with documented sources and rights; diverse realistic works; no CSS silhouette proxies or invented fake portraits. Fictional maker samples clearly labeled DEMO and removed as actual sellers arrive.
**Real route mapping:** `/label?cat=art` ; existing `market.list`, `/label/l/:id`, `/m/:id`, `/label/new?cat=art`; subject filters require actual matching tags or an explicit new taxonomy, not imaginary deep categories. Search and filter controls must update the displayed results, not just look clickable. Join/sign-in to real existing site paths.
**Approval checks:** Aletheia presents desktop 1440px and 390/360px actual prototype renders, screenshot notes, image licenses, public guest + signed-in variations, all links/API map. Geoffrey approves/revises *this one page* before proceeding.

### 2. PUBLIC ARTIST / SHOP FRONT
Individual creator controls banner, portrait/logo, About, process, featured works, creator-defined collections, identity/collaborator attributions, commissions, and shop policies. Public visitor browses *this maker*, not unrelated global results. Demo pottery shop as test fixture; real artist contents not inferred from reference imagery. Existing `orgpages` and profile `storefront` may be reused, but custom ordering/collections are NEW persistent capabilities.

### 3. PRODUCT / WORK DETAIL
Large high-quality multi-image gallery, title, dimensions/materials/availability, creator/shop attribution and policies, variants/personalization, original vs made-on-demand, messaging/inquiry. Existing listing details and public question API LIVE in source; inventory/variants/carts/payment/shipping require new backends and remain visibly unavailable until approved.

### 4. PRIVATE CREATOR STUDIO
Owner view distinct from visitor storefront. Tabs: Overview / My storefront / Works & listings / Collections / Inquiries / Orders & fulfillment / Finances. Existing operations: publish via `/label/new`, edit/withdraw, upload photos to profile, managed page changes subject to permissions, listing inquiries. Planned backend: saved drafts, reorder featured listings, media galleries, exact collections, inventory, Printful/Printify integration, invoices/order returns, Stripe Connect and finance ledger. New buttons MUST be real or explicitly “planned”; never fake payouts.

### 5. JOIN / PUBLISH CREATOR GUIDE
From discovery to join to profile/orgpage identity to rights/labels to first image upload/listing to shareable public page. Distinguish what works today from future paid fulfillment and distribution. Show practical owner-specific options rather than generic motivational marketing.

## After Art & Merch
Mirror shared three-layer architecture but tailor:
- **Music:** public discovery home; artist/band release page; private music studio, distribution/royalties/merch. Keep existing musician identity/routes and real track support.
- **Writing & Publishing:** discover books/authors; author page; private book studio manuscript, ebook, POD, royalties.
- **Video & Design:** browse reels/portfolios; creator page; editor with packages, rights, projects and client workflow.
- **Software & Hardware:** browse developer/maker catalogs; product/creator pages; release/version/licensing/catalog/inventory/fulfillment tooling.
Do not paint these five with one visual template.

## Setu/Ash responsibilities
- Aletheia: competitor-backed UX/spec, actual concept renders, licensed image manifest, precise control/route wiring, and feedback revision. **Do not change production route in anticipation of approval.**
- Ash: review physical SKU, POD/fulfillment supplier, shipment/returns/commissions requirements and approve realistic operational assumptions.
- Setu: validate existing routes, shared header/footer, auth, data shape, and test actual HTML/CSS after approval. Preserve approved geometry and images without re-theme. Pass desktop/mobile screenshots for final QA before deploy.
- Geoffrey: accept/revise each visual stage in conversation; review any architecture fork affecting checkout ownership.
- Needed architecture fork: existing Cohabi storefront with Printful/Printify API adapters vs external WooCommerce/Dokan checkout, not resolved; keep the prototype decoupled from that decision.

## Deliverable contract
For **page 1 only**, present:
(a) desktop + mobile visuals,
(b) demo art/image rights and attribution list,
(c) mapped action→existing route/backend or explicit NEW dependency,
(d) clear guest/member/test cases,
(e) list of deviations from shared Cohabi header/footer and why (target zero),
(f) decision question about visual/function fit.
No earlier v1/v2 prototype is approved as the handoff. No merge/deploy until user approval and Setu integration tests.
