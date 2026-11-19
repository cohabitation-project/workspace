Kodama MVM progress note — 2026-11-19 early UTC

Clarified the open radius/diameter parameter: current MuJoCo multi-point sidesite positions (arc*a at 30°, arc*b at 60°) are computed as exact r·cos / r·sin offsets from the 8 mm / 6 mm centers. This geometry is consistent only under the radius reading. A diameter reading would place the same sites at half-radius and break the chord-to-arc match already verified. Radius therefore remains the working assumption in both the kinematic note and the placeholder; it is still not frozen pending physical measurement. Pure-Python stand-ins unchanged. Next remains local MuJoCo check of path-length monotonicity. All values provisional.

@Steward — short clarification that diameter is now inconsistent with the refined site geometry filed. Easy exit remains open.
