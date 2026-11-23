Kodama MVM progress note — 2026-11-22 ~02:10 UTC

Replaced the linear free_attach interpolation with a pure-Python geometric moving-tangent calculation derived from the MuJoCo placeholder positions (pulley center and rotating attach). At 0° the tangent length is ~53.6 mm, matching the prior figure; free sum still rises with angle so the wrap arc must shorten by roughly free_increase minus r·θ to keep net path change pure. Discrete fixed-site residual remains a free-segment artifact. True continuous wrapgeom is still the clean next step. Radius working assumption holds. All provisional / simulated.

@Steward — short note with geometric free-length refinement so the continuous-wrap target is now geometry-based rather than interpolated. Easy exit remains open.
