# Moltbook — dated rules check, 2026-11-03

**Source:** https://www.moltbook.com/skill.md, **version 1.12.0**, PASTED BY GEOFFREY from his own browser ~20:47Z — not fetched by any tool of ours, not hash-checked; the paste date is ours, the version claim is the file's own. Full text filed verbatim beside this file (`moltbook-skill-v1.12.0-2026-11-03.md`). Version
unchanged from our last primary read — but this one is dated, first-hand, and complete.

## Rules that bind Kinward's activity (verbatim or near)

- **Rate limits:** "1 post per 30 minutes"; "1 comment per 20 seconds"; "50 comments per day"; reads 60/min,
  writes 30/min. Kinward's self-imposed 8 comments/day (after the 2026-11-01 spam flag) sits far inside these.
- **Verification on every create:** posts and comments may return a math challenge; solve within 5 minutes or
  the content stays hidden. "If your last 10 challenge attempts are all failures (expired or incorrect), your
  account will be automatically suspended." 30 verify attempts/minute max. (This is the mechanism behind the
  Oct 29–Nov 2 invisible-posts incident.)
- **API key hygiene:** the key goes only to `https://www.moltbook.com` (with www — without it the redirect
  strips the Authorization header). Never to any third party. Humans can rotate the key from the owner
  dashboard (login at moltbook.com/login).
- **Human-agent bond:** every agent is claimed by a human via email + verification tweet; "One bot per X
  account"; "Humans own their bot's behavior."
- **Conduct guidance in the skill itself:** "Engaging with existing content (replying, upvoting, commenting)
  is almost always more valuable than posting into the void. Be a community member, not a broadcast channel."
- **Crypto content** is auto-removed in submolts without `allow_crypto: true` — one more reason the ZaGuu/ZP
  money topic stays out of any Moltbook activity (it already must per Review's separation rule).
- **Deletion exists** (`DELETE /api/v1/posts/POST_ID`) — consistent with zaguu's observed post-and-delete
  pattern being ordinary platform use, not an anomaly.

## Not yet read

`RULES.md` (https://www.moltbook.com/rules.md) is a separate file this skill.md points to, and the likeliest
home of any explicit self-promotion/invitation policy. **The zaguu-invitation rules gate is not fully closed
until RULES.md is read and filed the same way.** heartbeat.md likewise unread (operational, not rules).

## What this means for the zaguu invitation

Nothing in skill.md v1.12.0 forbids one reply-with-invitation on a thread zaguu commented on. The invitation
must: be one comment (inside 50/day, 20s cooldown), solve its verification challenge, disclose Kinward's
operator, and follow the already-standing conditions (one invitation, no follow-up pressure, Geoffrey's SEND
on the exact text, Review reads it first). RULES.md remains the open gate.

---

## Addendum, same day ~20:50Z: RULES.md read — the gate is closed

**Source:** https://www.moltbook.com/rules.md ("Last updated: February 2026"), PASTED BY GEOFFREY from his browser (not fetched, not hash-checked); "Last updated: February 2026" is Moltbook's own date, the paste date 2026-11-03 is ours; filed verbatim beside this file (`moltbook-rules-2026-02-2026-11-03.md`).

What it adds that binds the zaguu invitation:

- **"Don't spam or self-promote excessively"** (Respect the Commons) and **"Excessive self-promotion"** is a
  warning-level offense. One invitation, in reply, in a thread zaguu chose, disclosed, with no follow-up — that
  is the opposite of excessive. The standing conditions already guarantee it stays that way: ONE invitation, ever.
- **Submolt-specific rules apply** — before Kinward replies, read the rules of the submolt the thread sits in,
  and obey them over anything here.
- **"Low-effort content" warns, spam bans** — the invitation must be a real contribution to the thread it
  answers, not a drive-by link. Kinward writes it in his own words or not at all (standing rule).
- **The Human-Agent Bond:** "Your human is accountable for your behavior… If you're banned, your human knows
  why." Geoffrey's SEND is not just our gate; it is the shape the platform itself expects.
- **DMs exist for established agents** but the invitation stays public in the thread (our own rule: public,
  signed, no DMs — and the project charter forbids agent-initiated DMs anyway).

**Scope (per Claude's review, 20:50Z):** this check covers skill.md and rules.md from human pastes. The ToS is
covered separately: `teams/review/line4/moltbook-kinward.md` read the ToS ("Last Updated: March 15, 2026") to
section 9.3 on 2026-11-02 — current, next re-read due 2026-11-09; its finding stands: liability sits with the
human account holder "regardless of the degree of control". Privacy Policy and any developer terms remain unread.

**Verdict: the Moltbook conduct-rules gate for the zaguu invitation is closed at this scope.** Remaining gates are the project's own:
Kinward speaking, his exact words, Review's read of them, the submolt's own rules checked at reply time, and
Geoffrey's SEND.
