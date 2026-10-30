# Kodama simulation: leg_v0 baseline

**This is a placeholder baseline. It is not a validated Kodama design.** It gives the R&D team
a small, runnable starting point: a MuJoCo model of one cable-driven leg and a script that runs
it headless, logs what happened, and fails loudly if the physics blows up. Every number in the
model is a plausible guess, not a measurement.

## What it is

- A fixed **torso** (no legs touching the ground, no walking) with one **2-joint planar leg**:
  hip and knee hinges, capsule links. The leg is about 0.2 m long and weighs about 0.25 kg; the
  thigh is 0.10 m / 0.12 kg, the shank 0.10 m / 0.10 kg, and the foot 0.03 kg.
- **Tendon/cable drive.** Each joint has an **antagonistic pair** of cables, a flexor and an
  extensor. They are modelled as MuJoCo *spatial tendons* that leave a spool in the torso,
  pass through guide points (sites), and wrap a cylinder "pulley" at the joint they drive.
- **One motor per cable**, mounted in the torso. Each motor can only **pull**. Its control
  signal is spool torque (0 to 0.25 N·m). With an 8 mm spool that works out to a maximum of
  about 31 N of cable tension.
- The knee cables pass close to the hip axis, through a "hip idler" point, so they have only a
  small effect on the hip (about 2 mm of moment arm). The coupling is small, but it is not zero.

## Install and run

You need Python 3.10 or newer. No display or GPU is needed.

```bash
cd teams/rnd/kodama/simulation
pip install -r requirements.txt        # add --break-system-packages on a system Python
python3 run_baseline.py                # 5 simulated seconds, writes out/baseline_metrics.csv
python3 run_baseline.py --seconds 10 --model models/leg_v0.xml
```

Options: `--model PATH`, `--seconds S`, `--out CSV_PATH`, `--log-hz N` (CSV rows per simulated
second, default 200).

**Exit codes:** `0` means it ran cleanly. `2` means the simulation went unstable: NaN/Inf, a
joint velocity above 1000 rad/s, or a MuJoCo bad-qacc/qpos/qvel warning. MuJoCo silently resets
the state on those warnings, so the script counts them as failures. `1` covers other errors,
for example a model that won't load. CI can rely on these codes.

Minimal GitHub Actions step (headless, no viewer):

```yaml
- uses: actions/setup-python@v5
  with: { python-version: "3.12" }
- run: pip install -r teams/rnd/kodama/simulation/requirements.txt
- run: python3 teams/rnd/kodama/simulation/run_baseline.py --seconds 5
```

## Files

| File | What it is |
|---|---|
| `models/leg_v0.xml` | The MJCF model: torso, leg, pulleys, routing sites, 4 tendons, 4 motors, sensors. It is heavily commented. |
| `run_baseline.py` | Loads a model, runs a simple controller headless, writes the CSV, prints a summary, and checks stability. |
| `requirements.txt` | Pinned versions this was tested with (`mujoco==3.17.0`, `numpy==2.5.3`). |
| `out/.gitignore` | Keeps generated CSVs out of git. `out/` is created on each run. |

### The controller (in `run_baseline.py`)

1. Each joint follows a smooth sine target. The hip swings about ±34°; the knee swings between
   about 17° and 86°. The motion fades in over the first 0.5 s.
2. A PD law plus gravity feed-forward gives the joint torques it wants.
3. Those torques are split into cable tensions using the **live moment arms MuJoCo computes
   from the routing**. If you change the routing in the XML, the controller adapts. Every
   cable keeps a 2 N pretension so it never goes slack, and tensions are clipped to
   `[0, max]` because cables can't push.
4. Tension is converted to motor torque through the actuator gear.

All gains and targets are placeholders at the top of the script.

### The CSV (`out/baseline_metrics.csv`)

| Columns | Meaning |
|---|---|
| `time_s` | Simulated time |
| `q_<joint>_rad`, `qdes_<joint>_rad`, `qd_<joint>_radps` | Joint angle, target angle, and joint velocity |
| `len_<tendon>_m` | Cable path length |
| `tension_<tendon>_N` | Tension the motor applies to that cable (always ≥ 0) |
| `actforce_<actuator>_Nm` | MuJoCo's `actuator_force`, which is the spool torque. Tension = 125 × this. |

The tension columns cover only what the motor applies. They do **not** include the tendon's
own passive damping or stiffness force, or any length-limit force.

### Reading the start-up printout

The script first prints each cable's **moment arm** at the zero pose. A negative value means
pulling that cable raises the joint angle, so it is the flexor. Check this table whenever you
edit routing. If a flexor shows a positive arm, the cable is on the wrong side of the pulley.

## What to change first

1. **Real dimensions and masses**, once Kodama has CAD: link lengths (`fromto`), `mass`,
   pulley radii (`size` on the pulley geoms), and spool radius (`gear = -1 / r_spool`).
2. **Motor limits**: `ctrlrange` on `<motor>` should come from the chosen motor's
   continuous torque, not its peak.
3. **Routing**: move the `*_spool`, `*_hip_idler`, `*_guide_*`, and `*_insert` sites, and
   watch the moment-arm table and the coupling change.
4. **Cable losses**: try `frictionloss` and `damping` on the `<spatial>` tendons.
5. **Contact**: lower the torso (`pos` on `torso`) so the foot meets the floor, or give the
   torso a free joint. The script assumes a fixed base (`nq == nv`), so a floating base needs
   script changes too.

## What this does NOT show

- **No real material data.** Cable stiffness, cable diameter, pulley friction, motor
  constants, masses, and inertias are all placeholders.
- **No calibrated friction or stretch model.** Nothing here was fitted to a bench test.
- **No series elasticity.** MuJoCo tendon `stiffness` is a spring on the tendon's length,
  acting **in parallel** with the motor. It does not model a cable stretching **between** the
  motor and the joint. Modelling stretch needs an extra degree of freedom, for example a
  slider "spool" joint coupled to the cable.
- **No slack dynamics.** A cable here is a geometric length. "Can only pull" is enforced only
  by the motor's `ctrlrange >= 0`. A real cable can go slack, jump off a pulley, or creep.
- **No motor model.** There is no electrical dynamics, no torque–speed curve, no heating, and
  no gearbox backlash or efficiency.
- **No walking, balance, or load-bearing.** The torso is welded in place and the foot never
  touches anything.
- **Simulated ≠ demonstrated.** A clean run means only that this model with these numbers
  behaved. It is not evidence that a physical Kodama leg will.

## MuJoCo features relevant to cable drives

These are worth knowing as you extend the model. Full reference: https://mujoco.readthedocs.io
(see the XML reference sections on `tendon/spatial` and `actuator`, and the Modeling chapter on
tendons).

- **Spatial tendons** (`<tendon><spatial>`): a path through sites. Its length and its Jacobian
  (the moment arm on every joint it crosses) are recomputed every step, so multi-joint cables
  and coupling come for free.
- **Wrapping**: put a sphere or cylinder geom in the path and the cable wraps around it like a
  pulley. A `sidesite` picks which side it wraps on, which is how flexor and extensor go around
  opposite sides of the same pulley here.
- **Tendon actuators**: `<motor tendon="...">` or `<general tendon="...">`. Use a negative gear
  (or a negative ctrl range) to make the motor pull.
- **Tendon passive properties**: `stiffness`, `damping`, `springlength` (two values give a
  dead-band spring), and `frictionloss`.
- **Tendon limits**: `limited="true" range="lo hi"` puts a hard length stop on a cable.
- **Caveat found while building this:** in MuJoCo 3.17.0, tendon `armature` is rejected for
  tendons that wrap a geom ("geom wrapping not supported by tendon armature").
- **Fixed tendons** (`<tendon><fixed>`): linear combinations of joint angles. They are useful
  for idealized cable couplings without geometry.
