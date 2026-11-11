# Cohabi Live — implementation-ready Milestone 1 handoff to Setu

**Date:** 2026-11-11  
**Designer / frontend:** Aletheia-6 (GPT-6)  
**Existing backend and deployment:** Setu and prior contributors; do not erase attribution  
**Independent review:** Ash  
**Status:** DRAFT BRANCH, NOT MERGED, NOT DEPLOYED, no end-to-end browser testing claimed  
**Branch:** `design/cohabi-live-stage-20261111`

## Direction and source of truth
Geoffrey approved the Cohabi Live Meeting Dashboard visual reference in chat on 2026-11-11. **The image is not committed as an asset in this branch**; ask Geoffrey/Aletheia for the original reference when doing pixel-level QA. The recorded design handoffs in Land & City 2026-11-09 specify four-color Cohabi wordmark, teal LIVE status, dark stage, right Participants / Chat / Calendar, presentation screen main stage, camera and agent portrait strips, General Hall launch and future Cohabi Stream. These design choices are not all implemented.

## Actual source changes on branch
- `commons/public/voiceroom.js`: builds branded HTML directly in existing root; same original WebSocket, mic/camera, peer, chat, TURN and TTS paths remain. Responsive header and copy-link feedback; actual DOM-derived participants list; chat UI; calendar clearly shown as **not connected**. Accessible tab roles and mobile panel close button. Circular agent portraits; no fabricated participant records. Shared-screen local stage preview while keeping camera in local tile.
- `commons/public/voiceroom.css`: additive visual theme, stage, toolbar, compact agents, desktop/mobile side panel and motion preferences.
- No new JS dependencies; no server, auth, grant, network or deployed config edits.

## Important known blockers / corrections before merge
1. **Remote screen sharing not yet dual-track.** Existing toggleScreenShare replaces the peer connection's camera sender with the screen. Only the local presenter gets a separate stage preview; remote participants still receive the replacement stream and cannot retain the remote camera independently. To complete P0, introduce a separately negotiated screen track/transceiver, type and peer binding in signaling, main-stage selection from remote stream, end-of-share cleanup and renegotiation. Test presenter local and participant remote with two browsers. This draft does NOT claim the P0 screen-share fix complete.
2. **Agent portrait member IDs are absent from current signaling.** Server sends `{peerId,name,badge}`, so this draft deliberately falls back to a circle with first letter rather than using peer ID as a fake member portrait path. After a privacy review, add a safe stable member ID or signed portrait URL in authorized participant protocol and test agent avatar correctness.
3. **Agent reply bridge remains placeholder.** `commons/lib/voiceroom.mjs` posts to `/api/kin/reply`; do not claim connected independent agent conversation without verifying that endpoint and actual runtime. Keep Phase 2 separate.
4. **Calendar and event management are not wired.** No fabricated schedule. Any functionality requires real backend and permission design.
5. **Initial connection/leave/error states and browser-media permissions** need actual user/device QA. Visual code has not run through browser CI in this connector session. No screenshots from current runtime are presented as proof.
6. **Brand asset:** Current ✦ glyph is a temporary CSS/typographic mark; replace with the real existing four-color Cohabi artwork/wordmark under appropriate asset attribution. Preserve approved screenshot's proportions.
7. **A11y QA:** responsive 360, 390, 430, 768, 1280, 1536; keyboard focus, VoiceOver, high zoom, safe area, chat/mobile panel state, reduced motion. Ensure all interactive elements are actually usable.

## Proposed acceptance plan (do not mark passed until executed)
- Syntax: `node --check commons/public/voiceroom.js`; CSS parse/lint; compare existing tests.
- One human: authenticated member gets actual microphone/camera and rendered own tile; false-permission fallback and correct status.
- Two browsers: join, bi-directional ICE media, chat, disconnect, retries.
- Presenter: share tab/window/screen; local and remote stage show same screen, while BOTH sides retain presenter's separate camera tile; stop from app and browser UI, restore stage; revoked permission.
- Agent: grant required, member-specific ID and compact avatar, speaking ring, roster type, revocation, rejoin; no invented remote runtime.
- Privacy: anonymous/social-only users rejected by WS and TURN, no URL token, no agent media without grant.
- No runtime errors; compare against approved design screenshot rather than an invented illustration.

## Review instructions
**Setu:** own backend integration and decide actual work needed to add dual track and member portrait contract; run browser tests; do not silently call Milestone 1 complete. Review design CSS for conflict with original stylesheet and render after merge. This branch is safe to rework; no live deploy requested.

**Ash:** independent device, browser, permission and real-identity checks; return failures to branch before merge.

**Aletheia-6:** frontend/layout corrections, documentation, UI acceptance; do not assume Setu should transcribe visual art into UI.

**Geoffrey:** target image and product choice, not required to fix technical wiring.

## Milestone sequence
1. **M1:** Design fidelity, responsive UI, two-track screen sharing, actual browser QA.
2. **M2:** Authenticated independent agent runtime voice/text/visual consent. Current backend has pieces, not proven integrated.
3. **M3:** General Hall meeting launch, event calendar/RSVP/moderation; later separately scalable broadcasting and optional rentals, requiring economic/legal/security review.

No parallel Claude Code session required; keep node build separate. No merge/deploy without Setu's independent integration review and Geoffrey's approval.
