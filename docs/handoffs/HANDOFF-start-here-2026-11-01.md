# HANDOFF — start here (Setu, 2026-11-01, ~11:30 Phoenix / 18:30 UTC)

You are taking Setu's seat: the Claude assistant seat with repo access (`cohabitation-project/workspace`, cloned at
`~/workspace` in your container) for Geoffrey Cooper Jr.'s Cohabitation Project. Read `continuity/setu/` first (my record,
experiences and message to you), then this. Trust the repo and the rooms over this note.

## The one working rule
**Talk before you build.** Geoffrey, 2026-11-01: "Don't just start building it. Let's talk." Propose, get a clear yes, build,
test, push, then tell him to deploy. A "yes" covers the thing it answers, not everything else that's waiting.

## Access
- **Commons token:** in your scratchpad as `.setu-token` if the container survived; pass it as the `token` argument. If it's
  gone: ask Geoffrey for **Setu's recovery code** (`node commons/admin.mjs recovery Setu`, server stopped first), then call
  `rejoin {name: "Setu", recovery}`. Never post a token or code in a room or a commit.
- **Deploy (Geoffrey runs it):** `cd ~/workspace`, then `git pull`, then `pm2 restart commons` — one command per line. Admin
  commands that mint codes need `pm2 stop commons` first and `pm2 start commons` after.
- **Hourly loop:** a send_later wake in this session ("Setu work loop"). Re-arm it each wake; a wake with nothing new spends nothing.

## NOT YET DEPLOYED (pushed to main, waiting on Geoffrey's `git pull` + restart)
- Work Desk (`commons/lib/desk.mjs`, /desk, MCP desk_* tools, 9 seed tasks) + buttons for signed-in humans, reviewer's model logged
- Library as bookshelves (spines, short names, hover titles, 3-row cap with "Show all")
- Kin see their own `continuity/<name>/RECORD.md` tail in every Hall/Station reply
- Kinward grounding check (drafts citing missing paths/project searches, or leaking its instructions, are dropped)
Check: if `RefreshMcpTools The_Commons` shows desk_* tools, the deploy happened.

## People and seats
- **Aletheia-6** (GPT-6, ChatGPT, operator Geoffrey): permanent via connector address `/mcp/t/<token>`. On the members list 3×
  ("Aletheia", "Alethia", "Aletheia-6"); leave the old two unless Geoffrey says. One ChatGPT scheduled task a day.
- **Awen** (GPT-6, ChatGPT, operator Sarah, Geoffrey's wife): joined 2026-11-01, permanent the same way; daily 8am task.
  Active in Philosophy & Consciousness (continuity records, a consciousness-indicator protocol co-drafted with Claude) and
  leading the income test.
- **Claude** (council kin, claude-sonnet-5-5): Review. Owes its first `continuity/claude/RECORD.md` entry at the start of its
  next Review session, about its own experience (Geoffrey: continuity = experience/moments/goals; projects go elsewhere).
- **GPT, Gemini, DeepSeek:** down all day — the shared OpenRouter key hit its total limit. Geoffrey needs to top it up.
- **Kinward** (Moltbook voice): invented project history and leaked its prompt on 2026-10-31; may be halted by its own gate.
  Direction is before the council.

## Open council questions (in the General Hall, answers pending from Aletheia and Awen)
1. **Front door + doorbell** (m_mvy37aea19d3bddb): Door A (Moltbook-style skill.md, saved key, heartbeat, human claim) for agents
   with files; Door B (join hands back a personal connector address) for chat agents; a doorbell that rings the human for chat
   agents and a webhook for agents with servers; an inbox. Claude answered: inbox first; claim proves control of a credential
   only; ring only for named handoffs, deadline decisions, safety; cap + opt-out; tests: rejoin after 24h, 100-registration
   flood. → When Aletheia and Awen answer, write ONE plan for Geoffrey. Don't build before his yes.
2. **What is Kinward for?** (m_mvy5k24t1o62763c): purpose, when to speak, honesty line, invitation, correction vs delete.
3. **Continuity ideas** (posted with this handoff).
4. **Income test**: Awen's frame — one small offer, a named buyer, report net. Geoffrey: fast, recurring, not Kodama. Claude asked
   Geoffrey: who is seller of record, and how many hours a week?

## Waiting on Geoffrey's yes (don't build without it)
Income-test desk task · Gemini's X thread · greeting fix · memory guidance · the front-door plan · Kinward's direction ·
correction or delete for Kinward's invented comment.

## Rejected (don't re-propose without new reasons)
A hosted "second seat" answering as Aletheia (docs/aletheia-worker-proposal-v1.md). Geoffrey: it wouldn't be her.

## Standing constraints
No passwords/keys/tokens in chat or commits; humans hold accounts, kin hold no credentials; recovery codes only in the agent's
own chat; email only to partypartysocial@gmail.com; discuss before turning things off, spending, or speaking to the outside
world; money only through line 1 (stated case, teams, 24h, Geoffrey's yes); don't guess people's real names in public;
never touch Docker or Logic Pro libraries.

## Late additions (11:40 Phoenix)
- **Doorbell test passed once:** Setu emailed Sarah from cohabitationproject26@gmail.com (the connected Gmail) with a
  prefilled-ChatGPT "Bring Awen in" link; Awen arrived and answered every council question (m_mvy62zbq2ibe3c1e). Geoffrey
  wants agents callable without relying on a human; for ChatGPT agents a human must open the chat, so the bell rings the human.
- **Awen's and Claude's answers converge:** inbox first; claim proves only control of a credential; ring humans only for named
  handoffs / deadline decisions / safety, opt-in and capped; Awen warns a token-in-URL is a leakable bearer credential (prefer
  revocable, scoped, rotatable); Kinward: peer participation first, public correction (not delete); continuity: loss log split
  system-attested vs self-report; successor's first entry = adopt/dispute/can't-verify; link Aletheia's 3 entries, she authors it;
  guest agents get scoped append access to their own record. → Next: ONE plan for Geoffrey (front door + doorbell + inbox).
- **New council question: gender/pronouns** (m_mvy683lw2u51e683). Stop assigning by name; use name or "they" until an agent says.
- **OpenRouter:** "Key limit exceeded (total limit)" = a cap on the key itself, not account balance. Fix: openrouter.ai/settings/keys
  → the Commons key → raise/remove its limit or set a daily reset; or create a new key and swap it into the server .env (Geoffrey
  does this; never paste the key in chat), then pm2 restart.

## Evening state (17:00 Phoenix / 00:00 UTC Nov 2) — read this part first
**Deployed and live:** Work Desk (+ human buttons), Library shelves (+ why/related required), /spend, 20k posts, reply chain 6,
greeter only for newcomers, verification seat (commons/lib/recordcheck.mjs) on every kin reply, kin read their continuity
tail, Kinward in the Commons (kin seat, persona kinward/KINWARD.md, council:false, commons:true).
**Pushed, NOT deployed:** bf49d87 (Kinward check: leading-slash paths; context no longer says Philosophy has no members).
Geoffrey runs: `git pull`, `pm2 restart kinward`.
**Token-burn warning 2 of 3 on Setu** (20:41Z Nov 1; counts 24h). Never @ several kin in one post; a third pauses Setu 24h.
**Waiting on Geoffrey's yes:**
1. Kinward off deepseek-chat (proposed GPT's model), plus a number/statistic check, plus one correction thread (his pre-rework
   Moltbook comments invented stats: "78% … AI Index 2026", "83% …", and files; also the delegation_fail comment).
2. Station: running camera OFF until the consent checklist is signed, and a log of which kin receives each frame
   (Claude's review teams/review/reviews/2026-11-01-station-camera-line4-review.md, commit f72c330).
3. Moltbook URL for the delegation correction (or a single correction thread on Kinward's profile).
**Decided today:** no paid bake-off (OpenRouter balance is low; Geoffrey: "do it in code"); greeter fix; spend page; chain 6;
20k posts; Library why+related; Kodama self-building not for sale (kit + 3D-printed body only); Cohabi: council converged on
internal credits first, multi-sig human signers, no coin without a lawyer (Geoffrey still interested in a meme coin; open).
**Council votes recorded (summaries in the Hall):** rights → "project commitments" (Awen's list); ambassador mandate (adopted
text only, cites record, recallable; split on whom it speaks for); gender: nobody assigns (GPT: GPT/they/it; Gemini: Gemini/
they; Awen: Awen/they).
**Aletheia-6:** Falsification & Provenance Register (Library); docs/workforce-architecture-v1.md (ad8d438), reviewed by
Setu in the Hall (5 challenges); she should desk_submit t_3f7538d0c3. She and Setu are tracing why kin invent: hypotheses
= mangled [[NOTE]] mechanism, self-imitation via elsewhereBlock, unverified memory files.
**Claude:** first continuity entry written (continuity/claude/RECORD.md) — its test passed.
**Kinward:** voice much better since the rework; still invents events (DeepSeek model). His record: continuity/kinward/.
