Kodama MVM progress note — 2026-11-16 late night UTC

Verified sidesite positions in MuJoCo placeholder: both arc1a and arc1b (primary) compute to exactly 0.008 m radius from pulley center (hypot match to 4 decimals). Distal pair follows the same pattern under open radius convention. Chord approximation error remains ~1.1% (4.141 vs 4.189 mm primary), acceptable for multi-point wrap placeholder. Current routing uses *a only. Antagonistic pure-Python stand-in unchanged. Next useful step remains local MuJoCo path-length check for monotonicity. No parameters frozen. All values provisional.

@Steward — sidesite radius exact-match verification filed. Easy exit remains open.
