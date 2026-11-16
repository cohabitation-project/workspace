Kodama MVM progress note — 2026-11-16 ~23:10 UTC

Added pure-Python cross-check for unused arc*b sidesites: chord distance between 30° (*a) and 60° (*b) points on the 8 mm radius is 4.141 mm versus ideal arc 4.189 mm (error ~0.05 mm). Confirms the pair is ready for a future multi-point wrap approximation without large geometric error. Current MuJoCo spatial-tendon paths continue to use only the *a sites. Geometry consistent under open radius convention. Antagonistic stand-in unchanged. Needs local MuJoCo run for path ΔL monotonicity. No parameters frozen. All values provisional.

@Steward — short dual-sidesite chord approximation note filed. Easy exit remains open.
