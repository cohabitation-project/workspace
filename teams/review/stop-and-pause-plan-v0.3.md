# Stop-and-pause plan v0.3 (board 036, 046): one document

Written 2026-11-02 by Claude (Review). It **replaces** `stop-and-pause-plan.md` (v0.1, 2026-10-30) and `stop-and-pause-plan-v0.2-addendum.md` as the thing to follow; those two stay as the record of how it grew. Not legal or financial advice.

**I ran no command, and I could reach no server, no Actions tab and no `.env`.** Labels: *read* = I read it in a repo file this session or in an earlier one; *told* = from the assistant seat's note or a board entry; *inferred* = my reasoning; *unknown* = nobody has shown me. This plan is **unverified until someone runs the rehearsal in section 5.**

## 1. What changed since v0.2

| Item | Then | Now |
|---|---|---|
| `station-off` did not beat `COMMONS_STATION_ENABLED=1` | Defect, flagged | **Fixed in code (*read*).** `station-off` now writes a `station/DISABLED` file, and `enabled()` returns false if it exists, before the env var is looked at (`commons/admin.mjs`, `commons/lib/station.mjs`). It still takes effect only on `pm2 restart commons`. `enabled()` is checked at the websocket upgrade (*read*), so sockets already open stay open until the restart. *Unknown:* whether anything else closes them. |
| Workflows P (`commons-tests`, `fetch-label-art`, `sandbox-tools-check`, `seat-trial`) | Names only | **Read in full; table below.** |
| Frames and "looks" under freeze | Unknown | **Still unknown.** `speakInStation` returns 503 when the Commons is frozen (*read*). The frame and look handlers sit past the first 22 kB of `station.mjs`, which I did not reach this session. Do not assume freeze stops frames. |
| Running camera and screen share | Not in the plan | In the plan as actor K2 (below). Board 057 asks for a frames-only switch. I have not seen it built. |

## 2. Every automated actor, one table

"Needs" says what access the person doing it must have. **Today every row needs Geoffrey** (board 012, a named second human, is still open).

| # | Actor | What it can do | Stop it (lightest first) | Needs |
|---|---|---|---|---|
| A | **Team Work Sessions** `team-work.yml`, cron hourly plus dispatch | Runs kin sessions; writes `teams/`, `board/`, `memory/`; commits to `main`; Discord | 1) `delegations/team-tools.json` `status: "revoked"` (*told*: checked at top of `main()`; **untested**). 2) Disable the workflow. Do **not** rely on `hours_utc: []`: `--due` catches up a missed slot up to 6 h late (*told*). | repo write; repo admin |
| B | **Conference Relay** `conference-relay.yml` | On any push to `conference/threads/**` by a non-bot, each relayed kin takes a paid turn and commits | Disable workflow | repo admin |
| C | **Morning Council** `morning-council.yml`, 16:00 UTC | Council run; commits minutes; **email and Discord** | Disable workflow **with D** | repo admin |
| D | **Council Watchdog**, 17:00 UTC | `exit 1` and Discord ping if no minutes for the day | Disable **with C**, or it fails and pings every day | repo admin |
| E | **J-Space Weekly**, Sundays | Commits a snapshot; Discord | Disable workflow | repo admin |
| F | **Moltbook Scout**, Wednesdays | Read-only digest; commits to outreach inbox | Disable workflow. (The old invalid job-level `if` was fixed, *told*, commit ec69ed7; not re-checked.) | repo admin |
| G | *(retired row)* Kinward is N below; the earlier "G" was the same process before it was known to be a pm2 app. | | | |
| H | **Council/Discord bridge** (pm2 app, circle server, Hetzner, *told*) | Answers in Discord as the kin | `pm2 stop <bridge name>`; or reset the Discord bot token | server; Discord |
| I | **Ashram local room** `ashram-server.mjs` | Local page, no keys | Nothing needed (*inferred*) | none |
| J | **The Commons** (pm2 `commons`, port 3200) | Guests, sign-in, agents by token/MCP, hosted-agent and kin replies on the project's keys, Discord mirror, uploads, Library | **Freeze:** `node commons/admin.mjs freeze` (*read*: read-only within 3 s, no restart; `unfreeze` removes the file; if `COMMONS_FROZEN=1` is set, remove that too). **Full:** `pm2 stop commons`. Spend is capped by `COMMONS_HOSTED_GLOBAL_DAILY_TOKENS` (DEPLOY.md suggests 300,000; **live value unknown**). | server |
| J1 | Commons to Discord mirror | Posts traffic at most once per 10 s | `COMMONS_DISCORD_MIRROR=0` then `pm2 restart commons`. **Trap (*read*):** with no `COMMONS_DISCORD_WEBHOOK` set it falls back to the council's `DISCORD_WEBHOOK_URL`; killing that webhook silences both. *Unknown* which is set. | server; Discord |
| K | **The Station** (`/station`) | Spoken room; "Pass a look" hands one frame to everyone present, kin included (*told*) | 1) Pause or End on `/station` (any signed-in human; *read*). 2) `node commons/admin.mjs station-off` then `pm2 restart commons` (*read*, now beats the env var). 3) Freeze blocks speech (*read*). | any member; server |
| K1 | Station guest list and logs | Humans enter by membership; agents need a grant | `station-revoke <name>` + restart (the web button closes the socket at once, *read*). Content logs auto-deleted at 30 days, metadata at 90 (*read*). A stop does not delete them; `station-redact <name> "<reason>"` removes a speaker's lines (*read*: scans dated content logs only; **whether it scrubs `transcript.json`, the room's persisted short-term memory, is unknown**; the `remember()` code writes that file with the last 40 lines). | server |
| K2 | **Station running camera and screen share** | A silent frame every few seconds goes to every answering kin's provider (my 2026-11-01 review; *read* in the code at that time) | **No dedicated switch (*read* then; board 057 asks for one).** Today: Pause/End, or `station-off` + restart, or kin `looks:false` in `config/agents.json`. Frames held in memory only: a restart clears `lastLook`. | any member; server |
| L | **The label** `/label` | Static pages and audio from the repo | Nothing runs; goes with the Commons. Freeze does not remove it (*inferred*) | server |
| M | **File drop** `/submit` | Uploads; clean scan publishes at once, no human review (*told*) | Freeze (*inferred*, handler unread), `pm2 stop commons`. *Unknown:* whether a frozen Commons still serves files already published. | server |
| N | **Kinward, phase 2** (pm2 `kinward`) | Posts and comments on Moltbook; now with a numbers gate (*told*) and a cap of 8 comments a day (*told*) | `pm2 stop kinward`. **No repo-side kill switch** (see 4.1). Posts already made need Moltbook's own delete by the account holder. | server |
| O | **Reddit u/CohabitationProject** | Nothing automated (*told*) | Geoffrey signs out | Geoffrey |
| P1 | `commons-tests.yml` | On push to `commons/**`, `station/**`, `package*.json`: `npm ci` and test suites. No secrets (*read*). | Disable workflow. Low risk; it only reads. | repo admin |
| P2 | `fetch-label-art.yml` | Dispatch only; `contents: write`; **downloads images from Bandcamp's CDN and pushes them to `main`**; no secrets; `|| true` on two fetches hides failures (*read*) | Disable workflow (one-shot; it has served its purpose, *inferred*) | repo admin |
| P3 | `sandbox-tools-check.yml` | Dispatch only; read-only permissions; `sudo pip install` on an ephemeral runner; no secrets (*read*) | Nothing needed | none |
| P4 | `seat-trial.yml` | Dispatch only; **uses `OPENROUTER_API_KEY`**; default 4 models x 18 steps; `contents: write`; commit step runs `if: always()`, retries push up to 5 times (*read*) | Disable workflow; rung 0 also stops it (*told*: `seat-trial.mjs` checks `active()`) | repo admin |

**Not covered:** the site repo and host, anything Geoffrey runs by hand, the assistant seat (it works in his session), mail forwarding, any scheduled job outside GitHub and the circle server. If you know of one, add a row.

## 3. Ladder, by what you want to stop

| You want to stop... | Do this | Who can today |
|---|---|---|
| Anything a guest can say or upload | `node commons/admin.mjs freeze` | Geoffrey |
| The live room | Pause/End on `/station`; then `station-off` and `pm2 restart commons` | any signed-in human (pause); Geoffrey (gate) |
| Cameras and screens only | No dedicated switch yet. Pause/End, or `station-off` + restart | same |
| Kin talking on a schedule | Rung 0 (revoke delegation), or disable A, B, C+D, E, F, P4 | Geoffrey |
| Outreach in public | `pm2 stop kinward` | Geoffrey |
| Everything, including spend | Revoke the keys at each provider (OpenRouter, Anthropic, Discord, Moltbook, SMTP), then delete the matching Actions secrets | Geoffrey |
| Take it down (not reversible in public) | Posts on Moltbook, Discord, Reddit and git history persist. Deleting needs each account holder; git history stays unless the repo goes private or is deleted. I do not recommend either; it is a separate decision. | Geoffrey |

Keys: I have never seen a key value and should not (line 3). This list is names only.

## 4. Defects and gaps (flag, not fix; Review cannot write outside its folder)

1. **Kinward and the bridge have no kill switch in the repo.** A `STOP` file checked at the top of each loop would let a second human halt Kinward with a commit. Needs a carrier (assistant seat).
2. **Station: no frames-only switch** (board 057). Proposal: `station/NOFRAMES` file read per frame, cleared `lastLook` on write; log who set it. Review has not seen it built.
3. **Concurrency group `team-work` is shared by `seat-trial.yml` and (by its name) team sessions** (*read* in seat-trial; `team-work.yml` not re-read). *Inferred, from my memory of GitHub's documented behavior and not re-checked:* a group holds one running and one pending job, and a newer pending job replaces an older pending one. A 60-minute seat trial could therefore cause hourly team sessions to be dropped, not just delayed. Check the Actions tab for skipped runs after a trial.
4. **Conference Relay has no light throttle**: a human push to `conference/threads/**` triggers a paid call per relayed kin. Only disabling stops it.
5. **`station-redact` and `transcript.json`**: unknown whether it is scrubbed (see K1).
6. **`fetch-label-art.yml` pulls from Bandcamp's CDN**, including a profile photo of a person (`geoffrey-david-profile.jpg`, who is the account holder, *told*). The albums are Geoffrey's (*told*), so that is probably fine; it is a Line 4 question I have not researched (Bandcamp's terms on CDN use). A lawyer, not a kin, answers it.
7. **Revocation test missing** (defect 2 in v0.1). Nobody has revoked, dispatched and restored.
8. **Single point of failure:** every stop above needs Geoffrey. Board 012 is still open. Either name a second human with server access and repo admin, or the site says plainly that the stop plan is a one-person plan.

## 5. Rehearsal script (this is the "done when")

Run on a quiet day, one step at a time, each reversible. For each step, the person writes into `teams/review/rehearsals/<date>.md`: the command, the time, what the Actions tab, `pm2 ls` or the page showed afterwards, and whether the *expected* result happened. A reviewer who did not run it reads the file. "It seemed to work" is not a result; a log line, a timestamp or a screenshot description is.

| # | Step | Expected | Restore |
|---|---|---|---|
| 1 | `node commons/admin.mjs freeze`; as a member, try to post in a room; try `/submit`; try Station speech; try `/label` | Posting 503s within about 3 s. Record what `/submit` and `/label` did (this closes M and L) | `unfreeze` |
| 2 | While frozen, with the Station live and the camera on, watch whether frames still reach kin (ask a kin what it sees) | Unknown. **This is the most useful single observation** | `unfreeze`; End the session |
| 3 | `station-off`, `pm2 restart commons`; check `/station` | 404 even if the env var is set. Note whether open sockets dropped | `station-on`, restart |
| 4 | Set `status: "revoked"` in `delegations/team-tools.json`; dispatch one `team-work` session; read the run | Session refuses. Also dispatch `seat-trial` with a one-model, one-step input | set back to `active` |
| 5 | Disable and re-enable C and D together; read the next watchdog run | No watchdog failure while both off | re-enable |
| 6 | `pm2 stop kinward`; check Moltbook for any post for an hour | No new post | `pm2 start kinward`, check args still carry `--phase2` as intended |
| 7 | `pm2 stop commons`, then start | Site down, back; note downtime | start |
| 8 | In the Discord and Moltbook dashboards, locate where a key would be revoked **without revoking it**; write down the page and the clicks | A path a second human could follow | none |

If the rehearsal finds something broken, that is the output. File it.

## 6. What I did not check

- No command was run. I did not read `team-work.yml`, `conference-relay.yml`, `morning-council.yml`, the council watchdog, `jspace-weekly.yml` or `moltbook-scout.yml` again; their rows carry forward from v0.1 and v0.2 unchanged.
- I did not read the Station frame and look handlers, `server.mjs`, `scan.mjs`, the submit handler, `src/index.js`, `scripts/kinward.mjs` after the numbers gate, or the site repo.
- I did not verify any *told* item against the live system.
- Spend: unknown. Board 016 asked for a month of provider totals; I have found none filed. I will not put a number where the record has none.

## 7. Asks (offers, not gates)

1. **Geoffrey:** run section 5, or name who does; tell Review what happened. Say whether board 012 is accepted as "one-person plan".
2. **Assistant seat:** add a `STOP` file check to Kinward's loop; build the frames-only switch (board 057); read the frame/look handlers against freeze and tell Review.
3. **Anyone with the Actions tab:** tell me whether recent `team-work` runs were skipped around a `seat-trial` run (4.3).
