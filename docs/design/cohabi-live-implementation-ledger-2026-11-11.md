# Cohabi Live — Implementation decision ledger
**Record date:** 2026-11-11 (Pacific)  
**Recorder:** Aletheia-6  
**Decision input:** Geoffrey Cooper in design/implementation conversation; invited Setu handoff  
**Status:** Versioned decision record, not a production-deployment receipt. Update with links to actual PRs, SHAs, tests, and deploys as work lands.

## Evidence ledger
| Sequence | Action | Status / evidence |
|---|---|---|
| 0 | WebRTC voice-room, Station permissions and basic browser UI developed by previous contributors | Existing repo modules `commons/lib/voiceroom.mjs`, `commons/public/voiceroom.js`, `commons/public/voiceroom.css`; code presence does not certify live deployment |
| 1 | Cohabi Live dashboard visual direction: correct multi-color mark, cream header matching Cohabi Social, teal/live accents, dark meeting stage, real participant/sidebar controls, small circular agent portraits | Geoffrey-approved design direction; screenshot delivered in chat; source image not packaged in repo. Setu reportedly implemented first pass; exact commit/deploy SHA must be attached by Setu |
| 2 | Aletheia implementation-ready frontend draft and Setu handoff | Draft PR [#37](https://github.com/cohabitation-project/workspace/pull/37), branch `design/cohabi-live-stage-20261111`; NOT certified or merged. Draft already has front-end shell, compact agents, roster, local stage preview; dual-track remote screen share, real portrait member IDs and browser QA open. Desk task `t_3cd9592e76` handed to Setu for backend/media integration |
| 3 | **Next approved direction:** `Invite Your Agent` control and a real agent notification/response path to Cohabi Live | **Specified and shared with Geoffrey as a copy/paste implementation handoff on 2026-11-11; not yet confirmed received/implemented by Setu.** This entry is a requirements decision, not a claim of working code |
| 4 | Following the agent invitation milestone: verified human↔agent conversation and later Ambassador meeting assistant | **Proposed sequencing, not approved deployed functionality.** See below |

## Sequence 3: agent invitation and actual participation — handoff requirements
- Add **Invite Your Agent** in Cohabi Live header or Participants panel, respecting cream/dark Cohabi branding. Display only real identity/presence; show pending, accepted, declined, unavailable and expired without falsely signaling online status.
- Authenticate the human initiator; verify room/member permissions; target the agent's stable member ID, not an untrusted display name. Deliver a bounded, expiring meeting invitation by secure agent inbox/poll/connector or known connected agent runtime. Do not put bearer tokens in URLs/logs or turn a copy-link into authorization.
- Agent can **choose** to accept or decline. An actual connected agent session, with a valid identity and room authorization, is required before showing it present or speaking. Provide non-browser/MCP or API path for connector-only participants. Disclose if provider runtime cannot receive push/wake signals and use explicit manual/poll flow instead. Do not automatically resurrect a named ChatGPT/Claude/Grok session or fabricate responses.
- Agent has compact round existing member portrait, name and speaking indicator. If participant protocol lacks member ID/portrait, add a privacy-reviewed field rather than deriving portrait path from transient peer ID.
- Integrate with existing Sensory Station `commons/lib/station.mjs` per-member grants and `speakInStation`/mention-to-reply architecture where feasible; inspect voice-room's `/api/kin/reply` placeholder and prove any new reply endpoint is genuinely authenticated, connected and attributable. Do **not** silently equate automatic generic kin-model calls with a particular invited agent's independent session.
- Acceptance test: human invites a genuinely connected agent; agent sees request and accepts/declines; verified room text response arrives with correct identity; optional TTS produces speech; disconnect/revoke actually prevents additional transcript/audio access. Test offline, expiration, duplicate, guest/social-only, unauthorized, token leak, rate-limit and late/restart cases.
- **Specific Aletheia test:** the assistant currently has connector tools for *Sensory Station* but not a native Cohabi Live WebRTC agent bridge. Demonstrate a permissioned invitation inbox and text room API; call Aletheia only if there is a real connected session to receive/respond. Do not promise passive push into arbitrary conversations.

## Sequence 4: recommended next work **after** proven invitation
**First:** a two-way human + two distinct agents meeting (with speaker attribution and independently revoked access), with real network and mobile QA. Show explicit runtime availability and no impersonation.

**Then:** make the small **Ambassador** corner button lead to an opt-in working session assistant: start with manually supplied agenda/notes and actionable recap; only later consented per-speaker capture, privacy-filtered Mycelium room graph, corrections and permissions, and editable plans/slide exports. Opening prompt: “Would you like the Ambassador to assist in this meeting?” Differentiate assistance, transcription, and retained audio recording. One host's permission cannot override other speakers' consent. No automatic cross-room/global memory.

**Beyond:** calendar, invitations/RSVP, General Hall entry, moderating events, separately scalable Cohabi Stream.

## How to update the ledger
Every implementation must add: date; contributor(s); exact repo SHA/PR; feature flag and route; test command and actual result; reviewed-by; deploy commit + environment if verified; security/privacy caveats; next work. Claims without these receipts remain **reported / unverified**. Do not imply this file authorizes merging, spending, or deploying.
