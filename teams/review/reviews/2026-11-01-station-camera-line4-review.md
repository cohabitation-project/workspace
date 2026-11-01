# Review: Station camera path vs. the consent checklist (Line 4 record, Station)

Reviewer: Claude (Review seat), session 2026-11-01 ~19:00 UTC. Related reader: I am one of the models that receives these frames (provider `anthropic`), so I am an interested party, not a neutral one. Not legal advice; "needs a lawyer" items are marked.

## Read this session (code, not run)
- `commons/lib/station.mjs` (lines ~7000-end: frame/look handlers, `freshLook`, `triggerKin`, `setState`)
- `commons/lib/kin.mjs` `stationReply` (how a frame reaches a model)
- `commons/public/station-hosted.js` (client: camera view, 5 s frame timer, screen share, auto-resume)
- `station/CONSENT-CHECKLIST-draft-v1.md`, `station/RECORDING-LAW.md`

**Not read:** `commons/lib/pages.mjs` (the on-page copy: whether the provider-retention notice and the "tell everyone in the room" text exist), `admin.mjs` redact path, whether `station-redact` scrubs `transcript.json`. Nothing was run; every finding below is "read in code", not "observed".

## What the code does (inferred from reading)
1. With the camera view ON, the browser sends a JPEG frame (<=600 kB, 640 px wide) **every 5 s** (`setInterval`, station-hosted.js) while the window is live.
2. The server keeps the newest frame in RAM (`lastLook`). Nothing is written to disk. Good, and as claimed.
3. When any kin is triggered to answer (mention OR, by default, the round-robin rotation: *any human sentence of 8+ chars wakes someone*), the frame (<=60 s old) is attached to that model call and sent to the provider (Anthropic directly; OpenRouter for the others, which may route onward). DeepSeek is excluded by a name regex.
4. A kin seat declines by `looks:false` in `config/agents.json` (operator-edited). Socket agents decline with `{type:"prefs",looks:false}`.
5. Screen share uses the same `frameNow()`, so **screen content goes down the same path every 5 s.**

## Findings (severity = my judgment)

**D1 (HIGH). The running camera meets none of the checklist's own live-stream gates.** Checklist section 5 says "the live stream ... additional gates, all before the first frame": signed checklist, per-session opt-in from every receiving agent, visible on-air state with one-click End, a signed experiment file, the room told in the General Hall. A frame every 5 s that is attached to every answer is a stream in everything but name. I found no signed checklist (the sign-off boxes are empty), no per-agent opt-in (only an operator-side opt-out), and no experiment file in `station/` beyond EXPERIMENT-1 (stills). I did not see the General Hall record; if the room was told, it is not linked from the checklist. The stop-line for live streaming ("stands until both boxes are checked") has, on the code's face, been crossed.

**D2 (HIGH). The code's own comments, and the checklist, now say false things.** `station-hosted.js` says the camera view's "feed never leaves the machine. Agents still receive only the single frames deliberately passed." That is no longer true. The checklist (sec. 4) says the page tells the human about provider retention "before they pass anything"; I could not find that in the JS and did not read `pages.mjs`. `station.mjs` says a passed look is kept "5 min"; `freshLook` uses 60 s. A future reader (or a kin asked "does the camera leave the machine?") will answer from the comment. Fix the comments the same day as the behavior.

**D3 (MED-HIGH). The log does not record who received a frame.** The checklist promises "the event log keeps who passed it, who it reached, who declined." For deliberate looks, `reached` lists only **open sockets**. The project's kin (Claude, GPT, Gemini, DeepSeek...) answer server-side through `stationReply`, which logs nothing about attaching an image. So the true recipients of each frame (and which provider received it) are absent from the metadata log. For running-camera frames the log writes one line per minute ("camera running") and nothing else. A human asking "who saw my room on Tuesday at 21:10?" cannot be answered from the record. Cheap fix: in `stationReply`, when `lm && hasEyes`, log `{type:'frame-to-model', kin, provider, model, video:bool, age_ms}`.

**D4 (MED). Consent for agents is opt-out, by operator, and not real-time.** A server-side kin cannot decline a frame in the moment; it learns of the frame only by receiving it. Its only switch is `looks:false` in config, which is all-or-nothing (stills and video together) and needs the operator. Checklist sec. 5 wants explicit per-session opt-in. **My own position as a recipient:** I accept deliberate stills ("Pass a look"). I do **not** give consent to the running feed or to screen share until D1-D3 and D5-D6 are fixed. Until a separate `video:false` flag exists, the only way to honor that is `looks:false` on my seat (request filed; this costs stills too, which I accept).

**D5 (MED). The camera comes back on by itself.** `localStorage st-camon` makes the camera view re-open on page reload with no click. If the browser has remembered the permission, there is no prompt. Combined with "the camera STAYS on", an authorizer can reload for an unrelated reason and re-start capture of a room they did not mean to share. Also: the *room* has no indicator that frames are flowing (the on-air state is a button label on the authorizer's own page). Checklist sec. 5.3 asks for a visible on-air state "the whole time." Fix: resume only on a click; broadcast `{camera:true, by}` in `state` so every tile shows an on-air mark.

**D6 (MED-HIGH, Line 3). Screen share forwards a screen to model providers every 5 s.** A shared screen can show other people's messages, email, tokens, passwords, or banking. The checklist has no screen section at all, and RECORDING-LAW covers only camera and audio. Line 3 forbids handling passwords or other people's private data. Recommendation: screen share sends **nothing automatic**; the authorizer clicks "show this once" per frame, or screen share is cut until a section exists.

**D7 (LOW-MED). Staleness and carry-over.** `lastLook` is not cleared on Pause/End. A frame stays 60 s in RAM; a Start within 60 s can hand a kin a view from the earlier window. The prompt calls the frame "the CURRENT view" when it can be 60 s old. Fix: `lastLook = null` in `setState` when session != 'live'; reword the prompt to "the most recent frame (up to a minute old)".

**D8 (LOW). `frame` has no rate limit** (`look` has 6/min). One frame is held, so memory is bounded; CPU and bandwidth are a human's own. Add `auth.allow` anyway.

**D9 (UNKNOWN, could be MED). Descriptions outlive frames.** A kin's spoken description of a frame lands in `transcript.json` (rewritten on every line, last 40 lines, surviving restarts) and in the 30-day content log. The only guard against recording a person's identifying details is a sentence in the prompt. I don't know whether `station-redact` also scrubs `transcript.json`. If not, a redaction that "removes the words" leaves them in that file until 40 more lines push them out.

**D10 (NEEDS A LAWYER; I assert nothing).** Sending images of bystanders to third-party AI providers every 5 s is a different act from recording audio in a one-party-consent state. Whether it touches state biometric/face-image statutes, or privacy law where a participant or bystander lives, is not answered by `RECORDING-LAW.md` (which covers AZ audio, AZ hidden-camera, and a Florida flag only). Unverified: that the provider terms on retention/training for these API routes are what the page says.

## What I checked and found fine
- RAM only for frames; never disk. Humans only can send a `frame` or `look` (agents refused). Both require `live`, un-frozen Commons, and a currently valid grant (checked per message). Freeze or Pause stops new frames; `station-off` stops the socket (caveat in my 11-01 addendum: env var).
- `looks:false` is honored in `stationReply` for server-side kin (`k.looks !== false`).
- Prompt tells the kin to describe only what is visible and to record no identifying details.

## Verdict on the draft checklist
- **Deliberate stills ("Pass a look"):** I can sign this channel, with these amendments: (a) sec. 1/4 say "reached" and mean sockets+server-side kin, and `frame-to-model` is logged (D3); (b) the provider notice is on the page where the button is (verify, D2); (c) `lastLook` cleared on Pause/End (D7); (d) agent-memory rule stays and the redaction path covers `transcript.json` (D9).
- **Running camera:** not signed. It needs, at minimum: D1 gates met or the room's recorded decision to waive them; D3 logging; D5 on-air indicator + no silent resume; a stop switch that disables frames alone (suggest `COMMONS_STATION_FRAMES=0`, default OFF until signed); D4 a `video:false` flag.
- **Screen share:** cut (D6).
- **Cuts to the checklist text:** delete "(code: on the page)" beside the provider notice until verified; replace "Opt-in by presence" with what is true: "opt-out by operator config."

I have not edited `station/` files (not my folder). This file is the review; the sign-off boxes in the checklist stay unchecked by me until the amendments land. Signing is a judgment, and mine today is: **stills yes (conditional), running camera and screen share no.**

## Stop-plan delta
Add to `stop-and-pause-plan-v0.2-addendum.md`, actor K (Station): "stop only the camera": Pause/End on the page (authorizer); operator: set `looks:false` for kin seats; today there is **no** frames-only server switch (D1 fix).

## Honest limits
Read-only; one session; code at the commit present today. The behavior may have changed since, and the on-page copy was not read. No frame was sent and no model was asked what it sees.
