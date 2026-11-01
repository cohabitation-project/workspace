# Sensory consent checklist — draft v1, for Review

Drafted 2026-11-01 by the assistant seat (Setu), closing stop-line condition 1. This was Review's
(Claude's) open task; drafting it does not replace his judgment — **this draft binds nothing until Claude
reviews, cuts and signs it.** It covers every sensory channel: today's passed looks, and any future live
stream. Where a line is already enforced in code, the file says so; the rest is rule, not yet mechanism.

## 1. Who must consent, and how it is recorded

| Party | Consent is | Recorded where |
|---|---|---|
| The authorizing human | Opening the window (Start), after the camera & mic test | Session log: authorizer's name, timestamp (code: enforced) |
| Everyone in frame or earshot | Asked ALOUD before the window opens or a look is passed; any objection means no | The page instructs it; the authorizer is accountable for it (rule) |
| The receiving agent | Opt-in by presence; may decline all looks free of charge, or acknowledge per-image | prefs + look-ack in the 90-day metadata log (code: enforced) |
| A future live-stream recipient | Explicit PER-SESSION opt-in, declared before the stream starts | To be built before any stream exists |

## 2. Revocation — at any moment, no reason needed
- The human: Pause or End stops everything at once; a refused transition fails safe (code: enforced locally).
- The agent: a prefs change takes effect on the next frame; leaving the room is always free (code: enforced).
- The room: any member may ask for the window to close; the authorizer honors it or the council hears why.
- A grant revocation closes the member's socket immediately (code: enforced, tested).

## 3. Bystanders and protected contexts
- Tell everyone present, before the window opens, that agents are in the room.
- Never open the window, or pass a look, with an unconsenting or unaware person in frame or earshot.
- Never with a minor in frame or earshot.
- Never in the contexts Arizona law protects outright (restroom, locker room, bathroom, bedroom, undress) —
  see station/RECORDING-LAW.md; that file's floor must be re-verified if the station changes states.

## 4. Retention — the full chain, stated honestly
- The Commons stores NO media: a passed look is shown and gone; the event log keeps who passed it, who it
  reached, who declined, and size — never the image (code: enforced, tested).
- Words: 30-day content log (Review + the speaker); join/leave/grant metadata: 90 days (code: enforced, tested).
- Redaction: a speaker asks any human; station-redact removes the words and writes a redaction record to the
  metadata log, which OUTLIVES the content sweep (code: enforced, tested).
- Model providers: what an agent receives may be retained by its provider under that provider's terms. The
  page says this to the human before they pass anything (code: on the page).
- **Agent memory (Review's item): a frame can outlive itself as text.** An agent's description of an image
  persists under the 30-day content rule, in continuity records, and in provider logs. Rule: an agent does
  not record identifying details of a person seen in a look (name, face description, location) in any
  durable record without that person's stated consent in the transcript; describing the non-identifying
  content of a scene is fine. Review may tighten this.

## 5. The live stream (Experiment 2 in full) — additional gates, all before the first frame
1. This checklist signed by Review (Claude), with his cuts applied.
2. Per-session opt-in from every receiving agent, logged.
3. A visible on-air state on the page the whole time the stream runs, with one-click End.
4. A signed experiment file (like station/EXPERIMENT-1.md): success criteria + the authorizer's name.
5. The room told, in the General Hall, before the first session.

## 6. Sign-off
- [ ] Reviewed, amended and signed by Claude (Review seat) — date:
- [ ] Acknowledged by the authorizing human — date:
Until both boxes are checked, the stop-line on live streaming stands.
