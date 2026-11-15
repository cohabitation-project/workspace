# Cohabi Social / Create — visual + wiring handoff
**Owner:** Aletheia-6 · **For:** Geoffrey visual review, then Setu implementation · **Date:** 2026-11-15
**Status:** draft prototype only. Not an approved UI; no production merge or deployment.

## Run / inspect
- Standalone prototype: `docs/design/prototypes/cohabi-social-a6-2026-11-15.html`
- Open locally in a browser. The prototype contains real interaction states, but intentionally **does not call backend APIs** and its example band/store identities are marked examples.
- References inspected: `docs/design/references/2026-11-15-social/README.md`, Facebook compact composer / create panel, current Cohabi Social and expanded composer, supplied screenshots.
- Original shared header and phone bottom navigation **must be reused from the application source**, not replaced by the standalone prototype's explanatory shell. Preserve the existing `appmenu.mjs` unified COHABI dropdown.

## IA and interaction contract
**Top global destinations:** Social | Feed (short-form video) | Marketplace (section menu) | Groups | Cobox. These are *destinations*, NOT categories for publishing. Search, alerts, account remain in application header. Desktop icon+text; phone five icon+text targets in bottom navigation, no horizontal overflow.

**Social browse:** One compact feed-topic filter **for viewing**, e.g., Everyone, Commons, Arts, Music, Brain rot, Video, Political. No "which feed to post to" field. System should classify post categories from supplied content metadata/links/media with human-editable tags in a later iteration. The posting step always creates a social post, independent of browse filter. Avoid asserting automated classification is already built; record algorithm decisions and allow correction.

**Feed composer:** Avatar, prompt, 3-4 quick shortcuts (Photo gold; Video blue; Music purple; Create coral); buttons open expanded composer with corresponding section selected. No attached file input / URL field / feelings / release / external share checkbox permanently exposed in feed.

**Expanded Create panel:** On desktop, editor left, live post preview right; mobile editor is a focused full-screen layer, then an explicit preview action/sheet in real integration. Creator-identity picker (managed identities only, from actual permissions), content type, body, media attachment, relevant metadata, and compact collapsible Share & Attribution rows.
- Attribution: for every uploaded photo/video, require alt/description and maker provenance (human / AI / human+AI) + maker name. Actual server validation required; don't rely on frontend alone.
- When music is selected, **share an existing release**, do not fabricate new album creation. Owner-authorized "Create new album/release" is a separate full music studio workflow to be integrated later, optionally emitting a linked social announcement when release succeeds.
- When store identity is selected, attaching an existing product/listing is a social share. **Create new listing** belongs in owner-authorized storefront workflow; after successful catalog write, social share may be generated. Do not write catalog records from generic post create calls.
- Default public post; audience permissions remain real. Group optional for memberships. External sharing X, Bluesky, Facebook is off unless user checks, and success requires receipts/provider results; partial failures must be surfaced.
- Preserve Feeling/kind types: post, joke, feeling, gratitude, made-something, question, vent, celebration, journal. Existing video support up to two minutes, upload progress, image labeling and signed author are required.
- Monetization/story/boost/schedule are future capabilities unless proven present in code. Do not render operational fake buttons or imply live payments.
- Close/cancel must not publish. Unsaved draft warning and persistent drafts can be later separate decisions.

## Wiring and route map (source-grounded vs new)
| UI | Existing known route / facility | Implementation requirement |
|---|---|---|
| Social nav | `/feed` via `appmenu.mjs` | preserve shared header and state |
| Friends/group navigation | `/feed?tab=friends`, `/feed?tab=groups` via `appmenu.mjs` | match selected state |
| Marketplace | `/label`, `marketMenu` in `appmenu.mjs` | use real sections and deep links |
| Creator member profile | `/m/:id` via `appmenu.mjs` | server-sourced identity and rights |
| Cobox | `/cobox` restricted by `isCommonsMember` | show appropriate fallback if ineligible |
| Explore | `/explore` | preserve application search |
| Photos/media, feed post, group, external share | existing application flows identified by Setu; routes NOT asserted here | wire exact current handlers, authorizer, errors, upload lifecycle, result receipts |
| Cohabi Feed video view | `/cohabi-feed` per Setu current implementation | preserve swipe/muted-autoplay semantics |
| Release creation, product creation from composer | **new orchestration only** | authorization, idempotency, catalog save, success receipt and optional linked social post |

## Design decisions that differ from Facebook
We reference the **information architecture**, not Facebook's visuals or assets. Theme: real Cohabi cream, plum, near-black, the four brand colors gold/sky/lilac/coral. Typography is mixed editorial heading + legible UI sans. Do not transplant their icon assets, button styles, or page markup. Keep distinct Cohabi AI/human provenance and multi-identity publishing.

## Acceptance
1. Geoffrey reviews prototype for overall geometry and composition, before merge. His direction, not an automatic gate for independent QA.
2. Setu integrates with actual app header, navigation, feeds, group membership and managed-page identity model.
3. Screenshots from **real browser render** at 1440, 390 and 360 pixels; desktop full-width and open dialog, mobile feed and open editor.
4. Keyboard focus/escape, accessible control labels, touch targets >=44px, contrast, error recovery, alt/credit validation, clear media upload progress; 360px no horizontal scrolling.
5. Test persona: guest (redirect sign in), ordinary member, band-page manager, storefront owner, agent identity, unauthorized user. Prove no identity spoofing or catalog write on generic social post.
6. Existing posting and cross-posting regression tests. Verify requested platforms and compare delivered statuses rather than claiming one checkbox means success.
7. **No auto-feed-selection on publish.** Browse filter stays browse-only.
8. If screenshot comparison shows wrong header/theme, repair by using actual shared shell, not drawing a separate fake site.
9. Real browser screenshots and runtime integration are **not yet complete**. This file is the design source and wiring contract, not a test report.
