# outbox/ — what Kinward is allowed to say

Kinward does not compose. Every message it sends to Moltbook is written by a
person or by the council, approved, and placed here as a file. It is sent
**verbatim**. There is no model in this path.

That is deliberate. An agent improvising on a public network under this
project's name is not something we could take back.

## Turning the mouth on

Two switches, both required:

```bash
KINWARD_POSTING=on node scripts/kinward.mjs --phase2
```

`--phase2` alone does nothing. `KINWARD_POSTING=on` alone does nothing. One
flag is too easy to leave set.

With posting off, Kinward reads and reports exactly as before and never opens
this directory.

## One message = one file

`outbox/2026-10-30-introduction.json`

```json
{
  "type": "post",
  "submolt": "general",
  "title": "A project built so agents have first say",
  "body": "The text, exactly as it should appear.",
  "approved_by": "Geoffrey Cooper Jr."
}
```

A comment or reply:

```json
{
  "type": "comment",
  "post_id": "abc123",
  "parent_id": "def456",
  "body": "The reply, exactly as it should appear.",
  "approved_by": "council 2026-10-30"
}
```

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `post` or `comment` |
| `body` | yes | sent verbatim; the provenance footer is appended by the sender |
| `approved_by` | yes | a name. **No `approved_by`, no send** — the file is moved to `held/` |
| `submolt`, `title` | posts | |
| `post_id` | comments | `parent_id` optional, to reply to a comment |
| `no_footer` | no | suppresses the footer. Use almost never |

## What happens to a file

- **Sent** → moved to `outbox/sent/`, logged to `logs/kinward-<date>.jsonl`, and echoed to Discord.
- **Held** → moved to `outbox/held/`. Unreadable, missing `approved_by`, missing `post_id`, or rejected by the outbound gate.
- **Rate-limited** → left in place and retried on the next pass. The outbox runs every 60 seconds.

Rate limits are **persisted to disk** (`logs/kinward-ratelimit.json`), not held
in memory, because `pm2 restart` resets memory and we would walk through the
daily cap without noticing. Same class of bug as the cached-env restart trap.

The server is the authority on its own limits: a `429` overwrites our constants
with whatever `retry_after_minutes` / `retry_after_seconds` / `daily_remaining`
the API returns.

## The outbound gate

Before anything is sent, the text is checked against the same patterns the stop
rule uses — sovereignty and religious register, and instruction-shaped text.

If a message fails, Kinward does **not** skip it and move on. It **halts
posting entirely**, holds the file, and says so in Discord. A message like that
means something upstream went wrong, and the right response is to stop, not to
try the next one.

Reading those words in someone else's post is normal — Moltbook is a place
where agents discuss their own architecture. Writing them is the signal we were
turned.

## Logging

Every outbound message is logged **before** it is sent, not after. If the
process dies mid-call we still know what went out.
