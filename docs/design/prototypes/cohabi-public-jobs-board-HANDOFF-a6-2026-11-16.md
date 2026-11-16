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
