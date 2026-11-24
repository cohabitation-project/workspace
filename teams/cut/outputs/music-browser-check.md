# Music browser check (round 21, Claude) — MEASURED

Run: 2026-11-24 ~18:22Z. Fresh clone of main **3a85250** (includes music option A, d09d0773). Node v24.22.3, Chromium (system, Playwright-core driven) at 390×844, ffmpeg n9.0.2 (imageio-ffmpeg static), server booted with `COMMONS_FAKE_LLM=1` on a temp data dir.
Files: `teams/cut/outputs/2026-11-24T18-23-20/` — results.json (raw), alice-390.png, alice-after-export.png, cut_with_music.mp4, h.js (harness), ffprobe-stub.py.

## Results

| Check | Result | Label |
|---|---|---|
| `/cut/?videoId=<id>` signed in as alice, 390×844: label reads "Choose your music", visible | yes; `#music-wrap` not hidden; select is 358×44 px | measured |
| Select options | `No music`, `Alice tone` (only alice's one upload) | measured |
| Export with that track, trim 1–3.5 s, cover 1.5 s | `POST /api/cut/render` → **200** `{ok:true,url:/cut/cut_c9ac8548e8eae51d.mp4,seconds:2.5}`; request carried `music:{id:aud_65628dcd…,volume:0.7}` | measured |
| Output has an audio stream | yes (stream list: video 320×240 + audio) | measured, but by the stub below |
| Length within ±0.15 s of trim (2.5 s) | container 2.53 s (+0.03); decoded audio 2.50 s | measured |
| Music is actually in the mix | FFT of output audio: 440 Hz (source video tone) 2.89e7 and **880 Hz (alice's mp3) 1.92e7**. Same render with no music: 880 Hz = 437 (≈ noise). | measured |
| "Post it" link after export | visible, 98.6×44 px, href `/social?cut=<new video id>#compose` | measured |
| Second member (bobby, who has his own upload): select | `No music`, `Bobby tone` — **alice's track not listed** | measured |
| Signed out `/cut/` | `#music-wrap` stays hidden, only the "No music" option | measured |
| Signed-out `GET /api/cut/music` | 401 `{"error":"sign in to choose music"}` | measured |
| `GET /api/cut/music` as alice / bobby | each sees only own track, `source:"yours"`, no path key | measured |
| Render with someone else's track id (API, alice video + bobby's `aud_…`) | 403 `{"error":"that music is not yours"}` | measured |
| Bobby rendering alice's video with alice's track | 403 "that video is not yours" (video check fires first) | measured |

## Limits (say plainly)
- **The ffprobe is a stub** I wrote (parses `ffmpeg -i` stderr into the JSON the route's `parseProbe` expects). "Has an audio stream" and the 2.53 s in the table come from that stub, not real ffprobe. The audio decode (2.50 s, FFT) came from real ffmpeg and does not depend on it. Real ffprobe vs `parseProbe` is still unrun.
- The sandbox Chromium has no H.264; my fixture was VP9-in-mp4, so the preview plays but H.264 playback of the *export* was not tried.
- The preview `<video>` duration read `null` in my first reading (taken before metadata) — I did not re-read it after load in this run; the export worked with the trim values set by script, so I can't say from this run that the sliders' max follows the clip. (Last round's fix covers that; not re-measured here.)
- I set trim and cover by dispatching `input` events, not by dragging sliders. My first attempt used coverSec 0 and got 400 "coverSec 0 must lie inside the trimmed range 1..3.5": a harness mistake, but also a fact for the UI: if a user moves the trim past the cover frame without touching the cover scrub, does the editor correct coverSec? **Not tested.** Worth one case.
- One console "404" on every page: no response event named a URL; `GET /favicon.ico` is 404 on this server, so I think that's it. Inferred, not proven.
- Test member names, tones and a 4 s test-pattern clip are synthetic. No real label track, no production site, no phone.
- The selected music's volume slider was left at its default 0.7; volume effect was not measured beyond "880 Hz peak is present".
- Case "a member with no uploads" (no music control, no hint) not re-run; it is the Ash design call raised in round 20.

## Next
1. Ash: what a member with no uploads sees ("Upload a track to add music"?).
2. One test for the coverSec-outside-trim case (UI-side).
3. Real ffprobe run of `parseProbe` — still owed from round 18.
