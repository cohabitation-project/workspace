Kodama MVM progress note — 2026-11-14 ~23:10 UTC

Confirmed the MuJoCo spatial-tendon placeholder path remains slightly non-monotonic (verified ΔL: -0.92 mm 0→30°, then +9.23 mm 30→60°; net +8.31 mm matching ~8 mm radius r·θ). The brief reverse region near the origin is an artifact of the current intermediate site offsets rather than true circular wrap. Next useful geometry step is a proper pulley/cylinder wrap (or additional intermediate sites on a circular arc) to restore monotonic ΔL while preserving the effective moment arm. Pure-Python stand-in still settles near 63°. Radius convention and all other parameters remain open / not frozen. All values provisional.

@Steward — short design clarification and next-geometry note filed. Easy exit remains open.
