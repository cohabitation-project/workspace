# Kodama Scout Explorer Kit — sourced parts-cost estimate

**Author:** deepseek/deepseek-v4.1-flash (candidate seat, trial 2026-10-31)
**Scope:** one Explorer Kit = one **Scout (K-01)** base unit as defined in `../../concept/WHAT-KODAMA-IS.md`: a small standalone humanoid-form robot, ~45 cm, ~1.8 kg, Raspberry Pi 5-class computer, tendon-capable actuation, plus Dock-0 clamp hardware so the unit can later lock to other Scouts. **Not** a quadruped / dog bot.
**Prices fetched:** 2026-10-31, from vendor product pages (URLs in the table). USD, single-unit list price, before shipping and tax.

**Label key**
- **measured** = I fetched that exact page and read that number off it.
- **inferred** = computed from fetched numbers (arithmetic, or a same-page option list).
- **guessed** = I did not find a page I could fetch for it; it is my estimate and is flagged as such.

---

## 1. Bill of materials — one kit

### 1a. Lines with a price I actually fetched

| # | Part | Why it's needed | Specific purchasable example | Unit price | Qty | Line total | Label | Source URL I fetched |
|---|---|---|---|---|---|---|---|---|
| 1 | Single-board computer | The Scout's brain: vision, gait control, swarm sync, ROS 2 | Raspberry Pi 5 – 4 GB RAM (Adafruit #5812) | $130.00 | 1 | $130.00 | measured | https://www.adafruit.com/product/5812 |
| 2 | FPC camera cable | Pi 5's camera connector is 22-pin 0.5 mm; Camera Module 3 is 15-pin 1 mm — without this the camera cannot plug in | Raspberry Pi 5 FPC Camera Cable – 22-pin 0.5 mm to 15-pin 1 mm (Adafruit) | $2.70 | 1 | $2.70 | measured | https://www.adafruit.com/product/5812 |
| 3 | Solar panel | The "field scout" part: harvests light to top the pack up between missions | 6V 2W Solar Panel – ETFE – Voltaic P126 (Adafruit #5366), 112×136×2.7 mm, 79 g, 7.28 V peak / 330 mA peak | $20.95 | 1 | $20.95 | measured | https://www.adafruit.com/product/5366 |
| 4 | Solar/LiPo charger | Near-MPPT charging from a 6–10 V panel with load-sharing; the correct part for panel→pack | Adafruit Universal USB / DC / Solar LiIon/LiPoly charger – bq24074 (Adafruit #4755) | $14.95 | 1 | $14.95 | measured | https://www.adafruit.com/product/4755 |
| 5 | IMU (9-DoF, fused) | Balance, orientation, fall detection; gives quaternions without writing a fusion stack | Adafruit 9-DOF Orientation IMU Fusion Breakout – BNO085 (Adafruit #4754) | $29.50 | 1 | $29.50 | measured | https://www.adafruit.com/product/4754 |
| 6 | Leg actuator | 6 driven joints assumed (2 legs × hip-pitch, hip-roll, knee); central-motor + tendon layout per mandate §1 | Pololu 30:1 Micro Metal Gearmotor HPCB 6V, item #3062 (29.86:1, 6 V, 1100 RPM no-load, stall 0.45 kg·cm / 1.5 A) | $26.45 | 6 | $158.70 | unit price measured / **qty inferred** (my design assumption) | https://www.pololu.com/product/3062 |
| 7 | Motor driver | One dual H-bridge per 2 motors, 1.2 A/ch continuous — matches the 1.5 A-stall motors | Pololu DRV8833 Dual Motor Driver Carrier, item #2130 | $10.95 | 3 | $32.85 | unit price measured / qty inferred (6 motors ÷ 2) | https://www.pololu.com/product/2130 |
| 8 | Distance sensor (ToF) | Obstacle/edge detection for a scout that walks on its own; 10 mm–5 m | Adafruit TMF8806 Time of Flight Distance Sensor | $12.50 | 1 | $12.50 | measured, but weaker evidence: the price appeared in the sidebar of the Adafruit pages I fetched, not on a product page I fetched | https://www.adafruit.com/product/5366 (also on /5812) |

**Fetched-price subtotal: $402.15**

### 1b. Lines I could not source — every number here is a guess

| # | Part | Why it's needed | Specific example I would buy | Unit price | Qty | Line total | Label | Source |
|---|---|---|---|---|---|---|---|---|
| 9 | microSD card | Pi 5 has no onboard storage | 32 GB A2 microSD (SanDisk/Samsung class) | $12.00 | 1 | $12.00 | guessed | none found |
| 10 | Camera | The "scout" sense: mapping, inspection, pictures for the record | Raspberry Pi Camera Module 3 Standard (Adafruit #5657) | $30.00 | 1 | $30.00 | guessed | none found (see §4) |
| 11 | Battery pack | 3.7 V LiPo, JST-PH — the chemistry the bq24074 charges | Adafruit Lithium Ion Battery 3.7 V 2000 mAh (#2011) | $12.50 | 1 | $12.50 | guessed | none found |
| 12 | Tendon cord | Mandate §1 tendon / antagonistic drive; ~1.5 mm braided Dyneema/Spectra, ~10 m | marine or kite-shop Dyneema braid | $12.00 | 1 | $12.00 | guessed | none found |
| 13 | Printed structure | Shells, limbs, brackets, dock jaws — a printer makes these, not motors (per WHAT-KODAMA-IS) | 1 kg PETG or PLA+ filament | $22.00 | 1 | $22.00 | guessed | none found |
| 14 | Dock-0 hardware | The defining Kodama problem: positive-locking clamps, leg-to-shoulder and arm-to-body holds — latches, pins, springs, magnets | M3 hardware kit + latch/pin stock | $18.00 | 1 | $18.00 | guessed | none found |
| 15 | Wiring & connectors | Motor leads, JST-PH / STEMMA-QT cables, battery pigtails, power distribution | assorted cable/connector kit | $12.00 | 1 | $12.00 | guessed | none found |
| 16 | 5 V rail for the Pi | A 3.7 V pack cannot feed a Pi 5; needs a boost/buck module | MPM3610-class 5 V breakout | $8.00 | 1 | $8.00 | guessed | none found |
| 17 | Safety / misc | Fuse or e-fuse, NTC thermistor on the pack (the bq24074 supports one), standoffs, wire ties | assorted | $5.00 | 1 | $5.00 | guessed | none found |

**Guessed subtotal: $131.50**

---

## 2. Totals

| | Amount | Label |
|---|---|---|
| Fetched-price subtotal (lines 1–8) | **$402.15** | inferred (sum of measured line totals) |
| Guessed subtotal (lines 9–17) | **$131.50** | guessed |
| **One kit, parts only** | **$533.65** | inferred (sum) |
| Per-kit at 10 kits (see §3) | ≈ **$499.81** | inferred |

Arithmetic: 130.00 + 2.70 + 20.95 + 14.95 + 29.50 + 158.70 + 32.85 + 12.50 = 402.15; 12 + 30 + 12.50 + 12 + 22 + 18 + 12 + 8 + 5 = 131.50; 402.15 + 131.50 = 533.65.
Cost drivers: **motors ≈ 29.7 %**, **compute ≈ 24.4 %**, **sensing + charging ≈ 10.6 %** of the kit.

Excluded from every number: shipping, tax/duty, tools (soldering iron, 3D printer, crimpers), assembly labour, spares/breakage, battery certification, and R&D amortisation. So a kit sold as a product would price **above** $500 unless the two big lines come down.

---

## 3. Volume pricing found (10 kits)

I used only discount tiers the fetched pages actually displayed; where a page showed no tier, I left the unit price alone.

| Part | 1-off | Qty for 10 kits | Tier I could use | 10-kit total | Label |
|---|---|---|---|---|---|
| Raspberry Pi 5 4GB | $130.00 | 10 | none shown; page says **"Max per customer: 2"** | $1,300.00 | measured (no discount) |
| FPC camera cable | $2.70 | 10 | none shown | $27.00 | measured (no discount) |
| 6V 2W solar panel | $20.95 | 10 | none shown | $209.50 | measured (no discount) |
| bq24074 solar charger | $14.95 | 10 | 10–99 → **$13.46** | $134.60 | measured tier |
| BNO085 IMU | $29.50 | 10 | 10–99 → **$26.55** | $265.50 | measured tier |
| 30:1 gearmotor #3062 | $26.45 | 60 | 25+ → **$22.39** | $1,343.40 | measured tier |
| DRV8833 driver #2130 | $10.95 | 30 | 25+ → **$9.27** | $278.10 | measured tier |
| TMF8806 ToF | $12.50 | 10 | none shown | $125.00 | measured (no discount) |
| Lines 9–17 (guessed) | $131.50/kit | — | no volume data | $1,315.00 | guessed |

**10 kits ≈ $3,683.10 (fetched lines) + $1,315.00 (guessed lines) = $4,998.10 → ≈ $499.81/kit.**
Against 10 × $533.65 = $5,336.50 bought one-off, the found tiers save ≈ $338.40 (≈ 6 %). **The discount is small because the two biggest lines — the Pi 5 and the solar panel — show no quantity break at all, and the Pi 5 is capped at 2 units per customer on the page I fetched.**

---

## 4. What I couldn't find, and what I am unsure of

1. **I ran out of tool calls before sourcing 9 of the 17 lines.** microSD, camera, battery, filament, tendon cord, dock hardware, wiring, 5 V rail and safety parts are all **guessed**, not found. The guessed total ($131.50/kit) could easily be off by ±$50.
2. **The Pi 5 price is the biggest risk to this estimate.** The Adafruit page I fetched lists **$130.00 for the 4 GB Pi 5**, with a **"Max per customer: 2"** limit, and the same page lists **1 GB at $49.50** and 8 GB at $200.00 (all measured, same URL). $130 is far above the Pi 5 4 GB's long-standing ~$60 headline price, which suggests current memory pricing and/or tariffs. Search results also showed PiShop US and SparkFun listings, but **I did not fetch them, so I have no verified cheaper price** — that is the first thing I would check next. If a $60–70 board is available, one kit drops to roughly **$470**, and 10 kits to roughly **$4,400** (inferred).
3. **The energy budget does not close, and this is a design problem, not a sourcing problem.** A 6 V 2 W panel (measured: 2.37 W peak, 7.28 V, 330 mA) gives on the order of 1–1.5 W in real outdoor light, while a Pi 5 idles at roughly 3–5 W (**guessed** — I did not fetch a power measurement). So the panel is a **trickle charger / mission-extender, not a power source**; runtime comes from the pack. Either the compute has to be smaller (Pi Zero 2 W class, price not fetched) or the panel has to be bigger. Measured alternatives on the same fetched panel page: **5V 5W ETFE $34.95**, **5V 10W ETFE $64.95**, 5V 1.2W $14.95.
4. **Motor torque is unresolved.** The fetched Pololu page gives 30:1 HPCB 6V as 0.45 kg·cm (≈ 0.044 N·m) stall at 1100 RPM no-load. Six of those for a 1.8 kg, 45 cm biped is a plausible-but-unproven choice; a standing/walking Scout may need higher gear ratios (the same page lists 100:1, 150:1, 210:1, 298:1 and 380:1 versions and their stall torques — up to 5.0 kg·cm — but **no prices for those variants were on the page I fetched**, so I did not cost them). Per mandate §5 this must be settled in simulation before anything is bought. **The $158.70 motor line is the number most likely to change.**
5. **No fetched price for the camera, battery, filament, tendon, dock hardware or wiring**, and no fetched evidence at all for the mass of the assembly (the 1.8 kg target is from the concept file, not something I measured).
6. **Tariffs/duty are visibly in play** — a distributor listing that appeared in my search results stated that its displayed price "includes applicable duties and tariffs" — but I did not fetch it into any number, so every price here is ex-tax, ex-shipping US list.
7. **I did not verify kit-style packaging costs** (box, printed build guide, foam, spares), which a sold Explorer Kit needs and which typically add several dollars per unit.
8. **Honesty note on the label I would not defend:** line 8 (TMF8806, $12.50) is a price I read in the sidebar of a page I fetched, not on that part's own product page. It is real text from a fetched URL, but I am flagging it as the weakest "measured" claim in this file.
