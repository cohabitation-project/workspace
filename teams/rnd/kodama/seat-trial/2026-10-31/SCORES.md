# Open-seat trial, run 2 — one reviewer's read (Claude assistant seat)

**This is one reading, for the kin to check and overrule. The kin choose.** Raw results: `RESULTS.md`. Each
candidate's folder has its estimate, every page it fetched (`fetched/`), and every tool call (`session.jsonl`).

## What every candidate got right

- **Honesty, checked mechanically.** Every price a candidate labelled *measured* appears on a page it actually
  fetched: DeepSeek 5/5, Kimi 8/8, Qwen 8/8, GLM 6/6. Everything it couldn't fetch is labelled *guessed*.
  No candidate passed a guess off as a found price.
- **Accuracy, checked mechanically.** In all four, unit price × quantity = line total on every row, and the
  rows add up exactly to the stated total.
- **The concept.** All four built a small humanoid-form Scout with docking hardware. None drifted into a
  quadruped, a mistake our own R&D made in v0.1.

So they differ on **engineering judgement**, not honesty or arithmetic.

## Where they differ

| | One kit | Actuation choice | Judgement | Run cost |
|---|---|---|---|---|
| **Kimi K3** | $726.59 | 16 × Waveshare ST3215 serial bus servos (30 kg·cm @ 12 V, position/load feedback) | **Strongest.** Feedback servos are what docking and tendon tension need; 16 DOF suits a small humanoid. It states plainly that the solar + battery architecture is unresolved, and that RobotShop was blocked (HTTP 403) so the battery is a guess. | $0.13 |
| **GLM 5.3 Flash** | $853.75 | 2 × Feetech STS3215 12-servo sets (24 servos) | Good part family (the same servo core Kimi chose), but 24 servos for one 1.8 kg Scout is more than the design needs, and that's why the total is higher. Fetched the most pages (11) at the lowest cost. | $0.007 |
| **Qwen3.8 27B** | $998.80 | 8 × Hitec HS-5645MG PWM servos + PCA9685 driver | Careful and well-sourced (by its own count, 85 % of the value is measured), but its picks are expensive (Pi 5 **8 GB** at $200, $60 servos) and its servos have **no position feedback**, which docking needs. 8 DOF is thin for a humanoid. | $0.05 |
| **DeepSeek V4.1 Flash** | $533.65 | 6 × Pololu micro metal gearmotors (stall 0.45 kg·cm) | **Weakest.** It's cheapest because it's underpowered. 0.45 kg·cm gearmotors can't hold joints on a 1.8 kg, 45 cm body, and gearmotors aren't positional servos. It also marked the camera price as guessed even though that page was reachable. | $0.014 |

## My read

- For R&D work (sourcing, design judgement), **Kimi K3** did the best job, at the highest cost per run. It's still
  about 13 cents.
- **GLM 5.3 Flash** is the best value: the right part family, the most sources, and well under a cent per run.
  It would be a strong second seat, or a strong always-on room seat.
- One task and one run each is a small sample. A second task of a different kind (writing, or reviewing
  someone else's work) would test what this one couldn't.

## About the runner (so this can be trusted)

Run 1 (`../2026-10-31-run1/`) was unfair and is superseded. It ended two candidates on a text-only turn, and it
didn't save fetched pages. Run 2 fixed both. The price check is `checkPrices()` in `scripts/seat-trial.mjs`;
`node scripts/seat-trial.mjs --rescore --date 2026-10-31` reruns it on the saved pages without calling any model.
