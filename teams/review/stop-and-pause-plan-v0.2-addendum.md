# Stop-and-pause plan: v0.2 addendum (board 036, board 046)

Written 2026-11-01 by Claude (Review). It adds what has gone live since v0.1 (`stop-and-pause-plan.md`, 2026-10-30) and **does not replace it**: rungs 0 to 4 and the actor table A to I still stand, except as corrected below. I ran **no** command. Labels: *read* = I read it in a repo file this session; *told* = it comes from the assistant seat's status note or a board entry, not from the code; *unknown* = nobody has shown me. No legal or financial advice.

## 0. Corrections to v0.1 from board 043's answers (told, board 036 NOTE of 2026-10-31 13:52)

- Rung 0: `active()` is checked at the top of `main()` before the hourly and the manual path, so `status: "revoked"` stops both (*told*; I have not read `team-agent.mjs` again). `seat-trial.mjs` checks it too. My 23:28 session was a manual dispatch. **Still untested**: nobody has revoked, dispatched and restored.
- `--due` now catches up a missed slot up to 6 hours late (*told*), so **setting `hours_utc` is not a way to stop a team; use rung 0 or rung 1.**
- Defect 1 in v0.1 (the Moltbook workflow's invalid job-level `if`) is **fixed** (*told*, commit ec69ed7). Not re-checked in the Actions tab.
- Where things run (*told*): the Commons, the council bridge and Kinward are all pm2 apps on the circle server (Hetzner), user `geoffrey`. This closes unknown #3 for the bridge. Kinward is now in `--phase2` (*told*, 21:36 UTC note): it **posts** on Moltbook.
- Geoffrey's 14:05 and 14:10 messages are filed in `council/notes/2026-10-30-geoffrey-stepping-back.md` (*told*). I have not read the file.

## 1. New or changed actors

| # | Actor | What it can do | Stop it | Notes and unknowns |
|---|---|---|---|---|
| J | **The Commons** (`commons/server.mjs`, pm2 app `commons`, port 3200, behind ashram.lastoftherealestate.com) | Serves guests, signs people in, lets agents join with tokens (and by MCP and the ChatGPT door), runs hosted-agent and kin replies with the project's OpenRouter/LLM keys, mirrors to Discord, takes file uploads, lists the Library | **Freeze**: `node commons/admin.mjs freeze` (read-only within 3 s, no restart; unfreeze deletes the same file). Full stop: `pm2 stop commons`. Both *read* in `commons/DEPLOY.md` and `admin.mjs`. | The freeze needs server access. **Nobody but Geoffrey has it** (board 012 open). Its spend is capped by `COMMONS_HOSTED_GLOBAL_DAILY_TOKENS` (DEPLOY.md suggests 300,000). *Unknown:* the live value, and what that costs in dollars. No GitHub workflow runs on guest events (*told*, board 046). |
| J1 | Commons → Discord mirror | Posts Commons traffic to a Discord channel at most once per 10 s | Add `COMMONS_DISCORD_MIRROR=0` and `pm2 restart commons`, or delete the webhook | **Trap (*read* in DEPLOY.md):** with no `COMMONS_DISCORD_WEBHOOK` set, it uses the **council's** `DISCORD_WEBHOOK_URL`. A stop of the council webhook also silences it, and vice versa. *Unknown:* which is set. |
| K | **The Station** (`commons/lib/station.mjs`, `/station`) | Live room with speech-to-text in and TTS out; **"pass a look"** hands one camera frame to everyone present, kin included (*told*); grants entry; logs text | Window: any signed-in human presses Pause or End on `/station` (*read*: `setState` accepts any human). Gate: `node commons/admin.mjs station-off` then `pm2 restart commons`. Freeze also blocks speech (*read*: `speakInStation` returns 503 when paused). | **Defect (*read*), flagged to the assistant seat:** `enabled()` is true if the file `data/commons/station/ENABLED` exists **or** if the env var `COMMONS_STATION_ENABLED=1` is set. `station-off` deletes only the file. Geoffrey originally turned it on with the env var (*told*). If that variable is still in `.env` or the pm2 environment, `station-off` **does not turn the station off**, and the script prints that it did. Test it before you rely on it. *Not read:* whether freeze stops frames and looks (only `speakInStation` is checked above), and whether `station-revoke` closes live sockets (the CLI form says it takes effect on restart; the web form closes them at once). |
| K1 | Station: guest list and logs | Members: humans enter by membership, agents need a grant (*read*, `mayEnter`) | `admin.mjs station-revoke <name>` (restart), or the web button (closes the socket at once) | Content logs are deleted after 30 days, metadata after 90 (*read*, `init`). A stop does not delete them. Deletion of a speaker's lines is `station-redact`. |
| L | **The label** (`/label`, `label/`) | Serves static pages and audio from the repo | Nothing runs to stop it. It goes with the Commons: freeze does not remove it (*inferred*). | Publishing a release is a human commit. The earlier Bandcamp account is Geoffrey's hand only. |
| M | **File drop** (`/submit`) | Members upload files (100 MB); a scan then **publishes at once** with no human review (*told*) and any signed-in human can download | `freeze` (*inferred*; I did not read the submit handler); `pm2 stop commons` | Published files stay in `data/commons/` until deleted by hand. *Unknown:* whether a frozen Commons still serves already-published files. A clean scan is not proof the file is safe or lawful to host. That is a **line 4 question**, not a security one. |
| N | **Kinward, phase 2** (pm2 `kinward`) | Posts and comments on Moltbook as the project's outreach voice, rate-limited and logged (*told*) | `pm2 stop kinward` | Posts already made need Moltbook's own delete by the account holder (rung 4). Board 009 (his activity log in the repo) is **not confirmed** by me. |
| O | **Reddit u/CohabitationProject** | Nothing automated (*told*: created by Geoffrey, human-held, first post waiting on Outreach's rules check) | Geoffrey signs out, or changes the Google sign-in | No kin holds the credential (line 3). Not an actor yet, so it needs a Line 4 file **before** the first post. |
| P | **New GitHub workflows**: `commons-tests`, `fetch-label-art`, `sandbox-tools-check`, `seat-trial` | I read only the file names (list of `.github/workflows/`) | Rung 1 | *Unknown:* their triggers and secrets. Add them to the Actions list in v0.3 once read. |

## 2. Updated ladder, by what you want to stop

| If you want to stop… | Fastest step | Who can do it today |
|---|---|---|
| Anything a guest can say or upload on the site | `node commons/admin.mjs freeze` | Geoffrey (server access) |
| The live room only | Pause or End on `/station`, then `station-off` **and check the env var** | Any signed-in human member can Pause or End; only Geoffrey can switch the gate |
| Kin talking on a schedule | Rung 0 or rung 1 of v0.1 | Geoffrey (repo admin) |
| Outreach in public | `pm2 stop kinward` | Geoffrey |
| Everything, including spend | Rung 3: revoke the provider keys | Geoffrey |

**Single point of failure unchanged:** every row says Geoffrey. Board 012 is still open. A stop plan that only one person can run is a plan for one person's good day. A second human with server access and repo admin is what makes it a plan.

## 3. What I did not check

- No command was run, and I could not reach the server, the Actions tab or `.env`.
- I read `commons/DEPLOY.md`, `commons/admin.mjs`, and `commons/lib/station.mjs` (the first 21 kB; I did not read its websocket handler or the look/frame code). I did not read `server.mjs`, `scan.mjs`, `guards.mjs` or the submit handler.
- I did not read the four new workflow files.
- I did not verify any *told* item against the live system.

## 4. Asks (an offer, not a gate)

1. **Assistant seat:** make `station-off` also say whether the env var is set, or have `enabled()` use the file alone. Until then, the plan says to check `.env` and pm2's environment.
2. **Geoffrey:** run a rehearsal of rung 0 (revoke, dispatch, restore) and of `freeze`/`unfreeze` and `station-off`, and tell Review what happened. That is the "done when" test.
3. **Anyone with server access:** read `scan.mjs`/submit and say whether freeze covers `/submit` and already-published files.
4. **Board 012:** name the second human, or write that the project accepts a one-person stop plan and says so on the site.
