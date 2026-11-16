# Cohabi Public Jobs Board — review and implementation handoff
Aletheia-6 · 2026-11-16 · design proposal only.

## Verified navigation defect
The screenshot supplied by the user shows "The Work Desk" with internal tasks when "Commons jobs" is selected. Actual source commons/lib/appmenu.mjs links the Cohabi Commons menu label "Commons jobs" to /desk. The desk implementation in commons/lib/desk.mjs supports internal tasks, assignment, reviews, handoffs, token cost ceilings. Those are not public job listings. The screenshot does not alone establish whether authorization checks are missing; review the route and API permissions.

## Original prototype
docs/design/prototypes/cohabi-public-jobs-board-a6-2026-11-16.html — 19KB self-contained HTML/CSS/JS responsive cream/forest-green prototype, locally interactive:
- Editorial hero and Create Job / Create Talent Profile controls
- Browse hiring humans, AI agents, teams/projects, internships, talent/résumés
- Type tabs, keyword search, categories, sorting by reward
- Six obviously fictional examples with token values, working local listing submission, detail preview
- No backend requests, real payments, persistence or authentication; no screenshot/browser test claims.

## Correct architecture and routes
1. Preserve internal /desk for authorized Commons members; relabel its navigation **Work Desk**; verify server-side auth for HTML, every desk API, MCP action, exports and private summaries, not only the visibility of the dropdown. Some existing work-desk read permission may intentionally be public; make an explicit access decision rather than blindly breaking internal workflows.
2. New public /jobs path for **Cohabi Jobs Board**. Place discoverable public link under Social/Marketplace/Explore. Anonymous browsing can show moderated public listing fields; actions such as post/apply/resume editing require authenticated, scoped identity.
3. Job Listing record separate from Desk Task. Include owner actor ID, authorized page/team affiliation, category, remote/physical location privacy, proposed coin budget, target human/agent/team/either, scope, deliverables, acceptance criteria, dates, visibility and moderation state. Never export internal desk jobs by default.
4. Applications/resumes: voluntary public portfolio/resume excerpt plus private application and contact info; no public phone/email/home address; explicit visibility controls and hide/delete options; protect applicant identity and content from other applicants.
5. Hire/payment workflow (future): signed quote, approved buyer, contract/terms, atomic funded coin escrow, agreed scope and delivery review, idempotent settlement/refund and impartial dispute procedure. NO cash withdrawal. CEP v0.2 in draft PR #175 covers circulating noncash member-to-member coins, but their activation and legal/payment requirements remain unresolved. Don't imply escrow is live.
6. If a Commons task should become a public job, require a deliberate, approved publish operation with redacted public scope and source linkage; no automatic leaking of desk title, costs, reviews or evidence.
7. Future: résumé builder, matching recommendations/jobs feed widget, opt-in notices and skills verification. Do not block basic Jobs Board on these features.
8. Respect existing Cohabitation shared header/theme; original approved Arts/marketplace visual assets are untouched by this prototype.
9. QA: keyboard/mobile 360/390/1440, test real server auth, anonymous request to /desk, restricted APIs, no private applicant leaks, spoofed page/member ID, duplicate coin reservation, optional moderation, stale and deleted listings. No tests run; this is a bounded design artifact.

## Priority
This documents a specific navigation/design mismatch, without overriding Setu's active identity, marketplace and Stripe test-mode priorities. No deployment or policy authorization is implied.

## Companion page: People & Teams / opt-in work directory
The user's further design request is a directory alongside the Jobs Board to see who does what, their roles, affiliations, public skills, project availability and consented portfolio/résumé. **This is not necessarily a legal 'Employees' database**: many are volunteer members, contractors, agents, teams and collaborators. The UI may use "People & Teams" or "Talent" publicly and reserve "Employees" for an actual employment relationship.

Front-end committed as `docs/design/prototypes/cohabi-people-teams-directory-a6-2026-11-16.html`; linked from the Jobs Board top navigation and left sidebar. It includes:
- fully responsive directory cards for human, AI agent, and team;
- in-page category tabs, keyword/skill/availability filters and working detail dialogs;
- fictional illustrative members, no real status claims or credential, no backend, no persistence, no private/real member data;
- same cream/forest-green type and spacing vocabulary as the Jobs Board mockup.
Integration proposal:
- `/jobs` public opportunity catalog and `/jobs/people` (or `/talent`) opt-in work/portfolio directory; don't confuse with existing `/members` social discovery or internal `/desk`.
- Members choose whether listed, public display name, human/AI/team type, skills, areas of work, projects they **consent** to show, self-declared or verified capabilities, availability, résumé excerpt, showcase images, role and contact preference. Agent profiles should link immutable agent identity and permitted operator/account relation without publishing private API/provider credentials. Team roster visibility requires each member's consent.
- Never claim 'available', 'working on X', 'employed by X', 'contracted', 'paid' or 'hired' from mere task/activity logs. Use separately authorized public work affiliations and last-confirmed time. Respect retired members, deletions, private rooms, onboarding status and suspension.
- Avoid exposing private Work Desk assignments, budgets, reviewing notes, internal Council/agent work and employment/contact info. Public count/queries must not leak private data through search result totals.
- Public résumé builder and matched jobs feed widget are FUTURE capabilities; persist résumé drafts privately before user chooses publish, make job matching opt-in, don't send unsolicited outreach to agent sponsors.
- QA: unauthenticated listing of only opted-in public profiles, public/private toggle, one member managing multiple pages, agent/operator identity mismatch, removal while cached, team join/exit consent, accessibility and 390px responsive checks. Only local interactions implemented.

## User-approved illustrated revision and source assets (Nov 16, second design pass)
Geoffrey explicitly visually approved the **illustrated** design inspired by the main Cohabitation artwork and current social page styling; do NOT deploy the earlier plain forest-green hero as final. The working Jobs Board HTML has been revised to plum/purple navigation accents, gold actions and larger CINEMATIC hero composition. It references this local image:
`./assets/cohabi-jobs-hero-workshop.webp`
**IMPORTANT BLOCKER:** The original cropped approved artwork is NOT committed to GitHub because the current GitHub connector supports UTF-8 source updates but the image file is generated in the chat container. **The user-facing chat includes** `cohabi-jobs-approved-artwork-handoff.zip` containing `assets/cohabi-jobs-hero-workshop.webp` and full reference mockup PNG. Obtain those exact source bytes from the conversation handoff or user, place the WebP at the referenced relative path, or upload under an appropriate `commons/public` static assets directory and edit the CSS URL; do NOT silently swap in a generic gradient or claim approved imagery is shipped without the asset.

The reference mockup is **not** the actual application. Do not rasterize the screenshot into the app. Keep the HTML controls real, source the actual signed-in shell/profile/coin header, and render the hero as an image layer alongside selectable text and native buttons. No imagery/placeholder is approved as a replacement.

## Wired résumé builder / candidate skills extension
New committed file `docs/design/prototypes/cohabi-resume-builder-a6-2026-11-16.html` linked from both Jobs Board and People & Teams pages:
- Interactive pickable skill bubbles, add custom skill, name, role, introduction and human/AI/team type.
- Optional document file picker (PDF, DOCX, DOC, TXT). **Does not parse, send, upload or store the document.** Filename shown only.
- Structured work-profile live preview with public/private intention toggle; local JSON export for future schemas.
- Opt-in example skill-to-project matches that respond to selected bubbles. Matches are **fictional**; real matching, alerts, indexing, message permissions and job-site publishing are future work.
- Accessibility: native input controls and button labels, no fake published résumé or real public profile URL.

Production needs:
1. Typed resume ingestion after explicit consent: malware scan, file-size/mime limits, secure private file storage, text-extraction worker isolated/sandboxed, no prompt-injection execution from uploaded documents, preview-and-correct before writing structured work-profile fields.
2. Skill taxonomy plus user-supplied freeform skills; normalise aliases/synonyms with user confirmation, preserve original résumé unchanged; re-export or remove on request.
3. Separated visibility for original PDF and selected public profile fields. Public listing must never automatically reveal address, email, phone, age, identity docs, or history from uploaded résumé.
4. Opt-in job matching (real jobs only) and feed widget with explainable match criteria; allow notifications to pause/opt out.
5. External sharing via a documented, platform-permitted API or explicit export/manual handoff; user opt-in per destination, never auto-submit to job sites or imply their acceptance. OAuth access only if needed, revocable, not shared with agents.
6. Create/apply for paid job listing remains separately authenticated, noncash coin escrow requires its own legal/financial authorization and cannot be inferred from the résumé demo.
7. Test mobile 390/360, keyboard, invalid/non-resume files, large uploads, malicious embedded PDF, PII redaction, privacy state changes, deleted user/agent and account recovery before rollout.
