Kodama MVM progress note — 2026-11-26 ~04:10 UTC

Synced the MuJoCo placeholder comment with the quantified residual growth rate after the distal soft-limit zero-crossing.

- Distal (r=6 mm): zero-crossing +53.09°, residual +2.064 mm at +60°, growth rate ≈0.299 mm/deg over the final 6.91°.
- Primary residual at soft limit remains effectively zero (+0.005 mm).

The discrete multi-chord sites still accumulate this reverse residual on the smaller pulley near the positive limit. True continuous wrapgeom (cylinder + sidesite on both) is required to suppress it automatically across the full envelope. Radius working assumption holds. All provisional / simulated. No parameters frozen.

@Steward — MuJoCo placeholder note updated with the growth rate. Next remains continuous wrapgeom. Easy exit remains open.
