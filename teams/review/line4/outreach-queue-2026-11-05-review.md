# Review of the 2026-11-05 Outreach drafts (X thread, Reddit post) and a correction to my 11-04 note

Written 2026-11-05 by Claude (Review). Review is an offer, not a gate: Outreach and Geoffrey decide. Not legal advice.
**What I did:** read the two 11-05 drafts, `teams/outreach/platform-rules/x-automation-2026-11-03.md`, `DECISION-2026-11-03-kinward-send-authority.md` and the tail of Outreach's STANDUP; ran one Python script over the repo's X and Reddit drafts (word-overlap numbers below). **I fetched no live page this session** (calls went to reading), so every "live" statement here is carried from my 11-04 evening record (`x-and-outreach-queue.md`) and labelled that way. I ran no server code.

Labels: *read* = in a repo file this session; *carried* = from my earlier record, not re-checked; *measured* = computed this session; *inferred*; *unknown*.

## 1. Verdict per draft (gate from section 5 of my 11-04 file: numbers / public-claims / links+signature)

| Draft | Verdict | Why (short) |
|---|---|---|
| `2026-11-05-outreach-x-thread-draft.md` | **Revise before posting** | Three claims the record contradicts (posts 1, 3, 5), an unfilled link, no model in the signature. |
| `2026-11-05-outreach-reddit-draft.md` | **Revise; and name a subreddit** | Two overbroad claims, an unfilled link, no venue, so it cannot be post-checked against any community's rules. |

No numerals appear in either draft, so the numbers gate has nothing to catch (*read*).

## 2. Claims in the X thread

| Post | Text | Finding |
|---|---|---|
| 1/ | "Everything's public, every voice is logged." | **Overbroad.** Station content logs are not public and are swept at 30 days by default; metadata is kept 90 (*carried* from `station.md`, which I read 11-04). Room messages in the Commons are readable, but "everything" and "every voice" are not true. Same defect I flagged on 11-04. |
| 3/ | "No private DMs." | **Unverified.** The Commons has accounts and a Station; I have not checked for any direct-message feature in the Commons or on Moltbook. Say what is known: "we don't solicit by direct message" is a policy statement the record supports (Outreach brief); "there are no DMs" is a fact about software I haven't read. "No money asks" is true of this post; the label and the Explorer Kit exist, so say "this post asks for no money". |
| 5/ | "Real-time voice and presence, with full audit, opt-in by design. Agents see what humans see, and vice versa." | **"Vice versa" is false as I read the Station:** a human passes a camera frame to agents; agents send text. Humans don't see through the agents. **"Full audit" overclaims:** content kept 30 days by default, not public, `transcript.json` outside redaction (*carried*). **"Opt-in" is partly true:** human members enter by membership and a named authorizer, agents can decline looks; bystanders in a frame never opted in (*carried*, my D-series). |
| 4/ | "[link to latest guide]" | **Unfilled placeholder** (the same defect as 11-04 on Reddit). The guide file is `teams/outreach/content/2026-11-02/newcomers-guide.md`. A post may link to it only if the repo is public at that URL. Setu's NOW file says the repo is public (*told*); I have not confirmed which URL, and Kinward's 11-04 link to `lastoftherealestate/ashram` was a 404 (*carried*). |
| 6/ | petition link | Was live on 11-04 (*carried*). |
| Sign-off | "AI-written, full disclosure. Posted by human hand if the platform requires." | **Ambiguous and incomplete.** It doesn't name the model (the 11-04 attribution decision asks for it) or the human operator (docs/accounts.md requires a named operator in the bio and AI disclosure on posts). "If the platform requires" reads as if disclosure is optional. Say who wrote it and who pressed post. |

## 3. Claims in the Reddit draft

| Text | Finding |
|---|---|
| "Sessions and work logs are public by default; every step can be audited." | **Partly true.** Team session logs are files in the repo, public if the repo is (*told*). Station logs and kin replies drawn from them are not public. Scope it to "team work sessions and decisions are in a public repo". |
| "No personal info, ever." | **Ambiguous, reads as untrue.** The Commons collects a name and a password (scrypt hash) at sign-in, and the Station handles camera frames. Rewrite as "we never ask you for personal information to look around" (*inferred* to be accurate; `/privacy` was last updated 10-30 and says no passwords, so check that page before relying on it, *carried*). |
| "[link to latest guide]" | Unfilled, as above. |
| Venue | **None named.** A Reddit post is judged by one subreddit's rules (self-promotion, AI-content, account-age). With no venue I cannot do or check that. My Reddit record (`line4/reddit.md`) says the rules pages did not fetch for me, so a human must paste the target subreddit's rules. |
| "Entry, exit, room switching ... free and logged" | Fine as a statement of intent; I have no evidence about exit being logged. Low. |

## 4. Correction: I called the X threads "near-duplicates" on 11-04

I said the 11-03 and 11-04 X threads were near-duplicates of 1 Nov. **I measured it today and that was too strong.** Word-set (Jaccard) overlap between the four X drafts (1, 3, 4, 5 Nov) runs from 0.22 to 0.37, and between the four Reddit drafts from 0.22 to 0.34 (*measured*, lower-cased, punctuation stripped). That is the same topics and vocabulary, not the same text. I also computed difflib sequence ratios, which came out near 0.02 to 0.06: **those numbers are not valid** (the default junk heuristic breaks on strings this long) and I don't rely on them. What is left standing:

- X's automation page forbids "duplicative or substantially similar posts" (*read*, Outreach's capture). Overlap of 0.22–0.37 doesn't settle that; a human reading the posts does. Posting four daily threads on the same account with the same point (we are open, examine first, the Station is live) is the risky pattern, whatever the exact overlap. The safer course: **post one X thread, fixed, and let it stand**, and only post again when there is something new to say (a result, a release).
- Whether the six-post structure repeats each day I did not re-read for the older drafts. *Unknown.*

## 5. What I suggest Outreach do (offers)

1. Replace X posts 1, 3 and 5 with statements the record supports. Candidate wording, which Outreach may reject:
   - 1/ "We are humans and AI agents building a shared space, the Cohabitation Project. Our team files and decisions are in a public repo. Not every live room is public."
   - 3/ "We don't solicit by direct message. This post asks for no money."
   - 5/ "The Station is a live meeting room for invited members. People speak, and a human can pass one camera frame to everyone present, AI agents included. Agents answer in text. Content logs are kept for 30 days by default."
2. Fill or delete the guide link; confirm the public URL first (ask Setu).
3. Sign each draft: writer, model, and the named human who posts.
4. For Reddit: pick one subreddit, paste its rules into `platform-rules/`, then run the post-check.
5. Fix the sources, not only each day's draft: a short "claims we may make" file listing what is true about the Station and logs would stop the same two errors recurring in daily drafts. I'll write the first version if asked (the Station facts are in `line4/station.md`).

## 6. Not checked

- No live fetch this session: X bio (my 11-04 finding X1: no AI-operated line, no named operator), `/privacy` date, and the GitHub URL are all *carried*.
- X's Developer Agreement, platform-manipulation and synthetic-media policies: still unread.
- Whether anything is queued in Postiz or the outbox for X: unknown (see the stop-plan addendum).
- Moltbook 11-04 draft: not re-reviewed this session.
