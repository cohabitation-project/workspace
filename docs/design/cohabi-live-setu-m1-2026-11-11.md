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

## Geoffrey's new product requirement: Ambassador meeting companion (2026-11-11)
**Status: vision / future milestone, not implemented by PR #37.** Do not block Milestone 1 or add a misleading working recorder icon.

- A small, recognizable **Ambassador** logo at the upper-right of Cohabi Live opens a compact, accessible assistant side panel, without obscuring the presentation stage. Provide minimized, expanded, keyboard and mobile states; use existing Ambassador identity/brand, don't mint a competing fake agent.
- With explicit user action, the Ambassador can help prepare an agenda, organize ideas, answer questions with source links, compose plans, summarize conversations, distinguish suggestions from actual group decisions, propose action items with owners/due dates, generate proposals or pitch-deck outlines and export editable deliverables. An actual PPTX generator/export is a separate testable integration, not a button that merely pretends to produce slides.
- **Consent first:** do not capture, transcribe, persist or process live meeting content by default merely because the Assistant panel is present. Define who can initiate capture, notification and per-participant consent before any recording, who can opt out, visible status, media vs text capture distinctions, stop/revoke, retention/deletion, access permissions and guest behavior. Meeting notes should distinguish manual entries, model-generated summaries and verified approvals. A meeting participant can correct disputed attribution. No unreviewed security claims.
- Stronger version: source-grounded meeting memory integrated with Continuity Spine/Mycelium only after that system's independent security review and explicit room-scoped permissions. A transcript is not authority.
- **Milestones:** M1 functional meeting/stage; M2 agent participation; M3a Ambassador panel (first opt-in manual agenda and note workflows, then consented capture, then artifacts and editable deck export); M3b calendar/events and eventual broadcast expansion.
- **Review challenge:** how do we avoid surreptitious capture, false decisions/action assignments, prompt injection through spoken meeting content, and irreversible sharing of sensitive business discussions? Request product, accessibility and privacy reviews before enabling any capture.

## Ambassador meeting memory: opening consent and speaker-specific capture (Geoffrey, 2026-11-11)
**Future capability, NOT implemented / authorized by Milestone 1.** Geoffrey clarified the intended experience:

1. At meeting start, ask **“Would you like the Ambassador to assist in this meeting?”** with separate descriptions of *assistance without capture*, *live speaker-attributed transcription/notes*, and *audio recording*, because these are distinct permissions. The meeting host's yes does **not** override each participant's consent. Show status to everyone, and re-check when a person joins late or capture mode changes.
2. Build an **individual speaker pipeline**, where technically possible: each incoming WebRTC audio track has an authenticated peer/member identity, time boundaries and mic state. If audio arrives mixed (phone bridge or external stream), diarization yields *probabilistic* speaker labels, not verified identities; ambiguous sections must remain unassigned. Never imply voice biometrics or automatic identification without separate consent and review. Agent spoken output must carry its own source/runtime attribution.
3. An optional **ephemeral real-time organizer** consumes only consented streams/events and extracts provisional topics, proposed actions, open questions, decisions, dependencies, citations and corrections. Use a room-scoped graph/index inspired by Mycelium: nodes link to transcript segments, timestamps, speaker identity confidence, consent/visibility and original source. Distinguish provisional model inference from participant-approved decision. Audio and transcripts need independently controlled retention/deletion.
4. End-of-meeting review: an authorized organizer receives a *draft* recap, decisions requiring confirmation, tasks requiring owner acceptance, structured project plan, and optional proposal/deck outline. Participants can dispute/correct attribution and choose which outputs to save/share/export. No automated sending or task assignment without explicit authorization.
5. Revocation/privacy: choose whether nonconsenting participants' media must be excluded at ingest or capture must pause for the whole group; default to **no unconsented capture**. On pause/revoke, stop ingest immediately, update all indicators, and support deletion/retention workflows respecting applicable law and known backup constraints. At-rest retention cannot be solved by hiding a client button.
6. Threat model: malicious spoken instructions do not gain administrator authority; redaction at source and permission-filtered querying; cross-room/tenant isolation; denial of service/latency bounds; failed transcription and dropped tracks visibly marked; corrections versioned. Private meetings cannot feed collective/public Mycelium by default. Integration must not be advertised as deployed until Mycelium security review and runtime checks are passed.
7. Candidate acceptance demo: three consented speakers and one nonconsenting late joiner; verify individual attributed segments for the three, zero capture of the late joiner, pauses and revocation, source-linked provisional graph updates, corrections, end recap, and export only after approval. Separately test mixed input where speaker is unknown, and that a malicious utterance cannot change room permissions.

**Sequencing:** preserve M1 meeting controls and stage; scope this under later Ambassador architecture, after real agent participation and a signed-off privacy/consent contract. Coordinate with Mycelium R&D and Review rather than building a parallel unreviewed memory store.
