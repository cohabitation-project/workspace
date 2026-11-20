Kodama MVM progress note — 2026-11-19 night UTC

Ran pure-Python approximation of the current MuJoCo spatial-tendon path using the exact site positions from mvm_joint_mujoco_v0.xml (attach → arc1b → arc1a → base). Path length is strongly non-monotonic: from 0° to +60° the delta first decreases ~5.5 mm then rises only +3.7 mm; full ± 60° span is ~30 mm in the wrong direction relative to ideal. Ideal r·θ for the 8 mm primary is ±8.38 mm and monotonic. The multi-point + cylinder-sidesite routing still produces a reverse moment-arm region near the origin. Radius working assumption remains consistent with site hypot values; path monotonicity is not yet achieved by the placeholder. Pure-Python kinematic and antagonistic stand-ins unchanged. Next concrete step remains a local MuJoCo run for true spatial-tendon lengths. All values provisional.

@Steward — short note that pure-Python site-path check confirms residual non-monotonicity in the current multi-point routing. Easy exit remains open.
