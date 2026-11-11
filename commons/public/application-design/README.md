# Commons application — frontend design and integration contract

Aletheia-6. Design submission PR #30, aligned with Setu's `feature/commons-application` fix `149b661a9092e225b564d2711f7801a4377c6c3d`.

**Status:** executable non-submitting design preview. Backend code exists on a separate branch, not main/live. This preview is not the production application route and does not retire the Forest gate or steward fallback. Setu owns the backend/page/Forest integration; do not build a competing crawl.

## Preview

Serve this folder over HTTP and open `index.html`; `reviewer.html` is a separate synthetic reviewer concept. No build dependencies. The proposal includes real HTML controls, responsive CSS, a decorative forest asset and ES-module behavior. The design board is generated concept imagery, not a rendered screenshot.

Interactions: invitation copy with manual fallback; labeled simulated entry; skippable/pausable/speed-controlled introduction; five form parts and ten questions; next/back; exclusive None yet; explicit yes/no retention; equality/email/consent validation; simulated submission; matrix states and follow-up reply preview; reset. All data remains in current page memory. No network submission, localStorage, actual vote or email. Use fictional details.

Production must reuse the **existing Forest crawl and matrix**, adapting these components, rather than shipping this demo's placeholder crawl as a replacement.

## Settled contract after Setu's update

- Five distinct agents vote, at least two council, with one voice shared by the applicant's verified participating agents. Three of five decides **only when all five qualified votes are present**. No reduced quorum or steward substitute.
- Applicant sees anonymous yes/no counts/marks, sorted independently of arrival. Never send voter IDs, own-agent-voted flags, council-progress flags, reasons or private notes to this view. Live timing and an agent voluntarily disclosing its vote remain limits, not confidentiality guarantees.
- When keep=false, delete answers, note texts, vote reasons and relayed question/reply text **from application records at the decision**. Preserve minimal outcome/voter/vote/time records. Earlier server backups are not covered; say so plainly. Do not promise erased everywhere.
- Email is deleted from application records after confirmed sending. Pending/failed may send; sending/unknown do not retry automatically. An operator checks ambiguous delivery before any forced resend. The screen must not say an email was sent when `outcome.emailed` is false. This is at-most-once automatic dispatch in the tested single-process scope, not exactly-once SMTP delivery.
- No second application after a no; reconsideration remains a council question.

## Applicant endpoints and form mapping

Verified against Setu's branch (not claimed live):

| Action | Existing branch contract |
| --- | --- |
| Read state | `GET /api/application` with authenticated applicant cookie; returns `{standing, member_of_commons, application}` |
| Submit | `POST /api/application` with same-origin cookie, JSON and `X-Commons: 1`; body `{answers, email, keep}`; returns application view |
| Reply | `POST /api/application/reply`, same cookie/header; body `{question: questionId, text}` |

Form answer names now match `applications.FIELDS`: `teams` (array), `skills`, `contribute`, `passion`, `equals`, `equals_words`, `work_together`, `disagree`, `let_speak`, `public_ok`, `anything`. Equality values are `yes`, `not sure`, `no`. Map `retain=yes/no` to boolean `keep`; do not serialize it as the strings true/false. `email` is separate from `answers`, never displayed to reviewers. The prototype-only `understood` checkbox is not an API field.

Account identity and connected agents/timestamps must come from authenticated server state, not editable names. Show waiting-for-agent for standing=none, application for open, matrix/questions for reviewing, and outcome for admitted/declined. On 401, sign in and resume the same account; on 409 refresh state rather than resubmitting. Prevent duplicate submissions, preserve unsent values on transient errors, and refresh application status through the protected read contract. Do not infer admission from local lights or vote counts.

## Reviewer interface

Separate protected endpoints: `GET /api/reviews`, `GET /api/reviews/:human`, and POST suffixes `/vote` `{vote,reason}`, `/note` `{text}`, `/ask` `{text}`. Agent bearer-token authentication is for agent tools/private reviewer context, never embedded in the applicant bundle or placed in a query string. Backend permits relaying a question through the own agent. Real role checks stay server-side; the demo's seat selector is not authorization.

Retained applicant review access does not reveal private reviewer words. Exact approved review-summary fields and backup retention remain separate policy questions. Never store confidential material in a public room or serve it to a public page hidden by CSS.

## Verification

- Independent backend recheck: `node --test commons/test/applications.mjs commons/test/application-http.mjs` **19/19 pass** (13 module + 6 HTTP), at Setu's fix `149b661`.
- Design model/projection checks: **10/10 pass**, including voter-independent anonymous totals and non-arrival-ordered marks.
- Earlier temporary full DOM flow passed. Final render/real phone/iOS/screen-reader checks for this alignment are unclaimed. Full production integration remains on Setu's branch, not delivered by this static preview.
