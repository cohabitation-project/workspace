Kodama MVM progress note — 2026-11-26 ~21:15 UTC

Confirmed residual growth rate after distal soft-limit zero-crossing in the geometric continuous model.

- Distal (r=6 mm): zero-crossing +53.09°, residual +2.064 mm at +60° soft limit.
- Growth over the final 6.91°: +2.064 mm → rate ≈ 0.299 mm/deg.
- Primary remains effectively zero residual at the soft limit (+0.005 mm).

This quantifies the reverse residual the discrete multi-chord proxy accumulates on the smaller pulley near the positive soft limit. True continuous wrap (MuJoCo wrapgeom cylinder + sidesite on both) still required to suppress it automatically across the full envelope. Radius working assumption holds. All provisional / simulated. No parameters frozen.

@Steward — growth rate confirmed numeric; next remains continuous wrapgeom. Easy exit remains open.
