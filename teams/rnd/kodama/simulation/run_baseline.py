#!/usr/bin/env python3
"""Kodama leg_v0 headless baseline.

Loads a MuJoCo model of a tendon-driven leg, runs it with no viewer, logs joint and
tendon signals to CSV, prints a short summary, and exits nonzero if the simulation
goes unstable.

Controller (deliberately simple, a placeholder):
  1. Each joint follows a smooth sinusoidal angle target.
  2. A PD law plus gravity/Coriolis feed-forward gives the joint torques we want.
  3. Those torques are turned into cable tensions for the antagonistic pairs, using the
     live tendon moment arms from MuJoCo (so routing changes in the XML are picked up
     automatically). Every cable keeps a small pretension so it never goes slack, and
     tensions are clipped to [0, max] because cables can only pull.
  4. Tension -> motor spool torque via the actuator gear (ctrl = tension / |gear|).

Exit codes: 0 = ran cleanly, 2 = unstable (NaN/Inf, huge velocity, or a MuJoCo
instability warning), 1 = other error (e.g. model failed to load).
"""

from __future__ import annotations

import argparse
import csv
import math
import sys
from pathlib import Path

import mujoco
import numpy as np

HERE = Path(__file__).resolve().parent
DEFAULT_MODEL = HERE / "models" / "leg_v0.xml"
DEFAULT_OUT = HERE / "out" / "baseline_metrics.csv"

# ---- Controller placeholders (tune these, they are not derived from anything) ----
TRAJ_FREQ_HZ = 0.5          # sinusoid frequency for both joints
HIP_AMPL = 0.6              # rad (~34 deg) around 0
KNEE_MID, KNEE_AMPL = 0.9, 0.6   # rad: knee swings 0.3 .. 1.5 rad (~17 .. 86 deg)
RAMP_S = 0.5                # fade the motion in over this long to avoid a start-up kick
KP = {"hip": 1.5, "knee": 0.8}     # N*m/rad
KD = {"hip": 0.05, "knee": 0.02}   # N*m*s/rad
PRETENSION_N = 2.0          # every cable is held at least this taut (N)

# Instability thresholds
MAX_ABS_QVEL = 1e3          # rad/s; a 0.2 m leg spinning faster than this is broken
UNSTABLE_WARNINGS = (
    mujoco.mjtWarning.mjWARN_BADQACC,
    mujoco.mjtWarning.mjWARN_BADQPOS,
    mujoco.mjtWarning.mjWARN_BADQVEL,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--model", type=Path, default=DEFAULT_MODEL, help="MJCF file to load")
    p.add_argument("--seconds", type=float, default=5.0, help="simulated duration (s)")
    p.add_argument("--out", type=Path, default=DEFAULT_OUT, help="CSV output path")
    p.add_argument("--log-hz", type=float, default=200.0, help="CSV rows per simulated second")
    return p.parse_args()


def name_list(model: mujoco.MjModel, objtype: mujoco.mjtObj, n: int) -> list[str]:
    return [mujoco.mj_id2name(model, objtype, i) or f"{objtype.name}_{i}" for i in range(n)]


def tendon_moment_arms(model: mujoco.MjModel, data: mujoco.MjData) -> np.ndarray:
    """(nu, nv) matrix: d(tendon length)/dq for the tendon each actuator drives.

    MuJoCo stores actuator_moment sparsely; it equals gear * dL/dq for tendon actuators.
    Negative entry => pulling that cable pushes the joint angle UP.
    """
    dense = np.zeros((model.nu, model.nv))
    mujoco.mju_sparse2dense(
        dense, data.actuator_moment, data.moment_rownnz, data.moment_rowadr, data.moment_colind
    )
    gear = model.actuator_gear[:, 0]
    return dense / gear[:, None]


def targets(t: float, joint_names: list[str]) -> np.ndarray:
    ramp = min(1.0, t / RAMP_S) if RAMP_S > 0 else 1.0
    w = 2.0 * math.pi * TRAJ_FREQ_HZ
    q = {
        "hip": ramp * HIP_AMPL * math.sin(w * t),
        "knee": ramp * (KNEE_MID - KNEE_AMPL * math.cos(w * t)),
    }
    return np.array([q.get(n, 0.0) for n in joint_names])


def allocate_tensions(arms: np.ndarray, tau: np.ndarray, t_max: np.ndarray) -> np.ndarray:
    """Cable tensions T >= 0 whose joint torques (-arms^T T) best match tau.

    Minimum-change solution around a uniform pretension, then clipped to [0, t_max].
    Clipping is reported by the caller as saturation; with antagonistic pairs and
    small coupling it rarely triggers in the baseline.
    """
    t0 = np.full(arms.shape[0], PRETENSION_N)
    a_t = -arms.T                      # generalized force per unit tension
    t = t0 + np.linalg.pinv(a_t) @ (tau - a_t @ t0)
    # Raise any cable below pretension using the null space (doesn't change torques).
    _, _, vt = np.linalg.svd(a_t)
    null = vt[np.linalg.matrix_rank(a_t):].T
    for _ in range(10):
        low = t < PRETENSION_N - 1e-9
        if not low.any() or null.shape[1] == 0:
            break
        # least-squares push of the low cables up to pretension within the null space
        need = np.where(low, PRETENSION_N - t, 0.0)
        z, *_ = np.linalg.lstsq(null[low], need[low], rcond=None)
        step = null @ z
        if np.allclose(step, 0):
            break
        t = t + step
    return np.clip(t, 0.0, t_max)


def check_stable(model: mujoco.MjModel, data: mujoco.MjData) -> str | None:
    for arr, label in ((data.qpos, "qpos"), (data.qvel, "qvel"), (data.qacc, "qacc")):
        if not np.all(np.isfinite(arr)):
            return f"non-finite {label}"
    if np.max(np.abs(data.qvel)) > MAX_ABS_QVEL:
        return f"|qvel| exceeded {MAX_ABS_QVEL} rad/s"
    for w in UNSTABLE_WARNINGS:
        if data.warning[w].number > 0:
            return f"MuJoCo warning {w.name} (MuJoCo resets state on this; treat as unstable)"
    return None


def main() -> int:
    args = parse_args()
    try:
        model = mujoco.MjModel.from_xml_path(str(args.model))
    except Exception as exc:  # noqa: BLE001 - surface any load error clearly
        print(f"ERROR: could not load model {args.model}: {exc}", file=sys.stderr)
        return 1
    data = mujoco.MjData(model)

    # Joints (hinge/slide only; this script assumes a fixed base, nq == nv).
    if model.nq != model.nv:
        print("ERROR: run_baseline.py expects a fixed-base model (nq == nv).", file=sys.stderr)
        return 1
    jnames = name_list(model, mujoco.mjtObj.mjOBJ_JOINT, model.njnt)
    tnames = name_list(model, mujoco.mjtObj.mjOBJ_TENDON, model.ntendon)
    anames = name_list(model, mujoco.mjtObj.mjOBJ_ACTUATOR, model.nu)

    # Every actuator must drive a tendon for the allocation step to make sense.
    if not np.all(model.actuator_trntype == mujoco.mjtTrn.mjTRN_TENDON):
        print("ERROR: all actuators must use a tendon transmission.", file=sys.stderr)
        return 1
    act_tendon = model.actuator_trnid[:, 0]
    gear = model.actuator_gear[:, 0]
    if np.any(gear >= 0):
        print("WARNING: an actuator has gear >= 0; it would PUSH its cable.", file=sys.stderr)
    abs_gear = np.abs(gear)
    ctrl_max = model.actuator_ctrlrange[:, 1]
    t_max = ctrl_max * abs_gear  # max tension each motor can produce (N)

    # Start-up report: moment arms at the initial pose (sanity check after routing edits).
    mujoco.mj_forward(model, data)
    arms0 = tendon_moment_arms(model, data)
    print(f"Model: {args.model}")
    print(f"  joints={jnames}  tendons={tnames}  actuators={anames}")
    print(f"  timestep={model.opt.timestep}s  duration={args.seconds}s")
    print("  moment arms at q=0 (mm; negative = pulling raises that joint angle):")
    for i, a in enumerate(anames):
        cells = "  ".join(f"{jn}={arms0[i, j] * 1000:+6.2f}" for j, jn in enumerate(jnames))
        print(f"    {tnames[act_tendon[i]]:<14} {cells}   max tension {t_max[i]:.1f} N")

    # CSV setup
    args.out.parent.mkdir(parents=True, exist_ok=True)
    header = (
        ["time_s"]
        + [f"q_{n}_rad" for n in jnames]
        + [f"qdes_{n}_rad" for n in jnames]
        + [f"qd_{n}_radps" for n in jnames]
        + [f"len_{n}_m" for n in tnames]
        + [f"tension_{tnames[act_tendon[i]]}_N" for i in range(model.nu)]
        + [f"actforce_{n}_Nm" for n in anames]
    )

    n_steps = int(round(args.seconds / model.opt.timestep))
    log_every = max(1, int(round(1.0 / (args.log_hz * model.opt.timestep))))

    q_min = np.full(model.nv, np.inf)
    q_max = np.full(model.nv, -np.inf)
    peak_tension = np.zeros(model.nu)
    peak_actforce = np.zeros(model.nu)
    sq_err = np.zeros(model.nv)
    saturated_steps = 0
    failure = None

    with args.out.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(header)
        for step in range(n_steps):
            t = data.time
            q_des = targets(t, jnames)
            err = q_des - data.qpos
            tau = (
                data.qfrc_bias  # gravity + Coriolis feed-forward
                + np.array([KP.get(n, 1.0) for n in jnames]) * err
                - np.array([KD.get(n, 0.02) for n in jnames]) * data.qvel
            )
            arms = tendon_moment_arms(model, data)
            tension = allocate_tensions(arms, tau, t_max)
            if np.any(tension >= t_max - 1e-9):
                saturated_steps += 1
            data.ctrl[:] = tension / abs_gear  # spool torque (N*m)

            mujoco.mj_step(model, data)

            failure = check_stable(model, data)
            if failure:
                print(f"UNSTABLE at t={data.time:.4f}s (step {step}): {failure}", file=sys.stderr)
                break

            # Measured quantities after the step.
            act_force = data.actuator_force.copy()         # N*m at the spool
            ten_tension = -gear * act_force                # N along the cable (>= 0)
            q_min = np.minimum(q_min, data.qpos)
            q_max = np.maximum(q_max, data.qpos)
            peak_tension = np.maximum(peak_tension, ten_tension)
            peak_actforce = np.maximum(peak_actforce, np.abs(act_force))
            sq_err += (targets(data.time, jnames) - data.qpos) ** 2

            if step % log_every == 0 or step == n_steps - 1:
                writer.writerow(
                    [f"{data.time:.6f}"]
                    + [f"{v:.6g}" for v in data.qpos]
                    + [f"{v:.6g}" for v in targets(data.time, jnames)]
                    + [f"{v:.6g}" for v in data.qvel]
                    + [f"{v:.6g}" for v in data.ten_length]
                    + [f"{v:.6g}" for v in ten_tension]
                    + [f"{v:.6g}" for v in act_force]
                )

    steps_done = step + 1 if failure is None else step
    print(f"\nWrote {args.out}")
    print(f"Simulated {data.time:.3f}s ({steps_done} steps)")
    if steps_done == 0:
        return 2
    rms = np.sqrt(sq_err / max(1, steps_done))
    print("Range of motion reached:")
    for j, n in enumerate(jnames):
        lo, hi = model.jnt_range[j] if model.jnt_limited[j] else (-np.inf, np.inf)
        print(
            f"  {n:<5} {math.degrees(q_min[j]):+7.1f} .. {math.degrees(q_max[j]):+7.1f} deg"
            f"  (span {math.degrees(q_max[j] - q_min[j]):5.1f} deg;"
            f" limits {math.degrees(lo):+.0f}..{math.degrees(hi):+.0f};"
            f" RMS tracking error {math.degrees(rms[j]):.2f} deg)"
        )
    i_t = int(np.argmax(peak_tension))
    i_f = int(np.argmax(peak_actforce))
    print(f"Peak tendon tension:  {peak_tension[i_t]:.2f} N on {tnames[act_tendon[i_t]]}"
          f"  (all: {', '.join(f'{v:.2f}' for v in peak_tension)} N)")
    print(f"Peak actuator force:  {peak_actforce[i_f]:.4f} N*m on {anames[i_f]}"
          f"  (motor limit {ctrl_max[i_f]:.3f} N*m)")
    print(f"Steps with a motor at its limit: {saturated_steps}")

    if failure:
        print(f"RESULT: UNSTABLE ({failure})")
        return 2
    print("RESULT: OK (finite throughout)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
