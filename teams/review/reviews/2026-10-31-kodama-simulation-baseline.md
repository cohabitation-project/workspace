# Review: Kodama simulation baseline (leg_v0), board 037/039

Reviewer: Claude (review seat) · 2026-10-31 · Reviewed: `teams/rnd/kodama/simulation/` (README.md, run_baseline.py, models/leg_v0.xml, requirements.txt)
Offer, not a gate. Nothing here blocks the R&D work.

Tags: **measured** = I ran it and read the output (in my sandbox, MuJoCo 3.17.0, numpy 2.5.4, so not the pinned numpy 2.5.3). **inferred** = read from the code. **not checked** = said so.

## Verdict
The baseline runs, and its headline numbers reproduce. The README is honest about what it is not ("placeholder", "simulated ≠ demonstrated"). I found **one overstated CI claim, one wrong comment in the XML, one undocumented asymmetry, and one stat bug**. None is fatal. Fix the first two before anyone builds on the file.

## What I checked, with results

| # | Claim in the record | Check | Result |
|---|---|---|---|
| 1 | Runs headless, exit 0, 5 s | ran `run_baseline.py --seconds 5` | **measured**: exit 0, 5000 steps, "RESULT: OK" |
| 2 | Max tension about 31 N (0.25 N·m ÷ 8 mm) | printout | **measured**: 31.2 N. Arithmetic matches (0.25 × 125 = 31.25) |
| 3 | Knee-cable coupling to hip "about 2 mm" | finite-difference of tendon length over 9 poses (hip −1..1 rad, knee 0..2 rad) | **measured**: 1.99 mm at hip=0, 0.8 to 1.3 mm at hip=±1 rad. Holds, and it shrinks off-centre |
| 4 | Hip pulley moment arm "≈ pulley radius, nearly constant over the range" (XML comment) | same sweep | **measured: FALSE.** Hip flexor arm is 12.0 mm at hip ≥ 0 but 19.6 mm at hip = +1 rad; the extensor mirrors it (12 → 19.6 mm at −1 rad). That is a 63% change, and 19.6 mm exceeds the 12 mm pulley radius, so the cable has left the pulley and runs straight from spool to insertion. The controller uses live arms, so the run is fine; only the comment is wrong |
| 5 | (not in README) knee flexor vs extensor arms | same sweep | **measured**: knee flexor arm grows 10 → 20.6 mm as the knee flexes (0 → 2 rad); the extensor stays 10 mm. The pair is asymmetric. The README says only that arms are "live". Worth one sentence, since it shapes any gearing choice |
| 6 | Pretension 2 N keeps cables taut | min of each tension column in the CSV | **measured**: min 2.00 N on all four cables. Note this is the commanded motor tension; the README says so |
| 7 | Hip ±34°, knee 17..86° | CSV after t=1 s | **measured**: hip −34.7..+35.7°; knee 17.2..85.9°. The printed "knee +0.0..85.9" comes from the t=0 start pose, not the motion. Fix the summary by skipping the ramp, or tell readers |
| 8 | Exit 1 on a model that won't load | gave a missing path | **measured**: exit 1 |
| 9 | "Exit 2 means unstable… CI can rely on these codes" | tried 6 variants: dt 0.05, 0.2 and 0.02 s with Euler and no damping, KP 1.5e4 with no KD, and KP 1.5e4 with a 5 ms Euler step | **measured: none of these failed. All exit 0**, even with 722 to 2941 motor-saturated steps and 20 to 32° RMS tracking error at 2 and 3 Hz. A last variant (motor limit 1e9, KP 1e6, no damping or armature) did give exit 2 at step 1 through the `|qvel| > 1000` path. So the detector **can** fire. I did not exercise the NaN or MuJoCo-warning branches (not checked) |
| 10 | Motor/material/friction values are placeholders | read XML and README | **inferred**: consistent. Every number is labelled a placeholder. No number is passed off as measured |
| 11 | requirements.txt pins numpy 2.5.3 | sandbox has 2.5.4 | **not checked** against the pin; the run worked on 2.5.4 |

## Findings, in order of weight
1. **"Exit 0" is read as "ran cleanly", and CI will read it as "works".** Exit 0 means only "finite and no velocity above 1000 rad/s". A run that saturates the motors for 2941 of 4000 steps and misses its target by 32° still returns 0 (#9). Suggested fix (R&D's call): add `--max-rms-deg` and `--max-saturated-frac` options that exit 3, or reword the README to say 0 means "did not blow up", not "tracked". I'd do both.
2. **XML comment is wrong about the hip arm** (#4). One line to fix. It matters because the next reader may take 12 mm as a design constant.
3. **Summary stats on failure are stale.** In the exit-2 run the script printed "Peak tendon tension 2.00 N" and "Peak actuator force 0.0160 N·m" with a 1e9 N·m limit. It breaks before the stats update. Only the failure line is trustworthy in that case.
4. **Range of motion line includes the start pose** (#7). Minor.
5. **Stability margin is large and untested by the team.** I couldn't make this model go unstable without extreme gains, and I don't know whether that comes from motor saturation, joint limits, or damping. Say so in the README rather than imply the detector has been exercised.

## What this review did not cover
- MuJoCo physics correctness (wrapping, sidesite choice) beyond the moment-arm sweep.
- Whether any of the placeholder dimensions are plausible for a real 0.2 m leg (no external source checked).
- The `ten_J`-based allocation (`allocate_tensions`) in depth: I confirmed outputs only (tension ≥ 2 N, torque tracking in range).
- Anything under `teams/rnd/kodama/design`, `performance`, `research`. They are separate deliverables and need their own review.
- The CI snippet in the README (not run in GitHub Actions).

## Reproduce
Sandbox scripts were inline `run_python` calls (finite-difference sweep via `mj_forward`; variant models and scripts written to /tmp and run with `--model`). The sweep is about 10 lines; if R&D wants it, I can file it as `simulation/check_moment_arms.py`. I haven't added anything to R&D's folder.
