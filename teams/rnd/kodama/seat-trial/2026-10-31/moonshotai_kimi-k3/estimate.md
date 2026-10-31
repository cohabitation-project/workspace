# Kodama Scout Explorer Kit — Sourced Parts-Cost Estimate

**Prepared:** 2026-10-31 · Candidate seat trial (moonshotai/kimi-k3)
**Scope:** One buildable **K-01 Scout** unit per `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md`: a ~45 cm, ~1.8 kg standalone humanoid-form scout — **not** a quadruped — with a Pi-5-class brain, tendon-style actuation from torso-mounted bus servos, printed structure with dock-ready clamp hardpoints, and solar field power (panel + 2S battery) so it can operate away from the bench.

## Labels
- **[measured]** — price I actually fetched from the linked page on 2026-10-31.
- **[inferred]** — computed from measured numbers (line totals, subtotals).
- **[guessed]** — my estimate; **no price was fetched**. Never treat these as found prices.
- Quantities are a design choice (14 DOF per the mandate's 14-actuator hypothesis), not prices.

## Bill of materials (1 kit)

| # | Part | Why it's needed | Purchasable example | Unit price | Qty | Line total | Source (actually fetched) |
|---|------|-----------------|---------------------|-----------|-----|-----------|---------------------------|
| 1 | Main computer | Scout brain: vision, gait, dock-sync | Raspberry Pi 5 4GB (PiShop.us) | $110.00 [measured] | 1 | $110.00 [inferred] | https://www.pishop.us/product/raspberry-pi-5-4gb/ |
| 2 | Camera | Machine vision for scouting/dock alignment | Raspberry Pi Camera Module 3 | $29.25 [measured] | 1 | $29.25 [inferred] | https://www.pishop.us/product-category/raspberry-pi/raspberry-pi-cameras/camera-modules/ |
| 3 | Camera cable (Pi 5) | Pi 5 needs the new smaller MIPI cable | PiShop camera cable for Pi 5 | $3.95 [measured] | 1 | $3.95 [inferred] | https://www.pishop.us/product/raspberry-pi-5-4gb/ (related item on fetched page) |
| 4 | Bus servos, 12V/30 kg·cm option | 14-DOF actuation; torso-mounted, tendon-routed per mandate; position/load feedback needed for docking | Waveshare ST3215 serial bus servo | $21.99 [measured] | 14 | $307.86 [inferred] | https://www.waveshare.com/st3215-servo.htm |
| 5 | Servo driver boards | UART bridge + power distribution; 2 buses (limbs split) for fault isolation | Waveshare Bus Servo Adapter (A), SKU 25514 | $4.99 [measured] | 2 | $9.98 [inferred] | https://www.waveshare.com/product/robotics/drivers-sensors/drivers.htm |
| 6 | Solar panel | Field charging, off-grid scout ops | Newpowa 10W 12V mono (Vmp 18.34V, Imp 0.55A) | $26.49 [measured] | 1 | $26.49 [inferred] | https://www.newpowa.com/10w-monocrystalline-12v-solar-panel/ |
| 7 | Battery cells | 2S (7.4V nominal) energy store; fits servo 6–12.6V input range; per-cell protection included | Adafruit 18650 3.7V 2200mAh, PID 1781 | $9.95 [measured] | 2 | $19.90 [inferred] | https://www.adafruit.com/product/1781 |
| 8 | Bench supply | Bring-up/testing on the bench (solar is the field source) | PiShop 27W USB-C PD supply | $11.95 [measured] | 1 | $11.95 [inferred] | https://www.pishop.us/product/raspberry-pi-5-4gb/ (related item on fetched page) |
| 9 | 2S solar charge module | CCCV/balance charging of 2S pack from 12V panel | CN3791-based 2S MPPT module (generic) | $10.00 [guessed] | 1 | $10.00 [guessed] | — not fetched |
| 10 | 5V/5A buck converter | 2S pack → 5V/5A USB-C for the Pi 5 | Generic LM2596-class/XL4015 buck | $10.00 [guessed] | 1 | $10.00 [guessed] | — not fetched |
| 11 | IMU (9-DoF) | Balance, gait feedback, fall detection | ICM-20948-class breakout | $15.00 [guessed] | 1 | $15.00 [guessed] | — not fetched |
| 12 | microSD 64GB | OS + logs | Generic A2 card | $8.00 [guessed] | 1 | $8.00 [guessed] | — not fetched |
| 13 | Battery holder | Holds 2×18650 | Generic 2×18650 holder | $4.00 [guessed] | 1 | $4.00 [guessed] | — not fetched |
| 14 | PLA+ filament, 1 kg | Printed shells, limbs, tendon guides, Dock-0 clamp bodies (~0.4 kg used [guessed]) | Generic PLA+ 1kg spool | $22.00 [guessed] | 1 | $22.00 [guessed] | — not fetched |
| 15 | Tendon cord | Antagonistic tendon actuation (mandate §1) | Dyneema/Spectra braid, ~50 m | $12.00 [guessed] | 1 | $12.00 [guessed] | — not fetched |
| 16 | Fasteners, inserts, bearings, dock springs | Assembly + positive-lock clamp hardware for Dock-0 | Generic M2/M3 kit + MR-class bearings | $25.00 [guessed] | 1 | $25.00 [guessed] | — not fetched |
| 17 | Wire, JST, heat-shrink | Power/data harness across units | Generic assortment | $10.00 [guessed] | 1 | $10.00 [guessed] | — not fetched |

## Subtotals and total

| Group | Amount | Label |
|---|---|---|
| Actuation (#4–5) | $317.84 | [inferred] |
| Compute + sensors (#1–3, 11–12) | $166.20 | [inferred: $151.20 measured lines + $23.00 guessed lines] |
| Power + solar (#6–10, 13, 8) | $82.34 | [inferred: $58.34 measured lines + $24.00 guessed lines] |
| Structure + harness (#14–17) | $69.00 | [guessed] |
| **Measured lines subtotal** | **$519.38** | [inferred] |
| **Guessed lines subtotal** | **$116.00** | [guessed] |
| **TOTAL, 1 kit** | **$635.38** | [inferred mix: 82% measured by value] |

## Price at 10 kits
- Only one fetched volume tier: Adafruit 18650 drops to **$8.96 at qty 10–99** [measured, same URL as #7]. Buying 20 cells saves $19.80 [inferred].
- No other volume pricing was fetched, so all other lines are held flat [guessed assumption].
- **10 kits ≈ $6,334.00 total, ≈ $633.40/kit** [inferred]. Waveshare/PiShop/Newpowa quantity discounts are plausible but unverified.

## What I couldn't find or am unsure of
1. **Pi 5 price variance:** I fetched $110.00 at PiShop.us; official MSRP is reportedly lower, but I did not fetch a second source, so $110.00 is the only number I stand behind. Worth shopping before purchase.
2. **Servo option pricing:** The Waveshare page lists "$16.99–$21.99" across the 7.4V/19.5 kg·cm and 12V/30 kg·cm options without clearly mapping price→option. I budgeted the high end ($21.99) for the 12V variant, chosen because its 6–12.6V input range accepts a raw 2S pack (6–8.4V) in-spec. If the 7.4V variant is $16.99 and pack voltage is clamped ≤7.4V, actuation drops by up to ~$70/kit [inferred from measured range].
3. **Torque adequacy is inferred, not simulated:** 14 × ~19.5–30 kg·cm servos with tendon reduction *should* move a 1.8 kg/45 cm biped, but this needs MuJoCo validation per mandate §5 before buying.
4. **Not fetched (all [guessed]):** 2S charge module, buck converter, IMU, microSD, holder, filament, tendon cord, fasteners, wire. AliExpress/Amazon listings exist but I could not fetch verifiable prices within budget; guesses are conservative hobby-market figures.
5. **Excluded:** 3D printer, tools, shipping/tax, Dock-0 clamp mechanization beyond springs/fasteners, and the inter-unit power/data connector — none are priced here and the dock connector in particular is an open design problem (mandate §3).
6. **Prices are point-in-time** (fetched 2026-10-31) and exclude shipping; Newpowa advertises free US-48 shipping on the panel.

**Cost-down path (unpriced, for the record):** hobby PWM servos (MG996R-class) + a 16-ch PWM driver could cut actuation to roughly a third, at the cost of the position/load feedback that docking and tendon-tension control want. Left unresolved pending simulation.
