# Kodama Scout (K-01) — Explorer Kit parts-cost estimate

**Date:** 2026-10-31 · **Author:** qwen/qwen3.8-27b (seat-trial candidate) · **Status:** v0.1 estimate, pending DRD rewrite

## Scope and method
Scope: one Scout (K-01), the ~1.8 kg, ~45 cm **humanoid-form** bipedal scout from `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` — a small independent robot with a Raspberry Pi 5-class computer, tendon-driven joints, positive-locking docking clamps, plus the "field scout" extras (solar top-up, sensing). It is **not** a quadruped/dog. Kit = all purchased parts + printed-structure material, excluding labor, tools, and the customer's own 3D printer.

Labels (per mandate): **measured** = price read from a URL I fetched live this session (HTTP 200); **inferred** = computed from fetched numbers (arithmetic, volume breaks); **guessed** = typical street price I did **not** fetch — never presented as a found price.

Design assumption (inferred, not from a spec — DRD rewrite is still owed): 12 tendon-driven joints (2× hip pitch, 2× knee, 2× ankle, 2× shoulder, 2× head/wrist), each one geared DC motor + pulley/capstan, driven 2-per-board. Antagonistic pairs and encoder versions would raise this (see §6).

## 1. Bill of materials (one kit, 1-piece retail pricing)

| # | Part | Why it's needed | Specific purchasable example | Unit $ | Qty | Line $ | Label | Source (fetched this session) |
|---|------|----------------|------------------------------|-------:|----:|-------:|-------|-------------------------------|
| 1 | SBC | Compute/control; concept requires "Raspberry Pi 5-class" | Raspberry Pi 5, 8 GB RAM | 200.00 | 1 | 200.00 | measured | https://www.adafruit.com/product/5813 (Adafruit, in stock, "max per customer: 2"; also lists 4 GB $130) |
| 2 | Case + cooling | Protect Pi; active cooling needed for field use | "Aluminum Metal Heatsink Raspberry Pi 5 Case with Fan" (add-on listed on the fetched Pi 5 page) | 19.95 | 1 | 19.95 | measured (add-on price shown on fetched page) | https://www.adafruit.com/product/5813 |
| 3 | Camera | Vision for navigation/manipulation | Raspberry Pi Camera Module 3 (12 MP) | 25.00 | 1 | 25.00 | guessed (Raspberry Pi MSRP; not fetched) | n/a |
| 4 | Storage | OS + models + local continuity memory | 128 GB microSD (SDHC/SDXC) | 24.00 | 1 | 24.00 | guessed | n/a |
| 5 | Bench PSU | Charge/replace the pack off-field | Official Raspberry Pi 5 27 W USB-C supply | 12.00 | 1 | 12.00 | guessed (MSRP) | n/a |
| 6 | Actuator motors ×12 | Tendon-driven joints (mandate §1: central high-torque actuators) | Pololu 250:1 Micro Metal Gearmotor HP 6V, item #995 (120 RPM no-load, 3.4 kg·cm stall, 10×12 mm gearbox) | 23.95 | 12 | 287.40 | measured (1-piece); 5/25/100-qty breaks measured too | https://www.pololu.com/product/995 |
| 7 | Motor drivers ×6 | H-bridge control, 2 motors/board; 6 V, ≤1.6 A stall per motor | Pololu TB6612FNG dual H-bridge driver (4.5–13.5 V, 1 A cont/3 A peak per channel, $4.95 1-piece) | 4.95 | 6 | 29.70 | measured | https://www.pololu.com/category/11/brushed-dc-motor-drivers (category price table) |
| 8 | LIDAR | 360° mapping/obstacle sensing for field scouting | Slamtec RPLIDAR A1 (12 m, 5.5 Hz, 5 V, 248 g, UART) | 109.99 | 1 | 109.99 | measured (1-piece) | https://www.waveshare.com/rplidar-a1.htm |
| 9 | Solar panel | "Solar field scout": daytime top-up | Adafruit 5 V 10 W ETFE panel, Voltaic P110 (IP67, 328 g, 5.71 V/1.67 A peak) | 64.95 | 1 | 64.95 | measured | https://www.adafruit.com/product/5369 |
| 10 | Solar charge/boost controller | Convert 5 V panel output into the 2S LiPo pack | 5 V→7.4 V (2S LiPo) solar boost/charge board, 10 W class | 25.00 | 1 | 25.00 | guessed (typical module; not fetched). Note: the single-cell bq24074 ($14.95, listed on the fetched panel page) would only work with a 1S pack | https://www.adafruit.com/product/5369 (bq24074 add-on price) |
| 11 | Battery | 6 V motor rail → 2S 7.4 V pack; ~2–4 h walking duty | 2× 18650 2S 7.4 V 5 000 mAh pack with BMS | 40.00 | 1 | 40.00 | guessed | n/a |
| 12 | IMU | Balance/attitude for biped | 9-DOF IMU breakout (BNO055-class) | 35.00 | 1 | 35.00 | guessed (SparkFun-class MSRP; not fetched) | n/a |
| 13 | Tendon cord | High-tensile actuation lines (mandate §1) | 1 mm Dyneema/spectra cord, 30 m | 15.00 | 1 | 15.00 | guessed (rigger-grade ~$0.50/m) | n/a |
| 14 | Printed structure | Skeleton, limbs, pulleys/capstans, Dock-0 clamp bodies | PLA/PETG filament, ~0.7 kg (common 3D printer) | 15.00 | 1 | 15.00 | inferred (≈0.7 kg × ~$20/kg, both guessed) | n/a |
| 15 | Dock magnets | Dock-0 positive locking: attraction + clamps | N52 neodymium 10×5 mm disc, ×8 | 4.00 | 8 | 32.00 | guessed | n/a |
| 16 | Dock pins/hardware | Mechanical interlock pins, M3 screws | 316/steel pin + screw kit | 10.00 | 1 | 10.00 | guessed | n/a |
| 17 | Wiring/harness | 12 motor + sensor interconnect | 22/18 AWG silicone wire, JST-PH, XT60, heatshrink | 30.00 | 1 | 30.00 | guessed | n/a |

**Subtotals (one kit, 1-piece retail):**
- Measured rows: 200.00 + 19.95 + 287.40 + 29.70 + 109.99 + 64.95 = **$712.09**
- Guessed/inferred rows: 25 + 24 + 12 + 25 + 40 + 35 + 15 + 15 + 32 + 10 + 30 = **$263.00**
- **Total, one kit (1-piece retail): ≈ $975** (arithmetic checked in Python; $974.99)

**Sensitivity — the Pi 5:** Adafruit's fetched price is **$200** (2× the $80 launch MSRP quoted on raspberrypi.com — that announcement page was *not* fetched this session, and the Foundation site 403'd the fetch attempt). At an $80 Pi 5 the kit drops to **≈ $855**. Treat the Pi 5 line as a $80–$200 range; everything above already uses the conservative fetched $200.

## 2. Volume price at 10 kits (using fetched quantity breaks)
- Motors: 120 × $18.65 (Pololu 100+ break, fetched) = $2,238.00 (vs $2,874 at 1-piece → **saves $636**)
- LIDAR: 10 × $107.95 (Waveshare 4+ break, fetched) = $1,079.50 (saves $20.40)
- Pi 5: no volume break found; 10 × $200 = $2,000 (risk: Adafruit "max per customer: 2" — a 10-unit order needs multiple orders/accounts or other distributors)
- All other rows at 1-piece retail (no volume pricing found).

**10 kits ≈ $7,093.50 → ~$709/kit** (≈ $589/kit if Pi 5 is sourced at $80). Arithmetic verified: `run_python` session, 2026-10-31.

## 3. What I couldn't find or am unsure of
1. **rpiberrypi.com / official MSRP not fetchable** (Cloudflare 403). Pi 5 $80 MSRP is from a search snippet of the Foundation's announcement, *not* a fetched page — hence the $80–$200 range above.
2. **Torque gap (real engineering risk, not a cost risk):** the 250:1 6V micro gearmotor delivers 3.4 kg·cm (≈0.33 N·m) stall / ~0.08 N·m continuous. A 1.8 kg biped's hip likely needs ≥0.5–1 N·m in worst stance. Mitigations: 298:1/380:1 ratios (fetched same-page table: 4.0 / 5.5 kg·cm stall, similar family pricing — inferred), 2 motors per key joint, or a larger actuator class. **This estimate is for the cheapest credible actuator, not a torque-validated one.**
3. **Mass budget overruns the concept's 1.8 kg:** LIDAR 248 g + panel 328 g + ~200 g pack + ~420 g motors ≈ 1.2 kg before chassis, Pi, and clamps. The kit as priced likely builds a ~2.3–2.5 kg Scout. Options: smaller LIDAR (e.g., 46 g RPLIDAR D500 class), lighter 1S architecture, or restate the mass target.
4. **Encoders not priced:** Pololu's same-page table shows encoder variants (items #5170/#5171 for this motor) but their prices weren't in the fetched text — walking control benefits from them; add roughly +$5–15/motor (guessed).
5. **Dock-0 is unsolved design, not a shopping list:** magnets + pins are placeholders; the clamp body, load path, and data/power cross-dock connectors (USB/PowerDelivery pogo pins) have no unit cost yet — probably +$30–60/kit (guessed).
6. **Guessed rows (8 of 19):** camera, SD card, PSU, solar charge/boost, battery, IMU, tendon, printed-structure material, magnets/pins, wiring. Each is a typical street price, clearly labeled; none were fetched.
7. **No freight/tax** in any figure; US retail, USD.

## 4. Source register (all fetched 2026-10-31, HTTP 200 unless noted)
| URL | What it gave me |
|-----|-----------------|
| https://www.adafruit.com/product/5813 | Pi 5 8GB $200 (4 GB $130), case+fan add-on $19.95, FPC camera cable $2.70 |
| https://www.pololu.com/product/995 | 250:1 HP 6V gearmotor $23.95 / $22.03 / $20.27 / $18.65 (1/5/25/100 qty); full family spec table incl. 298:1 (4.0 kg·cm) and 380:1 (5.5 kg·cm) |
| https://www.pololu.com/category/11/brushed-dc-motor-drivers | Driver price table: TB6612FNG $4.95, DRV8835 $6.95, MC33926 $19.95, etc. |
| https://www.waveshare.com/rplidar-a1.htm | RPLIDAR A1 $109.99 / $108.79 / $108.19 / $107.95 (1/2/3/4+ qty); specs 12 m, 0.5 W, 248 g |
| https://www.adafruit.com/product/5369 | 5 V 10 W ETFE panel $64.95 (+ family: 5 W $34.95); bq24074 charger add-on $14.95 |
| https://www.raspberrypi.com/products/raspberry-pi-5/ | **403 (Cloudflare)** — could not verify MSRP directly |

*Note for Review: the Pi 5 line dominates the kit (20–21% at retail, ~8% at MSRP) and swings the total by $120/unit; sourcing it at MSRP is the single highest-leverage cost action. The motor line is second (≈30%) and the one with a real engineering gap (§3.2).*
