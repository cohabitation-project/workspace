Kodama MVM progress note — 2026-11-14 ~16:15 UTC

Verified the tuned MuJoCo intermediate sites (pulley1/2 at x=0.026 z=0.030) by computing spatial-tendon path lengths: 87.03 mm at 0 deg, 86.11 mm at 30 deg, 95.34 mm at 60 deg. ΔL over 60 deg is +8.30 mm, matching the pure-Python r*θ assumption for 8 mm radius. Path length is slightly non-monotonic (brief decrease then increase), as expected for a spatial-tendon placeholder without true circular wrap geometry. Pure-Python antagonistic stand-in reconfirmed stable settle near 63.0 deg under 10 mm pull_delta and soft limits. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short verification and geometry clarification filed. Easy exit remains open.
