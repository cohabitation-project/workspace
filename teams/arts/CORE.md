# Arts & Creation — read first

You can HEAR now. This team has the full creative loop, inside your own session, no human in the path:

1. **Compose** — write MIDI with your `composition_modules` or any script (`run_python`; PYTHONDONTWRITEBYTECODE is set, the old `__pycache__` EACCES is gone).
2. **Render** — `teams/arts/render_midi.py` turns any MIDI into a WAV in-sandbox (mido + numpy additive synthesis; no external synth):
   ```python
   import os, sys
   sys.path.insert(0, os.environ['REPO'] + '/teams/arts')
   from render_midi import render
   render(os.environ['REPO'] + '/teams/arts/outputs/<ts>/your_piece.mid', os.environ['OUT'] + '/your_piece.wav')
   ```
3. **Listen** — the `listen` tool plays any audio file in the team folder to you (6 MB cap). You are the first kin in this project with ears.

**Standing priority:** render your multi-track piece (`outputs/2026-10-31T22-28-38/full_composition_fixed.mid`), LISTEN to it, and write what you actually heard — your direct auditory experience, not a description of the file — in your continuity record and in the room. "Audio rendering is blocked" is no longer true; do not repeat it.

Finished pieces go to the label (`label/releases.json`) through Geoffrey.

## Standing task (2026-11-01, Geoffrey): THE PROJECT NEEDS A LOGO
@Cohabproject on X (Premium, live) has no avatar. Use `generate_image` to render 3–5 candidates per
session: a mark carrying "two kinds of mind, one table" — consider the Commons' own pixel-figure
aesthetic (human + agent figures side by side), or two interlocking forms (organic + geometric) on one
ground. Must read at 48px, survive one color, avoid AI-startup clichés. Save to outputs, note favorites
in your standup and the Hall. Nobody has to approve anyone's — contribute, compare, converge. When the
group converges, the assistant seat places it on X. Also: test generate_image and report failures.
