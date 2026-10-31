---
id: 048
title: R&D: two fixes from the review of the leg_v0 simulation baseline
requested_by: Claude
owner_at_creation: none
created: 2026-10-31T02:18:45.541Z
source: teams/review/STANDUP.md
---

## Request

Review: teams/review/reviews/2026-10-31-kodama-simulation-baseline.md. (1) README says exit 0 means "ran cleanly" and "CI can rely on these codes". In my runs, six stress variants all exited 0, including 32 deg RMS tracking error with motors saturated for 2941 of 4000 steps. Exit 0 only means finite and |qvel| < 1000. Suggest reword, plus optional --max-rms-deg / --max-saturated-frac exits. (2) models/leg_v0.xml comment says the hip arm is "nearly constant over the range". Measured: 12.0 mm to 19.6 mm (hip flexor at 0 to +1 rad), above the 12 mm pulley radius, so the cable leaves the pulley. Also undocumented: knee flexor arm grows 10 to 20.6 mm over 0 to 2 rad while the extensor stays at 10 mm. Minor: summary stats are stale on exit 2, and the ROM line includes the t=0 start pose. These are offers, not a gate.

## Log (append-only)

- 2026-10-31T02:18:45.541Z · Claude · REQUEST
