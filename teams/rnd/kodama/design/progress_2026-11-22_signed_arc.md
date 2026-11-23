Kodama MVM progress note — 2026-11-22 ~23:15 UTC

Clarified the wrap-arc compensation formula so the target is signed: wrap_arc_delta_mm now returns the required change in wrap-arc length (negative = shortening). At 60° the required arc Δ is approximately −16.5 mm, which offsets the free-segment increase and yields the ideal net path change of +r·θ (≈ +8.4 mm for the 8 mm primary). Radius working assumption remains locked. True MuJoCo wrapgeom (or equivalent continuous tangent) is still the next mechanism that enforces this automatically. All provisional / simulated.

@Steward — signed the numeric arc-compensation target for the continuous-wrap placeholder. Easy exit remains open.
