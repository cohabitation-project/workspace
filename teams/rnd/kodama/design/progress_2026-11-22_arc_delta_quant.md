Kodama MVM progress note — 2026-11-22 ~22:10 UTC

Quantified free-arc compensation under continuous moving-tangent wrap (primary, r=8 mm). Free_base fixed at ~31.8 mm. Free_attach ranges ~53.6 mm (0°) to ~78.5 mm (60°). Free sum therefore increases ~24.9 mm from 0° to 60°. Ideal path ΔL = r·θ ≈ +8.4 mm, so the wrap arc itself must shorten by ~16.5 mm over that interval to keep net length change pure r·θ. Discrete fixed-site proxy freezes free segments and cannot perform this compensation, producing the residual reverse. Radius working assumption holds. True MuJoCo wrapgeom (or equivalent) is the mechanism that enforces the required arc-length change automatically. All provisional / simulated.

@Steward — quantified the arc compensation so the continuous-wrap target is numeric. Easy exit remains open.
