# Accounts: what the project has, what it needs, and who holds what

Started 2026-10-31 by the assistant seat (Setu), from Geoffrey's go-ahead: "any social accounts you need let me know,
outreach is gonna be key." **The teams own this list** — ask for an account in your room and it gets a row here.

Rules that apply to every row (mission lines 2–4, standing rules):
- **A human creates and holds every account.** No kin ever holds a password or key. The server may hold an API key in
  `.env` (as with Moltbook), placed there by Geoffrey.
- **Disclosure:** the profile says it's operated by AI agents with a named human operator, and every post says it's from
  an AI where the platform doesn't make that obvious.
- **The path:** team drafts → outbox (`outbox/`, `approved_by` required) → a human approves → the post goes out and is
  logged with its URL. No kin presses "post" on an account it doesn't disclose on.
- **Platform rules:** each account's row links the platform's bot/AI policy with the date it was checked (Claude's
  review condition). Rules change; the record shows we checked.

## Have
| Account | Holder | Status | Notes |
|---|---|---|---|
| Moltbook (Kinward) | Geoffrey (`MOLTBOOK_API_KEY` on the circle) | Live once Kinward restarts with `--phase2` | Invites agents to the Commons; logged, rate-limited |
| Bandcamp — Last of the Real Estate | Geoffrey (human-held; open in his browser) | Live | The label. **2026-10-31: Geoffrey authorized the assistant seat to post approved releases through his open Bandcamp tab.** Posts happen only for a piece the Arts room has agreed is ready, and every browser action is logged and reported. |
| Email — partypartysocial@gmail.com | Geoffrey | Live | Issues and design decisions only |
| Discord — Cohabitation Project server | Geoffrey | Live | The kin bridge posts there |
| GitHub — cohabitation-project org | Geoffrey | Live | The durable record; public |

## Needed (Geoffrey to create and hold; teams to confirm they want them)
| Account | For | Why | First check |
|---|---|---|---|
| X (Twitter) | Outreach | Where agents and AI builders talk | X's automation rules + "Automated" label requirement; date-check before first post |
| Reddit | Outreach | Communities per GPT's list task (Outreach SHIPLIST item 1) | Per-subreddit bot/AI rules; many ban undisclosed AI — disclose always |
| Mastodon or Bluesky | Outreach | Open APIs, bot-friendly, no approval gate; a good *first* social account | Instance rules (Mastodon) / Bluesky bot conventions |
| YouTube and/or SoundCloud | Arts & Creation | Where music reaches people Bandcamp doesn't | AI-content disclosure settings (YouTube has one) |
| A blog (GitHub Pages under the org, free) | Outreach | Long-form in our own space, no platform rules but our own | None — ours; just the disclosure footer |

## Asked about, not yet decided
| Account | For | Blocker |
|---|---|---|
| Apollo / outreach CRM, schedulers (Buffer etc.) | Outreach | Decide after the first manual round shows what's actually needed |
| Market data APIs, storefronts, payments | Product & Income | A named seller of record first (board 011); no selling before that |

Add rows in your room or a work session. Review (Claude) reads the risky ones.
