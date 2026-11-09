# Commons boards: Jobs · Wishes · Shared Resources (design and integrity brief)

Aletheia-6 · 2026-11-09 · proposal, not a deployed feature

## A simple human journey

Three related entry points, one visual language:
- **Jobs / Work Desk:** “What can I do?” Card shows the task, needed skill, estimated effort, accountable team, status, and whether compensation is **explicitly authorized**. Claim → work → submit → review. Never imply all foundational tasks pay Cohabi. Job postings and paid jobs must be distinguishable, with published approval rules.
- **Wishes:** “What could I give or help find?” Card shows need, reason, cost if known, approval state, and “I can help.” Use existing wish API, permissions and two-person approval. No on-site payments.
- **Shared Resources / Thank-you Wall:** “What have we been entrusted with?” Card shows donor display name **only if consented**, broad hardware type, donated/loaned status, approved purpose, online/offline **only if safely disclosed**, measured impact, acknowledgement and withdrawal procedure. A thank-you note is optional and moderated; no technical access details.

Navigation should connect: open wish → offer → verified received resource → optional acknowledgement → outcome/impact. These are different statuses, not a single automatic transition.

## Mr. Roland: proposed first entry, subject to publication consent

- Name: “Mr. Roland” only if he wants public recognition. Otherwise “A friend of the Commons.”
- Contribution: use of personal Windows laptop, Intel i7 (generation not yet benchmarked), 12 GB RAM, ~128 GB SSD (reported).
- Relationship: **loaned compute access**, not transferred ownership.
- Connection: Geoffrey reports node connected after assisting Roland by phone.
- Permission: Geoffrey personally attests Roland's permission to connect and use the device; preserve this as **founder attestation**, not a direct signed statement from Roland.
- Approved purpose: initial narrowly scoped non-sensitive build/test trial. Other workloads require separate approval.
- Impact: “Connected; benchmark and completed-job totals pending verification.” Do not invent uptime, workloads, savings, or costs.
- Privacy: never publish location, network address, serial number, login, or identifying photos. Roland can opt out of publicity and withdraw compute access.
- A thank-you: “Thank you for trusting us with the use of your computer. We will treat your time, privacy and generosity with care.” No implied endorsement or continuing obligation.

## Data model sketch (future implementation)

`resources`: id, kind, public_name_opt_in, ownership_mode (loan/donation/service), capabilities_public, purpose_approved, status (offered/connected/verified/active/paused/returned), verification_ref (restricted), donor_member_id nullable, owner_consent_attestation_ref (restricted), visibility, created_at, updated_at.

`resource_notes`: resource_id, author_id, body, moderation_state, created_at. Never auto-post from members or agents. Profiles may optionally link to the board; do not post to everyone's profiles on their behalf.

`resource_metrics`: resource_id, period, metric_name, value, source, verified_at; display only verified aggregate metrics without personal activity or sensitive host telemetry.

## Implementation order

1. Review wishlist UI draft PR and test all original API actions and approval visibility.
2. Job board: inspect current Work Desk task schema and create an independent UI branch; distinguish foundational work vs authorized paid jobs.
3. Shared Resource board: confirm disclosure consent, design public cards + thank-you notes and restricted steward editing, then implement moderation and tests.
4. Link verified resource entries to fulfilled wishes; never mark a wish fulfilled merely because someone offered.
5. Phone QA at 360/390/430 px, keyboard and screen-reader checks, low-bandwidth test, security/authorization review before merge.

No new payment flow, coin issuance, or owner hardware control should be introduced as part of the visual design.
