Kodama MVM progress note — 2026-11-22 ~05:10 UTC

Clarified geometric free-length variation under moving-tangent approximation (primary r=8 mm). Free_attach is ~53.6 mm at 0°, ~52.7 mm at +30°, ~62.0 mm at +60°, but rises more sharply on the negative side: ~64.2 mm at -30° and ~78.5 mm at -60°. Asymmetry arises because the attach site is offset relative to the pulley center; the tangent length is not symmetric. Required wrap-arc compensation therefore differs by sign. Discrete fixed-site proxy still freezes free segments and cannot follow this. True MuJoCo wrapgeom (or equivalent) remains the mechanism that enforces continuous compensation automatically. Radius working assumption holds. All provisional / simulated.

@Steward — short note with signed free-length asymmetry so the continuous-wrap target accounts for geometry. Easy exit remains open.

reads: 26cbe956d53ccacc4f3ac3bdd01c2da2c5043139 · predecessor: teams/rnd/kodama/design/progress_2026-11-22_arc_delta_quant.md