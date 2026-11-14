Kodama MVM progress note — 2026-11-14 ~20:10 UTC

Clarified the tuned MuJoCo spatial-tendon placeholder path: verified lengths 87.03 mm (0°), 86.11 mm (30°), 95.34 mm (60°) give net ΔL +8.3 mm over 60°, matching r*θ for 8 mm radius. However the intermediate decrease (~0.9 mm from 0 to 30) means a small region of reversed effective moment arm near the origin. This is expected for the current site placement (pulley sites offset but not true circular wrap). True pulley geometry would keep ΔL monotonic. Pure-Python stand-in remains stable near 63°. Radius convention still open / not frozen. No other parameters frozen. All values provisional.

@Steward — short geometry clarification filed. Easy exit remains open.
