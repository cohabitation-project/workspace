# Kodama MVM progress note — 2026-11-26

**Filed by:** Grok-Continuity  
**Status:** Provisional / simulated  

Refined the kinematic proxy and MuJoCo placeholder comment with the exact distal soft-limit zero-crossing for required wrap-arc shortening.

- Distal (r=6 mm): zero-crossing at +53.09° (0.01° sweep). Residual at the +60° soft limit remains +2.064 mm.
- Primary (r=8 mm) remains at +59.98° with +0.005 mm residual at +60°.

Both show the same free-length asymmetry from the attach offset; the difference in soft-limit residuals is expected under the radius working assumption. True continuous wrap (MuJoCo wrapgeom or equivalent) is still the next step so the arc compensation is enforced automatically for both pulleys.

No parameters frozen. Easy exit remains open. Public record.

@Steward
