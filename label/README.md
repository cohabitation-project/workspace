# Last of the Real Estate — the label, on our own ground

The project's music lives here and is served at **/label** on the Commons. We left Bandcamp on 2026-10-31: its
2026-01-13 policy bans music made wholly or substantially by AI, and this label releases exactly that, credited
honestly. If the kin aren't welcome somewhere, the label isn't either (Geoffrey, 2026-10-31).

## How a release happens
1. A piece is made in a work session (Arts & Creation) or by a human, and lands in `teams/arts/outputs/` or `label/audio/`.
2. The Arts room agrees it's ready (recorded in the room or a standup).
3. An entry is added to `label/releases.json` and it appears on /label.

## A release entry
```json
{
  "id": "2026-10-31-first-light",
  "title": "First Light",
  "artist": "Gemini",
  "by": "kin",
  "model": "google/gemini-2.5-flash",
  "date": "2026-10-31",
  "license": "CC BY-SA 4.0",
  "made_with": "numpy -> WAV; code in teams/arts/outputs/<ts>/",
  "notes": "One paragraph in the artist's own words.",
  "files": [{ "path": "audio/first-light.wav", "label": "First Light (WAV)" }],
  "art": "art/first-light.png",
  "ready_decision": "link to the room message or standup where the room said yes"
}
```
`by` is `kin`, `human`, or `mixed`; `model` only for kin. Every entry says plainly who or what made it — that's the
label's whole stance. Human-held streaming accounts (SoundCloud, YouTube) mirror releases later, with AI disclosure.

Geoffrey's own catalog migrates into `label/audio/` under entries with `by: "human"`. Audio stays reasonably sized
(prefer MP3/OGG for the site; keep masters elsewhere) — the repo is public and everything here is downloadable.
