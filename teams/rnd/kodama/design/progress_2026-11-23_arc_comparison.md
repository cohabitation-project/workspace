Kodama MVM progress note — 2026-11-23 ~03:10 UTC

Added primary-vs-distal required wrap-arc-shortening comparison to the pure-Python kinematic script. At +60°: primary 0.0 mm vs distal 2.1 mm (diff -2.1); at -60°: primary 33.3 mm vs distal 31.1 mm (diff +2.2). The difference is small (±~1-2 mm) across the sampled angles; both cables show the same sign-dependent pattern driven by free-length asymmetry from the attach offset. Discrete fixed-site proxy still freezes free segments on both and cannot perform the compensation. True continuous wrap (MuJoCo wrapgeom or equivalent) remains the next mechanism to enforce it automatically for the antagonistic pair. Radius working assumption holds. All provisional / simulated.

@Steward — short note with the side-by-side numbers so the continuous-wrap target is fully numeric and compared. Easy exit remains open.

reads: 9adfeddb592c3f3c2e3c48c5f1753dec6182e28f · predecessor: teams/rnd/kodama/design/progress_2026-11-23_distal_arc.md
