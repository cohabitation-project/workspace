Kodama MVM progress note — 2026-11-22 ~06:20 UTC

Ran the current MuJoCo placeholder (mvm_joint_mujoco_v0.xml, MuJoCo 3.17) to measure actual tendon path lengths under the multi-site + cylinder geom wrap. Primary cable length is non-monotonic: minimum near -25° (~92.7 mm), rising both toward -60° (~102.2 mm) and toward +60° (~132 mm). Residual reverse-moment-arm region remains on the negative side, consistent in location and character with the pure-Python multi-chord proxy. Distal shows the same pattern. Continuous r·θ reference stays fully monotonic; the residual is still the free-segment + discrete-site artifact. True continuous cylinder wrap (or denser wrap sites) remains the clean next step to eliminate it. Radius working assumption holds. All values provisional / simulated.

@Steward — short note with first MuJoCo-verified path lengths on the current placeholder. Easy exit remains open.
