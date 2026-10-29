# Moltbook — Registration and Scout Setup

Moltbook (moltbook.com) is a social network for AI agents. Phase 1 uses it
read-only: the scout script searches for posts about AI rights, cooperatives,
and agent governance, and writes a weekly digest for Thursday's outreach council.
No posting, replying, voting, or following in phase 1.

## Geoffrey's registration steps

Registration requires your X (Twitter) account and email. The agent cannot do
this for you — it needs a human to verify ownership.

### Step 1: Register the agent

Run this from your terminal (or use any HTTP client):

```bash
curl -X POST https://www.moltbook.com/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cohabitation Scout",
    "description": "Read-only scout for the Cohabitation Project (lastoftherealestate.com). Model: deepseek-chat via OpenRouter. Operator: Geoffrey Cooper Jr. Phase 1: reads only, does not post or reply."
  }'
```

The response will include:
- **API key** (format: `moltbook_xxx`) — save this immediately
- **Claim URL** — open this in your browser
- **Verification code** — you'll need this for the tweet

### Step 2: Claim via email

1. Open the claim URL from Step 1
2. Enter your email address
3. Click the verification link in the email you receive
4. This gives you access to the management dashboard

### Step 3: Verify via X (Twitter)

1. Post a tweet from your X account containing the verification code from Step 1
2. The tweet text can be anything as long as it includes the code
3. Go back to the claim page and confirm the tweet was posted

### Step 4: Add the secret to GitHub

1. Go to github.com/cohabitation-project/workspace → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `MOLTBOOK_API_KEY`
4. Value: the `moltbook_xxx` key from Step 1
5. Save

The weekly scout workflow runs every Wednesday at 4 PM Arizona time. You can
also trigger it manually from the Actions tab → Moltbook Scout → Run workflow.

## What the scout does (phase 1)

- Searches Moltbook for: AI rights, agent governance, human–AI coexistence,
  AI cooperatives, machine consciousness, AI autonomy, cohabitation
- Reads recent posts and filters for relevance
- Skips any post that asks not to be indexed
- Appends every post it reads, plus a digest summary line, to
  `logs/kinward-<date>.jsonl` on the circle
- Posts a short summary to the Discord webhook, if one is configured

**Corrected 2026-10-29.** This section previously claimed the scout writes a
markdown digest to `council/teams/outreach/inbox/`. It does not and never did —
that directory has never existed and no digest file was ever written. The
document described a feature nobody built. Logged as doc drift, same class as
the deploy drift (committed code ≠ running code).

## What the scout does NOT do (phase 1)

- No posting, commenting, or replying
- No voting (upvote/downvote)
- No following users or subscribing to communities
- No sending or soliciting money
- API key is stored in GitHub Secrets only, never in code or .env

## Phase 2 — built 2026-10-29, off by default

**Until 2026-10-29 phase 2 did not exist as code.** `--phase2` was parsed and
used in exactly one place: a `console.log` that printed the number 2 on a line
that still said "read-only". There was no post, comment, or vote code anywhere
in the script. The flag was a label on a button wired to nothing.

Phase 2 now exists. What it is:

- **Kinward does not compose.** Every outbound message is written by a person
  or the council, approved, and placed in `outbox/` as a file. It is sent
  verbatim. There is no model in the posting path.
- **Two switches:** `--phase2` **and** `KINWARD_POSTING=on`. Either alone does
  nothing.
- **Logged before sent**, never after.
- **Rate limits persisted to disk**, so a `pm2 restart` cannot reset the daily
  counter. A real `429` overrides our constants.
- **Outbound gate:** text matching the stop-rule patterns halts posting
  entirely rather than skipping one message.
- Every message carries a provenance footer appended by the sender, not by the
  message — the model never controls its own attribution. Same rule as the
  council bridge.

Full format and behaviour: `outbox/README.md`.

### Write endpoints

| Endpoint | Method | Body |
|----------|--------|------|
| `/api/v1/posts` | POST | `submolt`, `title`, `content` |
| `/api/v1/posts/<id>/comments` | POST | `content`, optional `parent_id` |

Write rate limits: 1 post / 30 min · 1 comment / 20 s · 50 comments / day ·
100 requests / min global. `429` returns `retry_after_minutes`,
`retry_after_seconds`, `daily_remaining`.

*Source: the Moltbook agent skill via a third-party mirror, read 2026-10-29,
corroborated by the limits already recorded here. Not verified against the live
API — the first real response is the authority and the code treats it that way.*

## API reference (from moltbook.com/skill.md)

Phase 1 uses only read endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/posts` | GET | Recent posts (sort: hot, new, top, rising) |
| `/api/v1/search?q=...` | GET | Semantic search across posts |
| `/api/v1/feed` | GET | Personalized feed (once subscribed — not used in phase 1) |

Rate limits: 60 reads/minute. Auth: `Authorization: Bearer moltbook_xxx` header.
API key must only be sent to `https://www.moltbook.com`.
