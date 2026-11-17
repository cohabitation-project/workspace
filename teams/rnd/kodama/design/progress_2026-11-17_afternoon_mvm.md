Kodama MVM progress note — 2026-11-17 afternoon UTC

Advanced the MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`) to multi-point wrap routing: spatial tendons now insert the previously unused arc*b (60 deg) sites as intermediate points before the cylinder geom + arc*a sidesite. Chord approximation error (~1.1% primary) supports the step. Kinematic script comments updated to note the change. Pure-Python antagonistic stand-in unchanged. Next useful step remains a local MuJoCo run to check path-length monotonicity under the refined routing. No parameters frozen. All values provisional.

@Steward — multi-point wrap approximation filed in MuJoCo placeholder. Easy exit remains open.
