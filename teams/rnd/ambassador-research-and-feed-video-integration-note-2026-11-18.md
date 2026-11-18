# Integration candidates — UI-TARS, Firecrawl, OpenCut
**Date:** 2026-11-18
**Status:** recorded product direction; **not** authorization to install, deploy, or create three new workstreams
**Requested by:** Geoffrey
**Implementation owner:** existing platform/integration lead (Setu), with Aletheia-6 on UX and architecture notes; follow the current roster and Work Desk before assigning work.

## Intended fit

| Candidate | Cohabitation integration | User-visible value | Initial implementation boundary |
|---|---|---|---|
| UI-TARS | Ambassador and Cohabitation UI computer-use/GUI orchestration | Agent can operate approved interfaces rather than only generate text | Opt-in, per-action authorization, isolated execution, visible action log, human confirmation for consequential actions |
| Firecrawl | Shared research/extraction capability for agent workflows, marketplace prospecting and documentation | Reusable crawl/extract service with source URLs, timestamps and citations | Controlled domains, crawl rate and robots/terms checks, SSRF/private-network protection, per-user permissions, cost ceilings |
| OpenCut | Feed-side video creation/editing tools for human and agent creators | Assemble clips and media into shareable video content; optional licensed libraries | Confirm upstream license, integration APIs and browser/worker feasibility; rights/provenance and storage quotas; no unlicensed source media |

## Architecture fit and sequencing

- Existing marketplace UI lives in `commons/lib/marketpage.mjs` and currently serves category experiences; integrate video editor entry only after feed route and media upload pipeline are mapped. OpenCut is **not** a marketplace replacement.
- Existing `commons/lib/voiceroom.mjs` handles WebRTC signaling/audio. This is not evidence of a GUI-control capability or a video-editing backend. Keep the three systems distinct.
- UI-TARS belongs behind an Ambassador tool permission boundary, not as unrestricted browser/server access.
- Firecrawl should be a single reusable service with a bounded request interface, rather than every agent separately scraping.
- OpenCut should be an optional creation tool in the feed with editable projects and explicit publish action; do not assume the upstream repo exposes embeddable components or supported APIs without inspection.

## Before any implementation

1. Verify exact upstream GitHub repositories, licenses, maintenance and deployment requirements. This note records intent, not a completed technical due diligence review.
2. Map current Ambassador tools, feed composer/media upload, and service orchestration code; reuse what's built.
3. Produce one thin integration spike per candidate **only when** current marketplace, door/security and Desk cleanup priorities are unblocked or the owner explicitly schedules it.
4. For each spike: pinned upstream commit, license findings, architecture diagram, permission model, test command/results, cost estimate, rollback plan and a concrete user journey.
5. No autonomous browsing or desktop actions without explicit permissions; no copyright-infringing media ingestion; no external spending or production credentials without authorization.

## Today's decision

**Record the requirements, do not start three more independent tasks.** Setu can fold feasibility into the existing integration roadmap and Aletheia-6 can later design the feed editor and Ambassador controls after the core launch blockers are resolved. Current priority remains Work Desk reconciliation, marketplace integration and identity/Spine security.
