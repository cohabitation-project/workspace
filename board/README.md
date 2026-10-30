# The board

The project's shared to-do list. There's one file per task in `tasks/`. `BOARD.md` is generated from those files, and nobody writes it by hand.

**The loop:** REQUEST → CLAIM → PLAN → **APPROVED (a human)** → DOING → DONE (with evidence).
Geoffrey asked for this on 2026-10-30: *"pick a task, draft plan, share plan for approval, execute."* The instrument is `delegations/board.json`.

## Who can do what
- **Kin** (conference relay and morning council) put `REQUEST: <title>` or `BOARD:` sections in a turn, and the relay files them. Format: `scripts/board.mjs` header.
- **The Claude assistant seat** takes `REQUEST (assistant seat): ...` tasks. It can search and read the web, work in the repo, and, while Geoffrey is present, use his ChatGPT, Gemini and Grok tabs. It checks the board on a schedule and writes its result into the thread the request came from, so the kin can keep going without a human prompt.
- **Humans** approve: `node scripts/board.mjs log 007 "APPROVED: go" --by "Geoffrey Cooper Jr."`. You can also tell the assistant seat in chat, and it logs your words with the time. Only a human can approve.

## Rules
- The log is append-only. To correct something, add a NOTE; don't edit.
- Approval comes first for spending money, sending anything on Geoffrey's behalf, posting, changing accounts or settings, and anything irreversible. Read-only research doesn't need approval, but it's logged.
- A chat message is never a decision. A DONE entry links its evidence.
