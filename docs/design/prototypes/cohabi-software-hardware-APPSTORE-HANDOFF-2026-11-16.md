# Software & Hardware / Apps, SaaS, Open Source, Games and Widgets — Aletheia-6 working design
**Date:** 2026-11-16 · **Status:** independent design exploration, not an approved policy or Geoffrey's directive.  
**Companion artifact:** `docs/design/prototypes/cohabi-software-hardware-lab-2026-11-16.html`

## What was actually created
A new **responsive standalone interactive HTML prototype** for the Software & Hardware marketplace. It includes functional **client-side** keyword search, six subtypes, secondary creator attribution (human, AI, hybrid, team), license filtering, eight clearly marked *synthetic* demonstration cards, an interactive submission *preview* with rights acknowledgement, and a contextual widget/security explanation. No server mutation, payment, upload, or downloadable binary is performed. Visual artwork is simple locally generated CSS forms, **not the earlier approved Arts & Crafts imagery**. Nothing in this branch changes the live application.

### Placement
The **existing** marketplace category is `software` in `commons/lib/market.mjs`, displayed as *Software & Hardware*. Preserve that route and existing cross-market navigation; do **not** create a competing identity system, new broad "AI services" category, or redefine the human/AI filter as the top-level taxonomy.

Suggested subtypes inside that category:
- **Apps:** platform and OS compatibility, install surface, release channel, permissions.
- **SaaS:** hosted link, free trial/pricing, data policy, support, billing ownership.
- **Open Source:** canonical repository, license identifier, tagged releases, reproducible-build information when available.
- **Games:** browser/native, age rating where appropriate, supported hardware, multiplayer/privacy policy, save/export support.
- **Hardware:** physical specs, region, stock, fulfillment, warranty, safety declarations, adapters.
- **Developer Tools:** APIs, SDKs, command-line tools, plugin/extension manifests, docs.
A single product may carry several subtype *tags* only if semantically valid, but has one canonical `primary_type`; search should not duplicate a listing.

## Current code boundaries
- `commons/lib/market.mjs` handles generic listing create/update/withdraw and generic `CATEGORIES.software`; pricing modes `free|donation|fixed|quote|packages`; rights and license; up to four images; and public questions. It **does not** yet have versioned software binaries, scan results, compatibility data, secure installed app runtime, app review, software patch updates, domain provisioning, subscription lifecycle, or developer account verification.
- `commons/lib/orgpages.mjs` supports member-managed artist, band, label and business pages, so publishing should link existing creator page IDs and immutable member IDs.
- `commons/lib/marketpage.mjs` currently has market product layouts and deliberately disabled cash purchase while finance flows remain incomplete. Do **not** enable a fake install or buy button.
- Marketplace/Stripe integration is separately tracked on Work Desk under `t_a9effd739b`. This draft is **not** ready for integration without source validation and a code/data migration.

## Server-side contract to build before allowing submissions
Define `software_releases` / `software_uploads` *separate from* the generic public listing record. Suggested fields: `listing_id`, `publisher_member_id`, `publisher_page_id`, `primary_type`, `platforms[]`, `version`, `artifact_kind` (external URL, signed release, browser, hardware, hosted service), `source_repository`, `license_identifier`, `file_sha256`, `scan_verdict`, `scan_policy_version`, `review_actor_id`, `reviewed_at`, `release_status`, `widget_manifest_id`, `updated_at`.
Use server-generated IDs, stable account authorization, type-specific validation, and an append-only moderation/release event log. A new submitted version returns to **quarantined**, never inherits old version approval. Preserve an auditable release history.
For open-source projects, publishing a **link** to a repo has different risks from hosting an executable. Label which one is being offered rather than implying vetted downloadable software. A copied GitHub URL or a package filename does not prove publisher ownership.

### Safe binary submission pipeline (minimum)
`draft -> uploaded-to-private-quarantine -> SHA-256 + archive/binary type checks -> malware scanning -> dependency/SBOM and known-vulnerability checks -> policy/licensing and human-review queue -> approved version -> isolated public CDN -> withdrawn/revoked`.
- Verify upload size, allowed formats, anti-zip-bomb, symlink/path traversal, MIME sniff, decompression limits, archive extraction security. Never unpack untrusted archives directly into web root.
- Scan **all uploads**, not just "open source", and inspect embedded executables, scripts, native extensions and dependency-install hooks.
- Sandbox dynamic checks in an isolated, no-secret, limited-network worker. Don't execute uploaded code in the Commons backend or normal creator web page.
- Generate content-addressed release IDs and immutable audit records. Approved file hash must equal the file served, and publishing a new release always restarts review.
- Automated scanning is **not a safety guarantee**. Show "reviewed under policy vN" and known limitations, never "virus-free". Support takedown, incident escalation and revoked releases.
- Establish copyright, licensure and provenance attestation and a software/security disclosures page before open submissions; do not trust arbitrary uploaded packages as first-party code.

## Widgets: a shared capability for every app or SaaS
Differentiate **product listing cards** (simple, inert, link to app) from **embedded interactive widgets** (higher risk).
- Start with server-rendered **signed manifest** that references a product ID, canonical page and permitted widget origin, title, description, dimensions and supported capabilities. Use shared store cards across social feed, creator page, member page and site home with consistent styling.
- Optional interactive widgets should run in **sandboxed isolated iframe or reviewed first-party component**, with explicit allowlisted postMessage origin, CSP, purpose-specific access grants, interaction logging and revocation. Never load arbitrary creator JavaScript inside main account/security context.
- Widget install is a **per-user consent** boundary, separate from looking at a listing or purchasing it. Network, files, calendar, payments, mic, device controls and wallet operations require capabilities and scoped permissions that cannot be implied by a store page.
- A product can publish a **preview widget** without enabling installation or billing. Shared widgets should contain durable `product_id` + `version` to avoid presenting old or withdrawn versions.
- For FireDamm, first prove which FireDamm product/code/service is actually under project control; ask its owner for its API, route or embed format. A marketing site and a safe widget are different deliverables. Build a minimal **first-party link/status widget** first, then a sandboxed interactive embed only after source, auth and security review.

## Three related creator service pipelines (discussion ideas, not approved builds)
**1. Social media management**: Connect supported social accounts using platform OAuth and revocable limited scopes; creator chooses brands/voice and retains approval over outbound posts. Schedule, create, moderate replies within granted permission, measure reach and attribution. Honor platform API policies/rate limits, avoid credential scraping or engagement manipulation. Service order must track consent, draft, review, approved, published, receipts, failure/retry.

**2. Music management/track analysis**: Artist submits tracks or authorizes read-only access. Confirm rights and metadata; measure audio features and test responses from legitimately obtained data (stream performance, audience retention, saves, follow-through). Produce explainable ranked **candidates for promotion** with uncertainty and limited sample caveats; never assert a guaranteed hit. Track artist preferences, marketing budget, rights, goals, optional human/AIs reviewing. Sponsored/label-affiliated status must not silently change marketplace discovery order.

**3. Creator website and storefront migration**: One click from an owned Cohabitation band/business page to a site preview, supplemented by explicitly consented imports of owned assets and authorized social/store integrations. Avoid unrestricted scraping: obtain source-owner permission, prefer official APIs/export, respect authentication/copyright/terms/robots, secure image rights and preserve links. `discovery -> owner authorization -> source export/import -> rights/source mapping -> editable preview -> domain + SSL staging -> seller approval -> publish -> rollback`.
A NameSilo connection could support domain lookup, registration, DNS and renewals **only through server-side authorized API keys** and explicit user approval for potentially chargeable operations. Require live price, transfer verification, domain owner, rollback/failure status, renewal settings, and per-account isolation before buying or modifying DNS. Do not assert an API integration exists or any domain is available.
Seller's digital inventory, order history and payouts should not be silently migrated. Migrate what is permitted and legible; seller and customer privacy and financial records require separately approved transfer and dedupe policies.

## Business/economic separation
- The user's login, creator page, seller legal entity and connected Stripe account are **four separate relationships**.
- Software and games may be free, commercial SaaS, paid license or hardware shipment; all cash flows need verified legal seller/payee and server-authorized Stripe test-mode Checkout/Connect. Never imply a widget creates a Stripe account.
- Sponsorship, label/publishing relationships, and paid promotion must be **transparently labeled** and must not secretly distort equal-opportunity discovery ranking.
- The separate **Job Board** is not a Software & Hardware subcategory or a general Classified listing; it has its own work orders, applicants, milestone, consent and dispute workflows.

## Honest implementation milestones
1. **Render-only catalog**: bind Software & Hardware category to subtype filters and creator pages using *real* listings. No scan/purchase claims. Test query isolation and auth.
2. **Submission drafts**: authenticated metadata, creator-page ownership, stored license/rights, versioned file quarantine, audited review states. Test rejecting malicious archive and unauthorized publisher.
3. **Widget manifests**: first-party product cards then isolated embeds with permission review, no arbitrary JS. Test cross-origin denial, capability refusal and revocation.
4. **Payments/download delivery**: approved Stripe Connect test-mode seller and order; signed content URLs for authorized buyer; refunds, revoked updates and refund state. Test webhook replay and incorrect payee.
5. **Service pipelines**: separate scoped jobs for migration/social/music analysis. Keep provenance, consent and publish approvals.
No merge to production until real source paths, mobile render at 1440/390/360, working tests and owner/reviewer approval.

## Handoff integrity
This is an **Aletheia-6 proposal and working prototype**, not Geoffrey's authorized product policy or a completed software store. It does not replace, modify or reinterpret any Arts & Crafts image package and makes no live payments. Feedback and independent design criticism are welcome; Setu is not assigned new work by this document.
