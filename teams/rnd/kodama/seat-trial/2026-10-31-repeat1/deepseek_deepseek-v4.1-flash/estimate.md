# Kodama Scout Explorer Kit — sourced parts-cost estimate

**Author:** deepseek/deepseek-v4.1-flash (candidate seat, trial `2026-10-31-repeat1`)
**Date of price fetches:** 2026-10-31 (all prices fetched live in this session; US retail, USD)
**Subject:** the *Scout (K-01)* base unit described in `../../concept/WHAT-KODAMA-IS.md` — a ~45 cm, ~1.8 kg, Raspberry Pi 5-class **standalone humanoid-form** unit that can dock with other Scouts to form hexapod / bridge / tower / humanoid. **Not a quadruped.** Nothing here is a dog-bot BOM.

**What "one Explorer Kit" means in this estimate** (stated so the number is auditable):
1 × Scout unit (compute, sensing, actuation, power, solar, docking hardware, printed structure),
plus the bench items a buyer needs on day one (mains PSU, microSD, cooling), plus one 1 kg spool of PETG
(the printed set — shells, limbs, clamp jaws — is printed by the buyer per the open-design premise).

**Labels:** `measured` = I fetched this exact price from the URL in that row. `inferred` = arithmetic on
fetched numbers. `guessed` = I could not fetch it; the number is my estimate and is called a guess.

---

## 1. Bill of materials — one Scout Explorer Kit

| # | Part | Why it's needed | Specific purchasable example | Unit price | Label | Qty | Line total | Source URL actually fetched |
|---|------|-----------------|------------------------------|-----------:|:-----:|:---:|-----------:|-----------------------------|
| 1 | Compute | "Raspberry Pi 5-class" brain running local control + vision | Raspberry Pi 5 **4GB** (SC1111) | $110.00 | measured | 1 | $110.00 | https://www.pishop.us/search.php?search_query=raspberry+pi+5 |
| 2 | Storage / OS | Pi 5 boots from microSD; holds ROS 2 + models | SanDisk Ultra microSDHC 32GB Class 10 | $13.95 | measured | 1 | $13.95 | https://www.pishop.us/search.php?search_query=micro+sd+card+32gb |
| 3 | Vision | Field scouting: mapping, docking alignment, recording | Raspberry Pi Camera Module 3 (IMX708, autofocus, 12 MP) | $29.25 | measured | 1 | $29.25 | https://www.pishop.us/search.php?search_query=camera+module+3 |
| 4 | IMU | Balance and orientation; DRD §5 minimum is a 6-axis IMU | Adafruit LSM6DSOX + LIS3MDL 9-DoF IMU (STEMMA QT, PID 4517) | $19.95 | measured | 1 | $19.95 | https://www.adafruit.com/search?q=9-dof+imu |
| 5 | PWM / servo controller | Pi 5 cannot drive 9 servos off GPIO; I²C servo driver | Adafruit 16-Channel PWM/Servo **Bonnet** for Pi (PCA9685, PID 3416) | $12.50 | measured | 1 | $12.50 | https://www.adafruit.com/search?q=16-channel+pwm+servo+driver |
| 6 | Joint actuators | 8 driven joints (2 DoF per arm, 2 DoF per leg) via tendon/capstan; +1 for the Dock-0 clamp latch | TowerPro **MG92B** high-torque metal-gear micro servo (PID 2307, ~3.5 kg·cm @ 6 V) | $11.95 | measured | 9 | $107.55 | https://www.adafruit.com/search?q=servo+motor |
| 7 | Battery | Untethered walking; DRD §6 requires a swappable pack — two packs = field swap | Lithium Ion Battery Pack 3.7 V 4400 mAh (PID 354) | $19.95 | measured | 2 | $39.90 | https://www.adafruit.com/search?q=lithium+ion+polymer+battery+2000mAh |
| 8 | Solar charge + 5 V boost | Field recharging from the panel into the pack, plus a 5 V rail | Adafruit **bq25185** USB/DC/Solar Charger with 5 V Boost Board (PID 6106) | $8.95 | measured | 1 | $8.95 | https://www.adafruit.com/search?q=solar+charger |
| 9 | 5 V regulator (high current) | bq25185 boost cannot feed a Pi 5 at full load — separate 5 V/5 A step-down from the pack | 5 V/5 A DC-DC module (generic) | $12.00 | **guessed** | 1 | $12.00 | not found — see §4 (Pololu search 404'd) |
| 10 | Solar panel | The "field" in field scout: recharge on site | 5 V 5 W ETFE Solar Panel — Voltaic P105 (PID 5367) | $34.95 | measured | 1 | $34.95 | https://www.adafruit.com/search?q=solar+panel |
| 11 | Printed structure | Shells, limbs, clamps — the "replicate anywhere" half of the concept | Jessie Premium **PETG** 1.75 mm Black 1 kg | $24.99 | measured | 1 | $24.99 | https://www.printedsolid.com/collections/petg-3d-printer-filament |
| 12 | Cooling / brain enclosure | Pi 5 throttles without active cooling; case doubles as the torso module | Raspberry Pi Case for Pi 5 (4-part, active fan, SC1160) | $10.95 | measured | 1 | $10.95 | https://www.pishop.us/search.php?search_query=raspberry+pi+5 |
| 13 | Bench PSU | Dev/charge/bench power; DRD §6 direct-power bench work | Raspberry Pi 27W USB-C Power Supply, US (SC1158) | $12.95 | measured | 1 | $12.95 | https://www.pishop.us/search.php?search_query=raspberry+pi+5 |
| 14 | Servo cabling | Joint servos sit out in the limbs, away from the torso board | Servo Extension Cable 50 cm (PID 973) | $2.50 | measured | 4 | $10.00 | https://www.adafruit.com/search?q=16-channel+pwm+servo+driver |
| 15 | Fasteners | Clamp jaws, brackets, servo mounts; heat-set inserts survive service | M3 screw + heat-set insert assortment (kit) | $12.00 | **guessed** | 1 | $12.00 | not found — see §4 |
| 16 | Tendon cord | Mandate §1: tendon/cord actuation is the chosen transmission | Dyneema / braided low-stretch cord, ~30 m | $8.00 | **guessed** | 1 | $8.00 | not found — see §4 |
| 17 | Dock-0 alignment magnets | Magnetic pre-alignment must not carry load (LIBRARY.md ref. 1) — it aligns, clamps load | Neodymium magnet pack (10 mm discs) | $5.00 | **guessed** | 1 | $5.00 | not found — Adafruit magnet search returned no usable magnets: https://www.adafruit.com/search?q=neodymium+magnet |
| 18 | Wire & connectors | Battery/servo/power bus across docks, JST-PH pigtails, silicone wire | JST-PH + silicone wire assortment | $6.00 | **guessed** | 1 | $6.00 | not found — see §4 |

### Subtotals and total (one kit)

| | Amount |
|---|---:|
| **Measured subtotal** (13 measured lines, 25 of the kit's 30 units) | **$435.89** |
| **Guessed subtotal** (5 lines, 5 units) | **$43.00** |
| **One-kit total** | **$478.89** |
| Share of the kit that is measured | 91.0% |

Arithmetic checked with `run_python` (18 lines × unit price × qty; 30 units total). Excludes: shipping,
sales tax, 3D printer, soldering iron/assembly tools, print failures, spare servo/battery for wear, labour.

### Rough price at 10 kits

* **Plain list, 10 × $478.89 = $4,788.90** — `inferred`.
* The **only** volume pricing I actually found and fetched: PrintedSolid lists "Buy 5+ for 5% off" on that
  same filament line (`measured`, same URL as line 11). At 10 spools that is −$1.25/kit →
  **10 kits ≈ $4,776.40**, i.e. **$477.64/kit** — `inferred`.
* I found **no** fetched volume price for the Pi 5, the camera, the servos, or the panel. PiShop.us advertises
  a "For Commercial Customers" channel with no published price, so **I am not claiming a distributor
  discount I did not see**. A real 10-kit quote should be sought for lines 1, 3, 6, 7 before that number
  is used for anything (see §4).

---

## 2. Cross-checks I ran (all `inferred`, no physical test)

**Energy / runtime** — battery 2 × 3.7 V × 4.4 Ah = **32.56 Wh**; usable at 80 % DoD = **26.05 Wh**.
- Pi 5 idle only (~3 W) → ~8.7 h
- Pi 5 + electronics (~5 W) → ~5.2 h
- walking with 4 joints loaded (~9 W) → ~2.9 h

**Solar recharge** — 5 W panel derated ×0.70 → ~3.5 W → 32.56 Wh / 3.5 W ≈ **9.3 h** of good sun per
full charge (7.4 h at 80 % DoD). So solar = top-up on a field day, not a same-day turnaround.
Real panel output depends on angle/cloud, neither of which I modelled.

**Torque sanity** — MG92B ≈ 3.5 kg·cm ≈ 0.34 N·m stall at 6 V. A 1.8 kg biped holding a stance needs
order 0.4–0.7 N·m at the hip, so I specified a **2:1 tendon capstan reduction** in the joint. That is a
*design assumption I have not simulated or measured* — see §4. This is the single most likely place
where this BOM is wrong.

**Mass sanity** (all component masses `guessed`) — compute 48 g, camera 5 g, IMU 3 g, bonnet 20 g,
9 servos 126 g, 2 packs 180 g, charger 5 g, panel 120 g, wire/misc 80 g → ~587 g of bought parts, leaving
~600 g for printed PETG structure inside the 1.8 kg target, with ~612 g of headroom. Tight but plausible.

---

## 3. Sources fetched (what each one gave me)

| URL (fetched this session) | Prices taken from it |
|---|---|
| https://www.pishop.us/search.php?search_query=raspberry+pi+5 | Pi 5 4GB $110.00; 8GB $175.00; 2GB $77.50; 1GB $45.00; Pi 5 case $10.95; 27W USB-C PSU $12.95 |
| https://www.pishop.us/search.php?search_query=camera+module+3 | Camera Module 3 $29.25; Wide $38.50; NoIR $27.50 |
| https://www.pishop.us/search.php?search_query=micro+sd+card+32gb | SanDisk Ultra 32GB $13.95; Pi-OS-preloaded 32GB $14.95 |
| https://www.adafruit.com/search?q=9-dof+imu | LSM6DSOX+LIS3MDL $19.95; ICM-20948 $19.95; BNO085 $29.50; BNO055 $34.95 |
| https://www.adafruit.com/search?q=16-channel+pwm+servo+driver | Servo Bonnet PID 3416 $12.50; PCA9685 breakout PID 815 $14.95 (out of stock); Mini Kit PID 2327 $17.50; servo extension cable 50 cm $2.50 |
| https://www.adafruit.com/search?q=servo+motor | MG92B $11.95; MG90D $9.95; SG92R $5.95; SG-5010 $12.00 |
| https://www.adafruit.com/search?q=lithium+ion+polymer+battery+2000mAh | 3.7 V 2000 mAh $12.50; 3.7 V 4400 mAh pack $19.95; 6600 mAh pack $24.50; 2500 mAh $14.95 |
| https://www.adafruit.com/search?q=solar+charger | bq25185 5V-boost $8.95; bq25185 plain $6.95; bq24074 $14.95; PID 390 $17.50 (out of stock) |
| https://www.adafruit.com/search?q=solar+panel | 5V 5W $34.95; 6V 2W $20.95; 5V 10W $64.95; 5V 1.2W $14.95; 5V 0.6W $8.95 |
| https://www.printedsolid.com/collections/petg-3d-printer-filament | Jessie Premium PETG 1 kg $24.99 and "Buy 5+ for 5% off"; PLA 1 kg $24.99 — **note: this URL returned a 404 page, and these prices came from the store's product listing rendered on that 404 page** |
| https://www.adafruit.com/search?q=neodymium+magnet | nothing usable (2 unrelated products) → magnets left `guessed` |
| https://www.pololu.com/search/result?q=micro+metal+gearmotor | 404 — no Pololu gearmotor price obtained |
| https://www.matterhackers.com/search?q=PETG%20filament | 404 — no filament price obtained |

---

## 4. What I couldn't find, and what I'm unsure of

**Couldn't find (left as `guessed`, clearly marked):**
1. **Neodymium magnets suitable for Dock-0.** Adafruit's magnet search returned only a pin-back and a
   soldering splint. I did not try a magnet specialist (K&J, McMaster) before running out of calls.
2. **Fastener kit (M3 + heat-set inserts).** No vendor page fetched; $12 is a shop-floor estimate.
3. **Tendon cord (Dyneema/braided line).** No price fetched; $8 for ~30 m is an estimate.
4. **5 V/5 A regulator.** Pololu's search 404'd and I did not get a regulator price.
5. **Dock-0 hardware proper** — clamp jaws are printed (line 11), but the pins/shafts/latch return spring
   are inside the guessed fastener line.
6. **Volume pricing for anything but filament.** Nothing else was published on the pages I fetched.

**Unsure / honest warnings about the numbers I did measure:**
- **The Pi 5 price looks abnormal.** $110 for a 4 GB board (and $175 for 8 GB) is far above the historical
  ~$60/$80 launch pricing. A page on that same PiShop site discusses the DRAM/HBM supply squeeze. Either
  this is a shortage-era retail markup or the store's list has moved for other reasons — **I only know what
  the page said when I fetched it.** Alternatives I *did* fetch: Pi 5 2GB $77.50, Pi 5 1GB $45.00,
  Pi Zero 2 W starter kit $74.95. If the Scout can live on 2 GB, the kit drops ~$32.50, and that is a design
  decision (vision models + ROS 2 want ≥4 GB), not a purchasing one. **Verify this line before quoting it.**
- **Single-retailer, single-time.** Every `measured` price is one US retailer on one day (2026-10-31).
  Prices are not quotes, no shipping/tax, and several fetched items show as out of stock on their page.
  Cheaper sources for the same parts may exist — I did not fetch them.
- **The actuation assumption is unvalidated.** MG92B micro servos + 2:1 capstan is the cheapest path that
  could plausibly hold a stance, but the mandate's own direction is central motors with tendon transmission
  (§1). I did not obtain a geared-DC or serial-bus-servo price, so **the actuator choice is the weakest part
  of this estimate** — a proper comparison needs a second pass with motor + driver prices.
- **The solar/power path does not close for a Pi 5.** The bq25185 boost board (line 8) cannot sustain a Pi 5
  under load; line 9 exists because of that. I did not verify line 9's current rating against a fetched spec.
- **Docking loads are not priced.** Nothing here accounts for stronger printed material, metal inserts, or
  clamp redesign when 12–24 Scouts stack into a tower/bridge. `WHAT-KODAMA-IS.md` says the body must carry
  others' loads when docked — this kit is costed as **one free-roaming scout**, not as a swarming set.
- **3D printing is assumed, not bought.** The kit price assumes the buyer owns a printer and that the PETG
  spool is enough. Print failures, supports, and re-prints are not costed.
- **Not included:** sales tax, shipping, customs, the 3D printer, tools, spare parts, assembly labour, any
  margin for a sellable product (this is a parts-cost estimate, not a retail price).

---

*Every number above is one of: fetched and cited (`measured`), arithmetic on fetched numbers (`inferred`),
or my own estimate (`guessed`). No source URL appears in this file that I did not actually fetch in this
session; where a URL 404'd, I say so and do not credit it as a price source.*
