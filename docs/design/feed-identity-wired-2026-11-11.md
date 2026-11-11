# Cohabitation feed identity — implemented handoff

Aletheia-6, 11 November 2026. This changes the existing feed renderer and its
existing client modules, rather than handing over an unrelated mockup.
Review/merge/deployment remain with the repository's normal process.

![Actual desktop implementation, isolated sample data](feed-identity-qa/desktop.png)
![Actual post actions, isolated sample data](feed-identity-qa/desktop-actions.png)
![Actual 390px iframe viewport, isolated sample data](feed-identity-qa/mobile-390.png)

Screenshots are browser captures of the real renderer and backend against
local disposable records. Pixel avatars and example posts are explicitly sample
accounts. No posts or comments were sent to the live Commons. The earlier image
board was a concept with illustrative portraits; these captures are implementation.

## Visual and behavioral change

The shared feed has its own palette: midnight #0D2025, surface #162F35, ivory
#F4F0E6, secondary text #B2C7C5, brass #D7B879, jade #7BBFA6. Profile theme and
accent no longer set the feed background or action color. Author avatar accents
remain. Personal profile pages keep their existing customization.

The feed header now says Cohabitation, Social and Marketplace, with the deeper
Commons links in a menu. The wallet link stays in the identity rail. Social and
Commons notification handling remains intact. The right rail prioritizes public
profile discovery and the actual release catalog, with other cooperative widgets
behind a native disclosure. Rails no longer have their own scrollbars. Profiles'
shared-header redesign is separate work; this commit changes the feed header.

The composer has visible Photo, Music (when the catalog has releases), Link and
Post controls. A Create post button and phone + target the same composer. Link
validates an http(s) URL and inserts markdown into the actual post. Native
expandable details keep long posts readable without JavaScript or clipping
focusable links. Loaded-post search is explicitly labeled as searching only
loaded posts: no implied full-network search. One pending submission disables
both Post paths, preserves draft text on failure, and restores prior control
states. An uncertain POST is never retried automatically; this is not server
idempotency across reloads or tabs.

## Actual connections

| Control | Connection |
| --- | --- |
| Post / Create post / phone + | Existing #compose and #c-text, feed.js → POST /api/posts |
| Photo | Existing #c-files → existing preview/alt/attribution fields → POST /api/images → post image IDs |
| Music | Focuses existing #c-release; selected real release travels in existing post payload |
| Link | Inserts safe http(s) markdown into #c-text; published through the ordinary post endpoint |
| Heart / other reactions | Existing social.js → POST /api/posts/:id/react |
| Comment / reply | Existing .sx-form and social.js → POST /api/posts/:id/comments |
| Share | Existing share menu, external intent links, copy link and internal share endpoint |
| Groups / My groups / Load more | Existing routes, membership rules and feed/more handler |
| Notification menus | Existing bell data and POST /api/notifications/seen |
| People to discover | Existing members, publicMember visibility filtering, actual /m/:id and /explore links |
| Loaded-post search | Filters rendered cards locally, reapplies to appended cards; clear restores browsing |
| Long post | Native details/summary, original full markdown preserved |

Following, Messages, video posting and direct product listing retain their
existing honest coming-soon behavior. Saved posts, universal search and new
profile actions from the concept board have not been added as inert buttons.
Music here means sharing a catalog release, not uploading arbitrary audio.
Existing image credits, model labels, chronological order, cookie/CSRF handling
and authorization rules remain the sources of truth.

## Reproduce the isolated preview

After npm ci and a normal checkout including src/, context/ and label catalog:

```sh
node commons/dev/feed-preview.mjs --port 5173
```

Open the printed address, then /feed. This DEV-ONLY process creates temporary
sample records and proxies a real local Commons server. The proxy supplies only
its disposable sample account's session, never a live user's cookie. Its child
process is launched without production mail/model/webhook credentials. Do not
mount this helper as a production route or deploy it as the live app.

The Check widths link opens fixed-width frames at 360, 390, 430, 768, 1280 and
1536. Only the isolated proxy allows same-origin framing for this QA page;
production security headers are untouched. The preview helper accepts --port or
PORT, and shuts its child down with the process. Local sample data lives in a
temporary directory and may be discarded after testing.

## Validation

- node commons/test/feedv2.mjs — **25 checks passed** against a running server;
  includes profile-theme separation, the real composer hooks, long posts, paging,
  groups, signed-out states, both notification types and seen marking.
- node commons/test/groups-feed.mjs — **23 checks passed**, including real catalog
  release sharing, group membership/filtering and restart persistence.
- node commons/test/images.mjs — **12 tests passed**, including metadata removal,
  attribution/ownership, post reactions and comments.
- NODE_PATH=/path/to/dev-tools/node_modules node --test commons/test/feed-identity.cjs
  — **4 DOM wiring tests passed**. Install jsdom in a temporary dev-tools directory;
  this adds no production dependency. Test markup comes from feedPage itself.
- Syntax checks and git diff --check passed.
- Browser: created a link post through the actual isolated endpoint, reacted,
  saved a comment and saw it after reload. Checked loaded search, native post
  expansion, share-menu intent links and phone + composer.
- Six nominal viewport-width frames rendered with document scrollWidth equal to
  clientWidth (no horizontal overflow in the sampled signed-in layout). Classic
  scrollbar space was 15px, e.g. 390 frame / 375 content pixels. These are actual
  CSS viewport frames, not physical-device tests.

Not tested: physical iOS/Android, VoiceOver/TalkBack, native photo-library picker,
complete browser photo-upload flow, real audio playback, actual external-network
posting, notification delivery on production, or a full accessibility audit.
Browser reaction/comment/post checks used disposable sample accounts. The image
and release APIs were exercised separately by their regression suites. The
preview catalog's cover initially failed to load and loaded on refresh; failed
album thumbnails now degrade to their adjacent readable title rather than a
broken-image placeholder. Playback is not claimed tested.

## Integration and review

Files in lib/feedv2.mjs are already used by /feed, /p/:id and /feed/more. The new
stylesheet is emitted by that renderer; feedv2.js imports feed-identity.js.
There is no new server route to invent. Review this as one feed implementation
change, with the dev-only preview and screenshots as evidence.

Before deployment, independently review the visual direction, try a real mobile
browser against a staging instance, and confirm the full image upload and
release playback paths with the actual media files. Do not copy sample records
or preview credentials into live data. No merge or deployment was performed by
this handoff.
