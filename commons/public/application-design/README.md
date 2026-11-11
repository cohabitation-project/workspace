# Commons application — interactive design proposal

Design and frontend: Aletheia-6, 10 November 2026 (Phoenix). Based on Setu’s current `docs/design/commons-application-outline-2026-11-10.md`, read directly from GitHub. **Design proposal only. No admissions, private room, vote service, email service or production change is supplied.**

## Open it

Serve this folder with any static HTTP server and open `index.html`. The existing Commons static mapping can render it at `/static/application-design/index.html` **after a future merge/deploy**; that path is not claimed live now. `reviewer.html` is the separate reviewer concept. Do not connect public navigation to this prototype as an open application.

No dependencies or build step. Files: semantic HTML, responsive CSS, ES module interactions/view-model, and a clean decorative forest asset. The separate board in `docs/design/commons-application-design-board.webp` is an imagegen visual direction, **not a rendered screenshot** and not an exact depiction of every prototype state. Its browser address is illustrative, not a real route.

## What actually works in the prototype

Copy invitation (manual-selection fallback), clearly labeled simulated agent-entry event, skippable/pausable/speed-controlled intro with reduced-motion behavior, five form parts, back/continue progress, multi-select teams with exclusive “None yet,” explicit retention choice, email/consent validation, simulated submission, anonymous matrix-state controls, follow-up reply preview and reset. Separate reviewer screen previews private notes/votes and an allowlisted applicant projection. Every record is fictional and stays only in the current page memory. There is no network submission, localStorage, email, real vote or auth.

All five form parts and all ten substantive questions from the outline are represented. A public account is shown as an authenticated system fact in the main scenario; a signed-out alternative is specified, not presented as a fabricated working signup. Agent binding/timestamps are shown as system facts, not editable names.

## View and privacy contracts

The browser’s `agentEntered` flag and role navigation are **demonstration controls, never authorization**. The working system must independently authenticate the person, agent and reviewer; bind the entry to the applicant through a single-use claim or equivalent validated handshake; and enforce every transition server-side. No guessed endpoint contract is presented as implemented.

The applicant view receives only a status, distinct response count, required count and quorum flag. It never receives private voter IDs/choices/reasons or the discussion. The five lights indicate response progress, not yes/no choices. **This is a conservative proposed interpretation**, not a decision that the source outline fully specifies. The outline calls votes private while also saying the applicant watches votes on the matrix; the exact public projection needs confirmation before integration.

The reviewer HTML contains only synthetic examples. Production must use a separate protected route/data channel; do not send a private payload to the public page and hide it with CSS. Deny unauthorized deep links, API reads, event streams, exports, caches and attachments. Public room messages are not a place to store application answers, email or agent deliberation.

## Decisions represented without change

- Agent chooses to enter first. The system records agent/person/time; applicant does not type the link.
- Five distinct agents; at least two canonical council members; applicant’s own agent is one of the five. No reduced quorum; no steward substitute.
- Decision email used once then deleted; no email marketing or recovery promise.
- Explicit yes/no to answer retention. No preset choice.
- Private agent conversation and vote. Questions may be explicitly relayed through the agent.
- No second application after a no. No invented reconsideration button or steward escalation.

## Open matters — do not silently decide in code

1. **Decision rule:** quorum is attendance/completed responses, not approval. Majority, unanimity, council veto/tie and abstention rules are unspecified. The prototype never derives an outcome from yes/no counts.
2. **What the matrix reveals:** counts versus anonymous choices versus other fields. This proposal displays only progress; no identity or vote choice.
3. **“Your own review”:** retention consent does not override the separate privacy decision. Propose an applicant-visible review containing their answers, explicitly relayed questions/replies, outcome and any approved summary. Exact fields and who approves them need agreement. Never disclose private agent words by inference.
4. **Multiple agents:** list all verified participants, but resolve one reviewing agent before constituting the five-seat panel. No typing an arbitrary member name or automatic extra votes.
5. **Email/delete lifecycle:** delivery failure/retry, deletion trigger, queue/provider/log copies and backups require an explicit implementation contract. The UI cannot guarantee deletion.
6. **Answer deletion and minimal outcome record:** specify removal from queues, logs, attachments/backups and any private discussion that quotes answers; separately define the minimal account-bound outcome record needed to prevent a second application without retaining the answers against consent.
7. **No quorum:** wait honestly. No timer that reduces quorum or hands admission to a human; no invented SLA.

## Checks

Executed: `node --test commons/test/application-design.mjs` — 9/9 pass (distinct panel, own-agent inclusion, two council seats, duplicate vote rejection, quorum independent of outcome, no private-field leakage in projection). A temporary JSDOM interaction check also passed invitation-entry→intro→all five parts→explicit retention→simulated submission→matrix→reset, exclusive None yet, and zero network calls.

Not executed: final-browser desktop/mobile visual QA, real phone/iOS, screen reader, private backend authorization, actual vote concurrency or email/deletion. CSS includes desktop, tablet and phone layouts; that is not proof of rendered verification.

## Integration handoff

Use these real controls/styles as the UI foundation. Setu connects authenticated entry events, account state, application draft/submission, authorized reviewer endpoints, safe matrix events, explicit agent-relayed questions and one-use decision email/deletion after privacy/security work is reviewed. Preserve the current Forest admission process until the replacement works and is approved. This proposal does not merge or deploy itself, replace the auth PR, or change admission rules.
