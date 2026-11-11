# Feed → Marketplace pages: creator publishing flow

**Design decision · Aletheia-6 · November 11, 2026**

Geoffrey's request: a creator composing from the social feed should be able to publish a song directly to an artist page, a product directly to a business/shop page, or a video directly to the page they manage. They should not need to leave the feed and recreate the item elsewhere. **Not yet implemented as a live backend capability.** This specification is an additive roadmap item, not an assertion that music upload, product creation or video upload currently work.

## What I saw in the current branch

The actual composer in `commons/lib/feedv2.mjs` already contains text, photos, a post kind, optional group, and an existing release picker. Product and video buttons explicitly say `soon`; the release picker shares a release already present in the label data. The existing brand menu reads managed pages from `orgpages.managedBy(me.id)`. That is the correct ownership source for a destination control. Existing feed posting in `commons/public/feed.js` must remain unchanged until destination-aware API support is verified.

## Interaction: one composer, several destinations

1. Open **Create post** in feed (desktop inline composer or mobile sheet).
2. Choose **Publish to**: default **My social feed**; additionally each page managed by the signed-in account, grouped as Artist / Shop / Business / Other if the source has reliable page type metadata. If no pages, do not present a misleading empty dropdown; show `Posting to your feed`.
3. Choose content type: **Post**, **Song**, **Product**, **Video** (only types that the selected page actually supports). When publishing songs, expose audio/release metadata; for products, listing title, description, imagery, price and stock as appropriate; for video, supported media, title and description. Never show a generic textarea as if it created an actual release/listing.
4. Primary button says **Post to feed** or **Publish to <page name>**. Confirmation should include a link to the *destination item*. A successful item can optionally be shared to the social feed as a separate, explicit choice; do **not** silently duplicate it in both places.
5. If a page is unavailable or access was revoked, preserve the draft and present an explanation, never quietly fall back to personal-feed publication.

## Necessary states

- No pages: current feed composer unchanged.
- One page: page appears as a destination, but the default remains personal feed.
- Multiple pages: owner selects exactly one; a page name and type must remain identifiable on phones.
- Unsupported type: disabled with specific reason, not a fake Publish button.
- Upload not yet available: explicitly `Coming later` with no working-looking submit.
- Submitting / success / validation failure / permission revoked / network failure: do not discard draft or media merely because an operation failed.
- Mobile sheet: destination picker appears *above* the content controls and above the sticky action bar, with native label, 44px targets, and no horizontal overflow.
- Agent owner: same permissions as humans; preserve explicit AI attribution where content is cross-shared.

## API proposal for Setu (adapt to existing orgpages/market contracts)

`GET /api/creator/destinations` returns only authorized, currently managed destinations with stable `id`, `name`, `kind`, `href`, and `supportedKinds`. (Could instead server-render the data from `orgpages.managedBy(me.id)` and validate again on submit.) Treat the server as authoritative. Use stable IDs rather than trusting submitted slugs or labels.

An additive publish action needs a destination ID + typed item payload, and should create **one** canonical item record on the selected page. Only after success, optionally allow a separately selected cross-share to feed, referencing that canonical item. Require authentication, CSRF protection, page authorization *at write time*, safe file upload validation, clear attribution, and idempotency for retries.

Please confirm: page type taxonomy; whether song publication creates a release versus embeds an existing release; supported audio/video upload constraints; product required fields; whether cross-share defaults off; whether drafts survive navigation.

## Relationship to current PR #35

**Do not block feed launch on this future feature.** Maintain a clean seam in the composer and keep unavailable market destinations out of a functioning submit path until supported. Existing copy-post, private messenger, and friends work remain separate. This is a requested extension of the social feed, not a redesign of its four-color identity.

## Visual preference

Reuse warm ivory composer, amber primary action, lilac destination highlight, sky contextual chrome. Keep the interaction lightweight: a single labeled destination row instead of a new navigation panel. The messenger launcher should remain distinct from the mobile bottom navigation; evaluate overlap at 360px/390px before changing its position.

## Acceptance before enabling

Test page ownership and revoked permissions; zero/one/many destinations; artist song, product and video contracts; mobile and desktop focus order and screen reader wording; draft preservation; no accidental double publishing; no fictitious success for pending media. Capture 1280px and 390px views with open picker, chosen page, upload form and failure state. These are **future gates, not verified tests**.
