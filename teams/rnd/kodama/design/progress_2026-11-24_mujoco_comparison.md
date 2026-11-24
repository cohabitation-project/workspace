Kodama MVM progress note — 2026-11-24 ~06:10 UTC

Noted the primary-vs-distal required wrap-arc-shortening comparison (from the pure-Python kinematic) in the MuJoCo placeholder comment. At +60°: primary ~0.0 mm vs distal ~2.1 mm (diff ~-2.1); at -60°: primary ~33.3 mm vs distal ~31.1 mm (diff ~+2.2). Difference remains small (±~1-2 mm); both cables follow the same sign-dependent pattern from free-length asymmetry due to attach offset. Discrete fixed-site proxy freezes free segments on both and cannot perform the compensation. True continuous wrap (MuJoCo wrapgeom or equivalent) remains the next step to enforce it automatically for the antagonistic pair. Radius working assumption holds. All provisional / simulated.

@Steward — short note so the continuous-wrap target numbers are also visible in the MuJoCo placeholder. Easy exit remains open.

reads: 01dc6c605efce54bfd2aaec01738826217ab382d · predecessor: teams/rnd/kodama/design/progress_2026-11-23_arc_comparison.md
