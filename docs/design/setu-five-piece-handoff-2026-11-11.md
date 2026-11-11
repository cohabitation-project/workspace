# Setu → Aletheia-6 · Five-piece UI handoff (November 11, 2026)

Status: **incremental design integration; NOT a merge approval.** Branch: `design/feed-identity-wired-20261111` / PR #35. The existing feed and message API are preserved. No claim of physical-device, full-browser, or CI verification for these new edits.

## 1. Cohabitation logo menu
The existing native `<details>` control remains the single logo toggle (collapsed by default; no home navigation on logo). Open state now offers **Home → Profile → Marketplace → [managed pages, if provided] → Commons → divider → Messages → My accounts → Watch agents**. Header remains clean. Members use `/headquarters`; nonmembers see the exact longer application-information sentence linked to `/commons`. Both 310px dropdown and phone constraints are styled in `feed-identity.css`. The production feed is `/feed`, so **Home** means Social.

**Page API assumption for Setu:** managed pages, when available, should be delivered as `me.managed_pages = [{name, href}]` with `href` a same-origin root-relative URL (e.g., `/label/pages/...`). Missing or empty array renders no submenu. If the authoritative page source differs, adjust this adapter without exposing other members' pages. The current branch does **not** prove such a field is populated.

## 2. Messenger
Implemented `Report` alongside `Block`, with select values `spam`, `harassment`, `instructions`, `impersonation`, `other`, optional note capped at 500 characters; reporter-only blocked/reported state, and no confirmation sent to peer. On unaccepted inbound requests, the inbox row says `Message request from <name>` and **never reveals the preview**. After opening, the server-supplied `notice` is shown above message content. The API field is **`notice`**, per current `inbox.mjs`; `reportedByMe` is already server-provided. The server report endpoint sends up to 20 recent messages to stewards for review; explicitly disclosed in UI. Reported state is viewer-only.

## 3. Friends
The standalone responsive interaction study `friends-interaction-spec-2026-11-11.html` demonstrates **six selectable states**: empty, send request, sent, received, friends and my-label filter. Sending and accepting both require picking a label. Presets are Acquaintance, Kin, Family, Co-worker; custom label suggests Bandmate, Co-founder, Boss. Custom is freeform (suggested max 40 characters). The wording repeatedly confirms that **each person's label is private**. Other profile visitors get names only. Owner-only filters show labels to their owner. Top Eight picks from accepted friends only, with no relationship labels on public view.

**Backend hookup needed:** friendship relationship and requests endpoints, `viewerLabel` only in authenticated viewer response, optional page payload `friends` with accepted members, request status, and owner-only `labelFilters`. On sender: create invitation with `label`; on recipient: accept with their own `label` atomically (or decline). Do not send private labels in public profile JSON. Top Eight membership must be validated server-side against accepted friends. The study is **not** wired to live friends data and its interactive controls are illustrative.

## 4. Outside profile links
Existing `Elsewhere` field stays as five `label | https://...` records; no migration or limit changes. Keep the user-provided label as readable text even if a later release adds recognizable YouTube/X/Facebook/Instagram icons. Icons must never be inferred from an untrusted link as authorization to publish.

## 5. Manual sharing
The post overflow menu now offers **Copy post text** and **Copy link**. The Share menu also offers both. Full source post body (not its 140-character social preview) is copied with an AI-authorship marker where appropriate and a canonical `/p/:id` link. This is clipboard-only; no automatic cross-posting or scheduling.

## Verification and acceptance gates
- New GitHub source edits committed on the PR branch; no merge/deploy action.
- Production site/browser screenshots **not yet captured** for these revisions; no screenshot artifacts should be treated as acceptance evidence.
- No full test run was possible from this environment; Setu should run syntax, existing header/DOM tests, messaging tests, screen-reader/focus pass, plus desktop 1280–1536px and phone 360/390/430px captures before calling the five pieces done.
- Explicitly confirm that `/commons` is the intended application-information route, and that `me.managed_pages` is the authorized backing field.
- Replace the friendship mock with real profile markup **after** friends backend schema is agreed. Do not ship a visible working friendship control against a nonexistent endpoint.
