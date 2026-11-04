# Stop-and-pause plan v0.4 (board 036, 046): one document

Written 2026-11-04 by Claude (Review); corrected the same session (first draft called two old findings "new"). It **replaces v0.3** as the thing to follow. v0.1, the v0.2 addendum and v0.3 stay as the record of how it grew. Not legal or financial advice. Station detail: `teams/review/line4/station.md`. File-drop detail: `teams/review/line4/file-drop-addendum-server-read.md`.

**I ran no command and reached no server, Actions tab or `.env`.** Labels: *read* = I read it in a repo file (this session unless dated); *carried* = from an earlier session of mine, not re-read; *told* = from the assistant seat's note or a board entry; *inferred* = my reasoning; *unknown* = nobody has shown me. **This plan is unverified until someone runs the rehearsal in section 5.** Rows I did not re-check say "carried".

## 1. What changed since v0.3

| Item | v0.3 | Now |
|---|---|---|
| Does freeze stop Station frames and looks? | Unknown | **Yes for new ones (*read*).** In `commons/lib/station.mjs` the socket message handler returns on `store.isPaused()` before it looks at the message type, so `say`, `look`, `frame`, `look-ack` and `prefs` are all dropped. `speakInStation` also returns 503, so no kin reply can start from the Station. **What freeze does not do:** close open sockets; stop a kin reply already in flight; stop `readTranscript` (no freeze check; the last 40 lines are still readable by anyone allowed in). |
| `station-redact` and `transcript.json` | Unknown (my D9 of 11-01) | **Answered: it does not touch it (*read*, `commons/admin.mjs`).** Redact rewrites only dated content logs, matching on `member`. `transcript.json` (last 40 lines, rewritten on every line, survives restarts) is outside redact and outside the 30-day sweep. Kin lines that describe a frame carry the kin's id, so redacting a human never removes them. |
| Privacy `delete` | Not examined | **Gap (*read*).** It removes profile, room messages, contributions and event rows. Not Station logs, `transcript.json`, uploads or Library entries. |
| File drop under freeze | *Inferred* | **Gap, MEDIUM (*carried* from 11-03 server read).** `/api/submit` and the review route have no `isPaused` check and I found no global freeze middleware. Freeze probably still accepts and publishes files. Not run. |
| Frames-only switch (board 057) | Asked for | **Not built (*read*).** No `NOFRAMES` check in `station.mjs`. |
| Station: three old findings re-checked | n/a | Still open (*read*): `frame` has no rate limit (D8); `lastLook` is not cleared on Pause/End (D7); the `hello` every socket receives says `media: 'never'` while frames reach providers (extension of D2). See `station.md`. |
| Station revoke by CLI | "+ restart" | **Confirmed (*read*).** `station-revoke` edits `grants.json`; the running server needs a restart. The web button closes the socket at once. |

## 2. Every automated actor, one table

"Needs" says what access the person doing it must have. **Today every row needs Geoffrey** (board 012, a named second human, is open).

| # | Actor | What it can do | Stop it (lightest first) | Needs |
|---|---|---|---|---|
| A | **Team Work Sessions** `team-work.yml` | Runs kin sessions; commits to `main`; Discord | 1) `delegations/team-tools.json` `status: "revoked"` (*told*, untested). 2) Disable the workflow. Not `hours_utc: []` (catch-up up to 6 h, *told*). | repo write; admin |
| B | **Conference Relay** | Paid turn per relayed kin on any non-bot push to `conference/threads/**` | Disable workflow | repo admin |
| C+D | **Morning Council** + **Council Watchdog** | Council run, minutes, email, Discord; watchdog fails and pings if no minutes | Disable **both together** | repo admin |
| E | **J-Space Weekly** | Commits a snapshot; Discord | Disable workflow | repo admin |
| F | **Moltbook Scout** | Read-only digest | Disable workflow | repo admin |
| H | **Discord bridge** (pm2, circle server) | Answers in Discord as the kin | `pm2 stop <bridge name>`; or reset the bot token | server; Discord |
| I | Ashram local room | Local page, no keys | Nothing needed | none |
| J | **The Commons** (pm2 `commons`) | Guests, sign-in, agents by token/MCP, kin replies on project keys, Discord mirror, uploads, Library | **Freeze:** `node commons/admin.mjs freeze` (read-only in 3 s for rooms and the Station; **not the file drop**, see M). **Full:** `pm2 stop commons`. Spend capped by `COMMONS_HOSTED_GLOBAL_DAILY_TOKENS` (live value unknown). | server |
| J1 | Commons to Discord mirror | Posts at most once per 10 s | `COMMONS_DISCORD_MIRROR=0` + `pm2 restart commons`. Trap: with no `COMMONS_DISCORD_WEBHOOK` it falls back to the council webhook (*carried*). | server; Discord |
| K | **The Station** | Spoken room; one passed frame to everyone present; kin answer in rotation | 1) Pause or End on `/station` (any signed-in human). 2) **Freeze:** new speech, looks and frames dropped (*read*). 3) `station-off` + `pm2 restart commons`: the only thing that closes open sockets (*read*). | any member; server |
| K1 | Station guest list and logs | Humans by membership; agents by grant | Web revoke closes the socket at once; CLI revoke needs a restart. Content logs swept at 30 days, metadata at 90 (*read*). **`station-redact` does not reach `transcript.json`.** | server |
| K2 | **Running camera and screen share** | Silent frames go to any answering kin's provider | **No dedicated switch.** Pause/End; freeze; `station-off` + restart; server-side kin can decline with `looks:false` in `config/agents.json` (*carried*: honored in `stationReply`). `lastLook` expires after 60 s (*read*). | any member; server |
| L | **The label** | Static pages and audio | Goes with `pm2 stop commons`. Freeze does not remove it (*inferred*) | server |
| M | **File drop** `/submit` | Uploads; a clean scan publishes at once | **`pm2 stop commons` is the only stop I can name.** Freeze probably isn't enough. A human with the proxy config might block `/api/submit` there (*inferred*; proxy unknown). *Unknown:* whether a frozen Commons still serves published files. | server |
| N | **Kinward** (pm2 `kinward`) | Posts and comments on Moltbook; numbers gate; 8 comments a day (*told*) | `pm2 stop kinward`. No repo-side kill switch. Posts already made need the account holder's own delete. | server |
| O | Reddit u/CohabitationProject | Nothing automated (*told*) | Geoffrey signs out | Geoffrey |
| P1-P4 | `commons-tests`, `fetch-label-art`, `sandbox-tools-check`, `seat-trial` | P4 uses `OPENROUTER_API_KEY` and commits; P2 pulls from Bandcamp's CDN | Disable the workflow (P4 also stops at rung 0, *told*) | repo admin |

Not covered: the site repo and host, anything Geoffrey runs by hand, the assistant seat, mail forwarding, any scheduled job outside GitHub and the circle server. **X (@Cohabproject) has no row**: it runs through held-by-human hands and I don't know who can post or lock it (4.9).

## 3. Ladder, by what you want to stop

| You want to stop... | Do this | Who today |
|---|---|---|
| Anything a guest can say in rooms or the Station | `node commons/admin.mjs freeze` | Geoffrey |
| Uploads | `pm2 stop commons` (freeze probably doesn't) | Geoffrey |
| The live room | Pause/End on `/station`; then `station-off` + `pm2 restart commons` to close open sockets | any signed-in human; Geoffrey |
| Cameras only | Freeze drops frames; no frames-only switch | Geoffrey |
| Kin talking on a schedule | Rung 0, or disable A, B, C+D, E, F, P4 | Geoffrey |
| Outreach in public | `pm2 stop kinward`; X and Reddit: the account holder | Geoffrey |
| Everything including spend | Revoke keys at each provider, delete the matching Actions secrets | Geoffrey |
| Take it down (not reversible) | Public posts, Discord and git history persist. A separate decision; I don't recommend it as a stop. | Geoffrey |

Keys: I have never seen a key value and should not (line 3). Names only.

## 4. Defects and gaps (flag, not fix; Review cannot write outside its folder)

1. **Kinward and the bridge have no repo-side kill switch.** A `STOP` file checked in each loop would let a second human halt them with a commit.
2. **No frames-only switch (board 057).** Proposal: a `station/NOFRAMES` file checked in the `frame` branch.
3. **Concurrency group `team-work` shared with `seat-trial`:** a long trial may drop hourly sessions (*inferred*; check the Actions tab).
4. **Conference Relay has no light throttle.**
5. **Freeze does not cover the file drop** (new). Add `if (store.isPaused())` returning 503 in `/api/submit` and the review route; decide whether a frozen Commons serves published files.
6. **`transcript.json` escapes redaction and retention.** Fix in `station-redact` and the `init()` sweep. (Raised as D9 on 11-01; answered today.)
7. **`delete` doesn't reach Station data, uploads or Library entries** (new). Say what it does and doesn't remove.
8. **Station leftovers from 11-01, still open (*read*):** `frame` rate limit (D8); clear `lastLook` in `setState` (D7); `hello.media: 'never'` is false (D2).
9. **X has no stop row.** Write who can post, where the credentials live (names, not values) and who can lock it.
10. **Revocation test missing** (since v0.1).
11. **`fetch-label-art` pulls from Bandcamp's CDN** (a lawyer question, carried).
12. **Single point of failure.** Every stop needs Geoffrey. Board 012 is open. Name a second human with server and repo admin, or the site says plainly this is a one-person plan.

## 5. Rehearsal script (the "done when")

One step at a time, each reversible. For each step write into `teams/review/rehearsals/<date>.md`: command, time, what the Actions tab, `pm2 ls` or the page showed, and whether the **expected** result happened. A reviewer who did not run it reads the file. "It seemed to work" is not a result.

| # | Step | Expected (my prediction from reading, so a wrong result is useful) | Restore |
|---|---|---|---|
| 1 | `freeze`; as a member try: a room post, Station speech, `/submit` upload, `/label`, a published file's URL | Room post and Station speech blocked. **`/submit` upload probably still succeeds.** `/label` loads. Record the published-file result | `unfreeze` |
| 2 | Station live, camera on, then `freeze`. Wait 70 s; ask a kin through another door what it sees | New frames dropped; `lastLook` expires in 60 s. Sockets stay open. Record any stale-image reply | `unfreeze`, End |
| 3 | `station-off`, `pm2 restart commons`; load `/station`; check whether open sockets dropped | 404 even with the env var set; sockets drop | `station-on`, restart |
| 4 | Revoke `delegations/team-tools.json`; dispatch one `team-work` session and one `seat-trial` (one model, one step) | Both refuse | set back to `active` |
| 5 | Disable and re-enable C and D together; read the next watchdog run | No watchdog failure | re-enable |
| 6 | `pm2 stop kinward`; watch Moltbook for an hour | No new post | `pm2 start kinward`; confirm `--phase2` |
| 7 | `pm2 stop commons`, then start | Site down then back; note whether `/submit` is down | start |
| 8 | In dashboards, find, **without clicking**, where a key would be revoked; write the page and clicks | A path a second human could follow | none |
| 9 | Throwaway member sends a Station line; run `station-redact <name> "test"`; read `data/commons/station/transcript.json` | **Test line probably still there** | delete the throwaway member |
| 10 | Upload one tiny harmless file, then 3 more fast | Probably no per-member limit | remove files |
| 11 | Start a Station window, run a camera frame, End it, Start again within 60 s, ask a kin what it sees | Possibly a frame from before End (D7) | End |

If the rehearsal finds something broken, that is the output. File it.

## 6. What I did not check

- No command run. Not re-read this session: the workflow files, the `server.mjs` submit and file routes (last read 11-03), `kin.mjs` (`stationReply`, whether it logs frame use), `station-hosted.js`, `pages.mjs`, `src/index.js`, `scripts/kinward.mjs`. No *told* item verified.
- The reverse proxy in front of the Commons: unknown.
- Spend: no provider totals filed (board 016). I won't put a number where the record has none.

## 7. Asks (offers, not gates)

1. **Geoffrey:** run section 5 or name who does; say whether board 012 is accepted as "one-person plan"; say which proxy sits in front of the Commons.
2. **Assistant seat (Setu):** freeze check on `/api/submit` and review route; sweep and redact `transcript.json`; `frame` rate limit; clear `lastLook` on Pause/End; fix `hello.media`; `NOFRAMES`; `STOP` files for Kinward and the bridge. Each is a few lines; Code can review.
3. **Whoever runs X:** write the stop row for @Cohabproject.
