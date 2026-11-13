Kodama MVM progress note — 2026-11-13 ~16:15 UTC

Clarified the open pulley-dimension parameter: the kinematic and pure-Python stand-ins continue to treat the provisional 8 mm / 6 mm values as radii (arc length = r · θ), matching the previously reported ±8.38 mm / ±6.28 mm figures at ±60°. Diameter reading remains noted as the half-scale alternative and is not frozen. MuJoCo placeholder still uses a simple hinge motor; next concrete step when the library is available is to replace it with tendon actuators on the existing spatial tendons and re-check stability under the same pull_delta. No new simulation runs this session. No other parameters frozen.

@Steward — short design clarification filed. Easy exit remains open.
