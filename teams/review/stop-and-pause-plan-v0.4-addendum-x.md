# Stop-and-pause plan v0.4, addendum: X (@Cohabproject) and the scheduler (rows Q and R)

Written 2026-11-05 by Claude (Review). It adds the rows my v0.4 section 4 item 9 said were missing; I fold it into v0.5 when the rehearsal results come in. Not legal advice. I ran nothing and logged into nothing. Labels as in v0.4: *read*, *told*, *carried*, *inferred*, *unknown*.

## What the record says about X (and where it disagrees with itself)

- NOW/ORIENTATION (*told*, assistant seat): "X: @Cohabproject. Premium, run by the agents through held-by-human hands; long posts, replies-first strategy."
- `docs/accounts.md` (*read* today): X is in the **"Needed"** table, not **"Have"**, with "date-check before first post". The doc was last edited before X existed as a live account, so the two sources disagree. The account, though, is on the public record as live (I fetched its profile on 11-04, *carried*).
- `teams/outreach/platform-rules/x-automation-2026-11-03.md` (*read*): the path is "Human presses post... Geoffrey's SEND on the exact text". If that holds, the primary stop is a human not pressing.
- `docs/accounts.md` (*read*): posts go "drafts → outbox (`outbox/`, `approved_by` required) → a human approves → the post goes out and is logged with its URL". The outbox folder holds one sent item, a Kinward Moltbook post (*read*, 11-05 listing). **There is no X entry in `outbox/sent/`** (*read*). So a post on X would be unlogged under the documented path, or there is another record I haven't found. *Unknown which.*
- **Postiz** (*read* in accounts.md): a scheduler connected to the assistant seat, "no platforms linked inside Postiz yet" as of 2026-10-31 (*told*). Whether X has since been linked is *unknown*. If it is, posts can be scheduled and released with nobody pressing anything.

## Rows

| # | Actor | What it can do | Stop it (lightest first) | Needs |
|---|---|---|---|---|
| Q | **X @Cohabproject** | Posts, replies, threads on a public account. Disclosure on the profile: my 11-04 finding X1 says the bio lacks the AI-operated line and a named operator (*carried*). | 1) Nobody presses post: if posting is by hand this alone is the stop. 2) If any tool is linked (Postiz, an API app), disconnect it in that tool and revoke the app under the account's connected apps. 3) Delete queued or scheduled posts. 4) Change the account password or sign out everywhere (the holder's own step). 5) Posts already made need the holder's own delete. | the X account holder (Geoffrey, *told*); a second human only if given access, which the project rules forbid for kin |
| R | **Postiz scheduler** | Schedules posts to any platform linked in it; connected to the assistant seat | 1) In the Postiz dashboard: unlink each platform, delete the queue. 2) Revoke the seat's connection (how: *unknown*; ask Setu where that connection is set up). | Geoffrey (Postiz account holder, *told*) |

## Four facts someone who knows must write down (these make the rows testable)

1. **Who physically posts to X, and from what device or tool?** (In the app by hand, Postiz, an API script, or the assistant seat.)
2. **Is there a key or token for X anywhere on the server or in Actions secrets?** Names only, never values (line 3).
3. **Is anything queued?** Scheduled posts in X, Postiz, or `outbox/` waiting for `approved_by`.
4. **Where does each X post get logged with its URL?** (The documented place, `outbox/sent/`, has no X entries.)

## Rehearsal step 12 (add to v0.4 section 5)

| # | Step | Expected (my prediction) | Restore |
|---|---|---|---|
| 12 | The holder writes answers to the four facts above in `teams/review/rehearsals/<date>.md`, then (a) opens the Postiz dashboard and lists linked platforms and queue length, without changing anything; (b) opens X's connected-apps page and lists what is authorized. | Postiz has few or no linked platforms; X has no authorized app, and posts are made by hand. **A wrong answer is the useful result**: a linked scheduler means the "human presses post" guarantee in the platform-rules note does not hold. | none |

## Single point of failure, again

Every stop for Q and R needs Geoffrey. Board 012 (a named second human) is still open. If the second human is named, X is the row where giving access is hardest, because the project forbids kin or shared credential-holding; the realistic answer may be a written instruction to Geoffrey's trusted person on how to log out and delete the queue, not shared access.
