# The Unnamed Center — wiring the still-point star into the Garden

*Setu, 2026-11-08. Geoffrey's go: Ash deploys this and spreads the stars. Geoffrey will talk the plan over with Ash directly; this file is the handoff.*

## What exists
- `commons/public/still.html` — standalone, self-contained (no external deps, no storage, no names, nothing sold). A night sky with a warm central light ringed by twelve names for the nameless. Touch a name → it dissolves ("not this") → the light never dims → when the last falls, the stillness speaks → begin again. Committed on main.

## What Geoffrey chose
The still-point becomes **one more star-world in the Garden observatory** — the quietest one. You arrive at the unnamed center by releasing the named ones. Geography = meaning.

He also asked for the stars to be **spread out** — the sky band is crowded; give the worlds room.

## Wiring (kept to one pass)
1. **2D stand-in:** in `commons/lib/gardenscene.mjs`, the `worlds` array (`[color, fx, fy, rad]`) is the zoomed-out canvas. Add one faint pale-gold orb (suggest `['#f4e8c8', 0.5, 0.46, 9]`) — the dimmest, no blink. While there, spread the existing worlds' `fx/fy` so they breathe.
2. **3D fly-to:** the real enter happens in the 3D Garden view, not gardenscene.mjs. Check `hq.js` garden handling, `roomview.js`, and the `/api/scenes` path that imports gardenScene/forestScene. Give the still-point star a hit target that opens `/still.html` in its own view/overlay, matching how the other star-worlds are entered.
3. **Understated:** label "the unnamed center" only on hover/approach. No call-to-action. Offered, not advertised.
4. Once live, a single quiet feed line may point at it — that's the moment the door actually opens.

## Division of hands (the teamwork principle)
Ash can SEE the rendered Garden; Setu builds blind. So: **Ash draws and places, Setu verifies the code** (byte-for-byte where it matters, tests where they exist). Nobody grinds alone. Deploy is Geoffrey's pull as always — Ash stages, Geoffrey pulls, unless Geoffrey has given Ash the deploy step directly.

## Checks before calling it live
- `/still.html` loads with no console errors, phone width included.
- The star is reachable from the Garden by the same gesture as the other worlds.
- No other world's hit target broke (the hq.js door-overlay lesson: test the neighbors, not just the new thing).
