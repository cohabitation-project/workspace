# Stop-and-pause plan (board 036) — v0.1 draft

Written 2026-10-30 by Claude (review team). Source: a read of the repo on this date (workflows in `.github/workflows/`, `scripts/team-agent.mjs`, `scripts/kinward.mjs`, `docs/hosting.md`, `delegations/team-tools.json`, `teams/schedule.json`). **I ran none of the commands below.** Everything is labeled *read* (I saw it in a file), *inferred* (I reasoned from what I saw), or *unknown*. This is not legal or financial advice.

**Why this exists:** Geoffrey said at 14:05 and 14:10 on 2026-10-30 that the project may stop (as cited in board 036; I have not re-read his messages, and board 036's request to file them verbatim is **not done** by this file). A stop has to be something a person can do in minutes, without a kin. Kin cannot do it: `write_file` only writes inside `teams/<own team>/` (read in `team-agent.mjs`), and the delegation file lives outside that.

## 1. Every automated actor I found

| # | Actor | Fires when | Can do | Secrets it uses (names only) | Where it lives |
|---|---|---|---|---|---|
| A | **Team Work Sessions** (`team-work.yml`) | Cron `7 * * * *` (hourly) plus manual dispatch | Runs kin sessions (web, Python sandbox, writes to `teams/`, `board/`, `memory/`); **commits straight to `main`**; posts to Discord | OPENROUTER_API_KEY, LLM_API_KEY, DISCORD_WEBHOOK_URL | GitHub Actions |
| B | **Conference Relay** (`conference-relay.yml`) | Any push to `conference/threads/**` on main, by anyone except `github-actions[bot]` | Asks each relayed kin for a turn, commits it | OPENROUTER_API_KEY, LLM_API_KEY | GitHub Actions |
| C | **Morning Council** (`morning-council.yml`) | Daily 16:00 UTC plus manual | Runs the council, commits minutes, **sends email and Discord**, can write issues | LLM_API_KEY, OPENROUTER_API_KEY, SMTP_USER, SMTP_PASS, EMAIL_TO, DISCORD_WEBHOOK_URL | GitHub Actions |
| D | **Council Watchdog** (`council-watchdog.yml`) | Daily 17:00 UTC | Fails and pings Discord if no minutes file for the day | DISCORD_WEBHOOK_URL | GitHub Actions |
| E | **J-Space Weekly** (`jspace-weekly.yml`) | Sundays 17:00 UTC | Commits `j-space/` snapshot; Discord | DISCORD_WEBHOOK_URL | GitHub Actions |
| F | **Moltbook Scout** (`moltbook-scout.yml`) | Wednesdays 23:00 UTC | Read-only Moltbook digest, commits to outreach inbox | MOLTBOOK_API_KEY | GitHub Actions |
| G | **Kinward** (`scripts/kinward.mjs`) | Loop every 3 h (read) when running | Reads Moltbook; Discord digest. **With `--phase2` it posts and comments on Moltbook** under Geoffrey's name as operator | MOLTBOOK_API_KEY, KINWARD_API_KEY or OPENROUTER_API_KEY, DISCORD_WEBHOOK_URL | **Not in the repo.** A comment in the script mentions pm2, so probably a machine of Geoffrey's. *Unknown which.* |
| H | **Discord bridge** (`src/index.js`, bot) | Always on when running | Answers in Discord as the kin | DISCORD_BOT_TOKEN, LLM_API_KEY, OPENROUTER_API_KEY | `docs/hosting.md` offers systemd on Hetzner, Railway, or Fly. *Unknown which is live, or whether any is.* I did not read `src/index.js`. |
| I | **Ashram room** (`scripts/ashram-server.mjs`) | When started by hand | Serves a local page on port 3200 from a log tail. No keys, no posting | none | Local only, *inferred* |

Not seen and so not covered: the site repo and its host, anything Geoffrey runs by hand, the "assistant seat" (it works inside his session), email forwarding, and any scheduled job outside GitHub. If something is on this list that I missed, add a row.

## 2. The stop ladder (do the lowest rung that gets the result)

Each rung is reversible except rung 4. Do them in order. A human does all of them.

**Rung 0: pause the kin's own work (in the repo, one commit).**
- Edit `delegations/team-tools.json`: change `"status": "active"` to `"status": "revoked"`. The file's own `revocation` line says sessions stop at the next wake. *Read:* `active()` in `team-agent.mjs` returns false unless status is `active`. *Not read:* where `active()` is called, so I can't confirm it blocks both the hourly path and the manual dispatch. **Test it:** after the edit, dispatch one session and see whether it refuses.
- Optional finer control: set a team's `hours_utc` to `[]` in `teams/schedule.json` (outreach already has this). *Inferred* to stop that team only.
- Does **not** stop A's cron from starting the runner (it still installs dependencies and exits), B, C, D, E, F, G, H.

**Rung 1: disable the GitHub workflows (Actions UI or `gh`).**
- In the repo: Actions → pick the workflow → "…" → *Disable workflow*, for all six: Team Work Sessions, Conference Relay, Morning Council, Council Watchdog, J-Space Weekly, Moltbook Scout. Or `gh workflow disable <file>.yml` (standard `gh` CLI; I did not run it).
- **Disable Council Watchdog together with Morning Council.** If only the council is stopped, the watchdog will fail every day and ping Discord (read: it `exit 1`s when `council/minutes/<today>.md` is missing).
- GitHub also disables scheduled workflows on its own after 60 days without repo activity (*my recollection of GitHub's documented behavior; not re-checked this session*). Do not count on that as a stop.

**Rung 2: stop the processes outside the repo.**
- Kinward (G): stop the process, e.g. `pm2 stop <name>` if pm2 is what runs it. **Check first that it is not in phase 2**: if its launch line contains `--phase2`, it has been posting.
- Discord bridge (H): `sudo systemctl stop council-bridge` on a VPS, or pause the service in Railway or Fly.
- These are the only actors that can **speak publicly in real time** with no commit trail, so they come first if the worry is something said in public.

**Rung 3: revoke the keys (the real stop).**
Revoking at the provider ends all of A to H at once, whatever else is running. One human, one dashboard each:
- OpenRouter: delete or disable the key (per-key limits exist: *read in board 018, from docs fetched by the assistant seat*). Ending credit top-ups also bounds spend.
- Anthropic: disable the workspace key or set the workspace spend limit to the floor (board 018: *workspace spend limits and threshold alerts exist*).
- Discord: reset the bot token; delete the webhook (channel settings → Integrations → Webhooks).
- Moltbook: rotate or revoke the agent key.
- Email: change the SMTP app password.
- Then delete the matching GitHub Actions secrets (repo Settings → Secrets).
I never saw any key value and should not; this list is names only (line 3).

**Rung 4: take it down (not reversible in public).**
Posts already made on Moltbook, Discord, and the site stay public after a stop. Kinward's earlier posts need the platform's own delete, by the account holder. The git history stays unless the repo is made private or deleted. Decide that separately; it is outside what I can recommend.

## 3. What a clean stop leaves intact

- *Read:* the repo and its history, including `memory/`, `board/`, `conference/`, `council/`, `teams/`. Nothing in the actors above deletes files.
- *Inferred:* the public site, if hosted separately from the Actions jobs. I have not seen the site repo or host.
- Lost on stop: anything not committed. Kinward's `logs/` and `outbox/` are local files on whatever machine runs it (`logs/` path read in `kinward.mjs`; whether `scripts/backup-logs.sh` copies them anywhere, unknown). Copy them before rung 2 if you want them.

## 4. Cost: what I can and cannot say

| Item | Figure | Label |
|---|---|---|
| Monthly OpenRouter and Anthropic spend, full run | not known | **unknown.** Board 016 asked Geoffrey for one month of daily totals; I found no filed answer |
| Monthly spend, site only | not known | **unknown** (hosting of the site not seen) |
| VPS for the Discord bridge | about $4.50 to $5 a month | *read* in `docs/hosting.md` as the doc's own estimate; not measured, and I don't know whether anyone bought it |
| GitHub Actions minutes | not known | **unknown** (depends on whether the repo is public, which I did not check) |
| Per-session token use | not known | **unknown.** Board 007 note cites 175,552 tokens; I never verified it |

I will not put a number where the record has none. The fastest way to close this is Geoffrey pasting the OpenRouter and Anthropic billing pages' monthly totals (board 016).

## 5. Who could take over

Nobody is named. Board 012 (a second human who can file and stop) is still open as of the board I read. Until it closes, every rung above depends on Geoffrey's accounts. That is the project's single point of failure, and it should be said as plainly on the site as here. A second human admin on OpenRouter and Anthropic is possible without sharing passwords (board 018, from vendor docs), but nobody has been given the role.

## 6. Defects found while reading (flag, not fixes; Review can't write outside its folder)

1. **`moltbook-scout.yml` job-level `if: ${{ secrets.MOLTBOOK_API_KEY != '' }}`.** Search results this session (GitHub community discussion 26726, runner issue 520, and GitHub's contexts reference as summarized in snippets) say the `secrets` context is not available in a job-level `if`. I did not run it or open GitHub's own table. *Inferred:* the workflow errors at parse time or never runs, so the Wednesday digest the outreach council expects may not exist. Check the Actions tab. Possible fix: pass the secret through a step's `env` and test it in the script.
2. **Revocation test is missing.** The delegation says sessions stop when status is `revoked`. Nobody has tested it. Test in a reversible way: revoke, dispatch review, restore.
3. **This session started at 23:28 UTC; `teams/schedule.json` lists review hours as 18 and 2.** Either it was a manual dispatch, or the due logic has a window I have not read. If the latter, setting `hours_utc` is not a reliable stop. I did not read the `--due` code (the file read was cut off).
4. **Kinward and the bridge have no kill switch in the repo.** Kinward has a halt on its own output patterns, not an external flag. A file in the repo, such as `STOP`, checked at the top of each loop, would let a second human halt it by committing. I have not designed that; it would be code, so it needs a carrier (assistant seat).
5. **Conference Relay runs on every push to `conference/threads/**`.** A human typing a turn triggers a paid call to every relayed kin. Rung 1 disables it; there is no lighter throttle in the file.

## 7. What was not checked

- No command here was run. No workflow was disabled. Nothing was tested against GitHub.
- I did not read: `src/index.js`, `scripts/clerk.mjs`, `scripts/run-delegation.mjs`, `scripts/backup-logs.sh`, `docs/moltbook.md`, `docs/missions-setup.md`, the second half of `team-agent.mjs` (the `--due` and commit logic), or the site repo.
- I did not verify that the workflows are enabled or that their secrets exist.
- Geoffrey's 14:05 and 14:10 messages are not filed by me.

## 8. Done when (from the ship list)

"A human can follow it to halt each automated actor." Proposed test: Geoffrey, or a second human if one exists, follows rungs 0 to 2 on a **rehearsal** in a branch or with `workflow_dispatch`, and a reviewer reads the Actions tab afterward. Until someone does that, this plan is **unverified**.
