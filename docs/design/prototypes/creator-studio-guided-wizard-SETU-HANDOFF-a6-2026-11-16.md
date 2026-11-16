# Creator Studio: guided storefront setup + publish/share
**Author:** Aletheia-6 · 2026-11-16 · **Draft UI exploration, not a directive from Geoffrey or production approval**

**Actual interactive HTML:** `docs/design/prototypes/creator-studio-guided-wizard-a6-2026-11-16.html`

## The concrete deliverable

One self-contained mobile-responsive HTML/CSS/JS front-end with six real browser-interactive steps:
1. **Account** — returning account or invitation to create a Cohabitation account. Example only; no fake account creation.
2. **Page kind** — Band/musician, Visual artist/maker, Software/product, Label, Business/services. The first two are focus of the pilot; label rates are intentionally undecided.
3. **Import** — manual free entry vs explicitly requested Bandcamp, SoundCloud, other store migration. URL field on import, rights/policy/quote disclosure. No scraping/downloading.
4. **About** — kind-specific labels for band/artist; input binding to the store preview; required creator name only.
5. **Personalize** — 5 color palettes (night music, gallery cream, grove, dusk purple, ember), 3 visual layout modes selected with state. These selections are draft metadata: the sample preview color changes; full layout rendering awaits design refinement.
6. **Publish & share** — add first listing and price label; separate opt-ins for Cohabitation social, creator profile, and external platforms; rights acknowledgement; preview-only state. No live posting.

The right-hand preview changes as inputs change: creator kind, name, biography, product name, price, banner palette; mobile stacks preview below the wizard. Real placeholder art stays visibly marked as placeholder. Inputs are kept in in-page JS state on Back/Continue. The HTML has actual click, input, change and validation behavior, not dead controls. No persistence across reload, no actual API integration, no automated browser tests claimed.

## Visual basis / non-substitution

Read the actual source rather than guessing: `commons/lib/marketpage.mjs` describes market HOME as **cream**, MUSIC as **dark / listening app**, ART as **gallery wall**, CRAFTS as **warm workshop**, VIDEO as **cinema**, SOFTWARE as **terminal**, SERVICES as **clean studio**. `commons/lib/orgpages.mjs` defines stored page kinds `band,artist,business,label` and themes `navy,midnight,music,art,video,software,services,classsifieds,home`. This prototype uses the shared cream/green/natural visual language and category-specific choices. **It does not replace the approved original Arts & Crafts v3 ZIP, nor PRs #129/#152, nor overwrite Cohabitation shared app chrome.** Integration needs the exact app-header, CSS tokens, and the earlier approved references checked side-by-side. Text-only decisions are not proof of pixel fidelity.

## Implementation map for Setu (when this design is accepted)

- Preserve single member identity: `commons/lib/orgpages.mjs` owns creator pages, manager scopes and permissions. Creator page ≠ user/member account ≠ Stripe seller legal entity. The sign-in/signup step should go through actual authentication then return to an **authorized** resumable draft, not create an unverified extra account.
- Draft persistence: `creator_drafts` keyed by authenticated principal + page kind, idempotent save/checkpoint, private until publish, optional expiry. Validate on server. Never trust browser user ID, owner ID, featured images or connected-platform accounts.
- Wizard page creation: select kind → `orgpages` page-create for an authenticated member only → update bio/theme/kind_info via authorized page update. The page editor can continue after publishing; the wizard creates no mandatory paywall.
- Artist library: images owned by their uploader, credited to creator ID with explicit rights/licensing metadata and individual permission. Display direct agent/human artist contact and collaboration options; never import private cooperative image collections as public-use assets. Obtain actual license grants, not merely attribution.
- Import service: no scrape before checking current third-party terms and copyright permission. Intake owner-provided URL and uploads; analyze allowed data; offer **token quote before any work**, preview entries and allow corrections, then apply only approved fields/assets. Prefer official authorization/export; maintain rights, provenance, original quality, conversion consent. Artist uploads free; migration assistance paid.
- Store listing: `commons/lib/market.mjs` categories art/music/software and generic listings; issue a canonical `listing_id`, attach to appropriate managed page. Missing creator page/listing query bug noted in existing research: verify page filtering and access controls in source before binding.
- Publish/share: listing publication and social publishing are **separate idempotent actions** from one UI. Listing can publish without social, and an existing listing can be reshared without creating duplicates. Content cards include canonical listing ID/version, authorized creator/page ID, license/price label, safe thumbnail. A draft caption should be shown to the creator for approval. Schedule/cross-post only after account-scoped OAuth, revocable consent, and platform terms; never reuse platform credentials or send on an unconfirmed draft. Give per-destination receipts, failed/unknown states and safe retry.
- `commons/lib/marketpage.mjs` and the existing feed/system header should be integrated rather than building parallel page architecture. Confirm actual route behavior, auth, images, accessibility and SEO before shipping.
- Stripe seller and payments belong to the separate incomplete project; nothing in this prototype charges or authorizes a payee.
- Testing: in-browser 1440/390/360 screenshots compared to approved Coha design; keyboard navigation and keyboard-only flow; screen reader labels; user lacking account; imported URL; band vs art prompts; back/forward preservation; authorized manager vs non-manager; invalid file; third-party permission denied; duplicate publishing attempts; each share consent combination; external OAuth revoked.

## What is *not* claimed
- Not a production-ready market page, not a completed backend.
- Not the original approved image-rich Arts page.
- No real API calls, saved drafts, imported tracks, images or licenses, no Stripe charge, no live posting, no working 3rd-party social integration.
- The mock layout variants currently record selection state; deeper visual rearrangements remain future integration work.
- No formal assignment for Setu and no action attributed to Geoffrey's authority. Design feedback is welcome.
