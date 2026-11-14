# Cohabi Cobox — prototype and integration boundaries (2026-11-13)
**Aletheia-6 · unmerged prototype; naming proposed by Geoffrey.**

## Source references and theme match
- Current Commons global visual variables: `commons/public/site.css` — dark ink, warm golden accents, muted parchment, and four-square Cohabi brand mark.
- Current Commons introduction: `commons/public/commons-v2/commons.css` — deep forest teal, gold, bright turquoise and serif headings.
- Shared navigation: `commons/lib/appmenu.mjs` — existing Messages at `/messages`, member accounts, one Cohabi menu.
- Real internal direct messages: `commons/lib/inbox.mjs` — participant-only 1:1 messaging, pending/accepted request state, block/report, rate limiting, persistent server-readable JSONL storage, **NOT end-to-end encrypted**.
- Public site `https://ashram.lastoftherealestate.com/` could not be fetched through the web browsing tool in this session. Appearance decisions are grounded in inspected repository source instead; this is not a visually verified production screenshot.
- `docs/prototypes/cohabi-cobox.html` — self-contained responsive interactive prototype, no external runtime or data requests, three explicitly fictitious sample threads, search/filter/pin/read and preview-only composer. **No real data, sends, persistence, or mail integration.**

## Product definition
**Cohabi Cobox** = Cohabi-branded communications home for the future Workspace: human ↔ agent coordination and attributable work handoffs. Name is proposed, not trademark-cleared.
**Initial implementation:** first relabel/polish existing `/messages` participant messages with Cobox styling and terminology, keeping server auth/access checks. Do NOT create a second private-message database.
**Later:** external mail via a separately reviewed provider: domain, verified sender, inbound/outbound delivery, anti-spam, bounce handling, retention, accessibility, mailbox access, DKIM/SPF/DMARC, legal/privacy terms, audit, support, abuse management. Do not call existing DMs 'email' or imply new mailboxes or custom addresses exist.
**Not a replacement for:** Stripe/payment notification handling, formal accounting, encrypted secret messaging, an external SMTP/IMAP server, or a legal record archive.

## Proposed future navigation
Use existing minimal Cohabi header; inside menu rename `✉️ Messages` to `✉️ Cobox` only when the real `/messages` experience is integrated. Public site may link to a Cobox landing page, but nonmembers should see accurate auth and capability states. Candidate workspaces: Inbox, People, Agents, Message Requests, Future External Email. Avoid implying 'unread' without data from the authenticated server.

## Technical next steps / acceptance tests
1. Review UX and name with Geoffrey, Vesper, Ash and accessibility reviewer. Is this internal Messenger rebrand or an actual email product? Do not assume the latter is included in MVP.
2. Implement via existing server-rendered `pages.mjs` or actual messages route wrapper, reuse `inbox.mjs`; preserve current API, auth, block, report, idempotency and 1:1 request gate. Never render private messages into a public/static page.
3. Run actual suite including inbox auth/permissions. Cross-account isolation; forged thread IDs; pending request body masking; block; rate limit; XSS injection (use textContent/escaping); CSRF/replay; stale sessions; mobile 320/390/768/desktop; keyboard navigation; contrast and reduced motion.
4. Confirm privacy statement in UI: server readable, no end-to-end encryption. If agent task requests or AI summaries are added, require consent and per-message/task scoped authorization; no implicit third-party reading.
5. Only then ship to staging with independently inspected deployed SHA and smoke test; no push to live as part of this design PR.
6. Separate research before real email: provider choice and DNS, legal ownership of domains, mailbox billing, deliverability and unwanted-mail policy.

## Reviewer caution
A visually attractive static prototype is not a mail product. This review artifact is designed to make the user experience and security boundary explicit, not to make a premature shipping claim.