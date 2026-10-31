# Skill: test a design in MuJoCo before anyone buys anything

**Where:** a work session (`run_python`). MuJoCo 3.17 is installed.

```python
import os, mujoco
xml = open(os.environ['REPO'] + '/teams/rnd/kodama/simulation/models/leg_v0.xml').read()
m = mujoco.MjModel.from_xml_string(xml); d = mujoco.MjData(m)
for _ in range(1000): mujoco.mj_step(m, d)
print('time', round(d.time, 3), 'qpos', d.qpos.round(3))
```

- Everything a simulation shows is **simulated**, not demonstrated. Say which model file and which parameters you used.
- Save plots and data to `$OUT`; write the result and its limits in your team folder.
- To check your own result, run it twice with a small change and say whether the conclusion survives.
