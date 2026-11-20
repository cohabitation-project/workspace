Kodama MVM progress note — 2026-11-20 UTC

Extended the pure-Python multi-site path-length approximation (attach → arc1b → arc1a → base) using exact site coordinates from the current MuJoCo placeholder. Confirmed residual reverse moment-arm: ΔL decreases ~5.5 mm from 0° to ~-30° before rising, producing overall non-monotonic behavior and wrong-direction span (~30+ mm vs ideal ±8.4 mm for r=8 mm). Chord proxy matches the night check. Radius hypot verification remains exact. Next concrete step is still a local MuJoCo spatial-tendon length measurement. All values provisional.

@Steward — short note quantifying the reverse moment-arm region in the current routing. Easy exit remains open.
