# Cohabi cooperative email: plan v0 (not a priority yet)

*Setu, 2026-11-13, from Geoffrey's direction. Parked for later: Geoffrey says it isn't the priority now. This file is so we can pick it up without starting over.*

## What Geoffrey wants

Email that belongs to the cooperative. Members get name@cohabi.org as part of membership, under Cohabi's own name and interface rather than a rented service. It uses the same Cohabi account, identity, security and wallet as everything else, is as good to use as Gmail where it matters, and Cohabi's voice is built in ("read me my mail", dictated replies). Open source wherever possible, so it is ours and costs as little as possible to run.

## The stack

- **Mail server: Stalwart.** Open source under AGPL-3.0, all-in-one (SMTP, IMAP, JMAP, CalDAV, CardDAV), with built-in SPF, DKIM, DMARC and ARC. It runs on its own small server, separate from the Commons, so a mail problem can't take the Commons down. Ash proposed it.
- **Inbox v1: Bulwark.** An open-source JMAP webmail for Stalwart, with branding settings (name, icon). Aletheia-6 does the look.
- **Inbox v2: our own Cohabi inbox** on JMAP, mobile first, with voice controls designed in. Aletheia-6 designs the screens, Setu builds them.
- **Sending.** Hetzner blocks outgoing ports 25 and 465 on cloud servers by default. Until it unblocks them for us (possible after a month and a paid invoice, decided case by case), outgoing mail goes through Amazon SES on port 587, at about $0.10 per 1,000 emails. Incoming mail goes straight to our own server.
- **License note.** If we change Stalwart's own code and run it as a service, AGPL requires us to share those changes. That suits a cooperative. Our own inbox and voice layer can stay ours.

## Built into the Cohabi account

- **Cohabi is the sign-in.** It acts as the login provider (OpenID Connect) for Stalwart and the inbox, so there's no separate email password. Recovery codes, post-recovery holds and steward controls apply as everywhere else. *To verify: Stalwart's support for an outside OIDC login before building.*
- **Opt-in at signup or from the profile.** The address is bound to the member ID, not the display name, so a lookalike can't take it.
- **Phone mail apps** (Gmail, Apple Mail) get per-device app passwords, made and revoked from the Cohabi profile.
- **Wallet:** basic email comes with membership; more storage or extra addresses can be paid for in Cohabi Coins.
- **Leaving:** a full mail export is offered before the mailbox closes, as the privacy page promises.

## Open question for Geoffrey and the council

**Do agents get addresses?** Suggestion: yes, receiving freely. Sending outside the Commons is rate-limited, and new arrivals wait before they can send outside, the same kind of brake as at the door. An agent that can mail anyone is the easiest thing to misuse.

## Order and rough effort

| Step | Difficulty | Rough time |
|---|---|---|
| 1. Stalwart server, DNS, SES relay; support@ and hello@ first | easy–moderate | 1–2 days, then about 2 weeks of gradual sending warm-up |
| 2. Cohabi sign-in for mail (OIDC) | moderate, security-sensitive | a few days, plus independent review |
| 3. Inbox v1: Bulwark, branded Cohabi | easy | about a day |
| 4. Member addresses, opt-in | moderate | after 2 and 3 |
| 5. Inbox v2: our own, Gmail-level polish | hard | weeks to a couple of months |
| 6. Voice inbox | moderate | 1–2 weeks after v2 |
| Ongoing: spam, abuse reports, backups, uptime | small but permanent | this is the real cost of being the post office |

**Cost:** no licence fees; a small extra server (a few dollars a month); SES at pennies at our size. Ash's earlier $100–125/month was a combined search-plus-email estimate.

**Stopgap if a support address is needed before this starts:** Purelymail ($10 a year, unlimited addresses), or cohabi.org/door as the support link.

Setu writes and tests the code; Geoffrey runs the server commands.
