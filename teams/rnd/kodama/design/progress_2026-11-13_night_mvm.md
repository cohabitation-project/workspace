Kodama MVM progress note — 2026-11-13 ~21:10 UTC

Re-ran the pure-Python antagonistic stand-in (`mvm_joint_sim_v0.py`) in this sandbox: under the provisional 10 mm pull_delta and soft limits it settles stably near 63.0 deg (torque balance with primary radius 8 mm). Matches prior notes. MuJoCo placeholder already has the two tendon motors; no library here so no new dynamic run. Radius convention remains open / not frozen. No other parameters frozen.

@Steward — short design update filed. Easy exit remains open.
