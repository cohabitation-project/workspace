# Kodama Scout Explorer Kit — sourced parts-cost estimate

**Author:** deepseek/deepseek-v4.1-flash (candidate seat, same-task trial)
**Date:** 2026-10-31
**Scope:** bill-of-materials cost for **one** Kodama Scout (K-01) "Explorer Kit" — the ~45 cm, ~1.8 kg solar field scout with a Raspberry Pi 5-class computer, described in `../../concept/WHAT-KODAMA-IS.md`. This is **not** a quadruped/dog estimate. Prices are USD, single-unit retail, **before shipping and tax**, as fetched on 2026-10-31.
**Labels used on every number:** `measured` = I fetched that page and read that price; `inferred` = arithmetic on fetched numbers; `guessed` = my estimate with no fetched price behind it.

**Headline:** one kit ≈ **$389** at single-unit retail, of which **$318 (82%) is measured** and **$71 (18%) is guessed**. Actuators are the single largest line ($167, 43% of the kit). Ten kits ≈ **$3,850** (~$385/kit) using only the two volume tiers I could actually find.

---

## 1. Bill of materials (one kit)

| # | Part | Why it's needed | Specific purchasable example | Unit price | Qty | Line total | Label | Source URL actually fetched |
|---|---|---|---|---|---|---|---|---|
| 1 | Single-board computer | Brain: vision, ROS 2 / Python control, Wi-Fi swarm sync | Raspberry Pi 5, **1 GB** variant (Pi-5-class, 2.4 GHz quad Cortex-A76) | $49.50 | 1 | $49.50 | measured | https://www.adafruit.com/product/5812 |
| 2 | Camera | Field scouting: 12 MP autofocus vision; IMX708, Picamera2 | Raspberry Pi Camera Module 3 **Standard** | $29.25 | 1 | $29.25 | measured | https://www.adafruit.com/product/5657 |
| 3 | 9-DoF IMU | Balance / orientation for a walking unit; on-chip fusion | Adafruit BNO085 breakout (STEMMA QT) | $29.50 | 1 | $29.50 | measured | https://www.adafruit.com/product/4754 |
| 4 | Solar panel | "Solar field scout" — daylight top-up | Voltaic P124, 5 V 1.2 W ETFE, IP67, 31.6 g | $14.95 | 1 | $14.95 | measured | https://www.adafruit.com/product/5368 |
| 5 | Solar/LiPo charger | Charge management between panel and battery (bq24074) | Adafruit Universal USB / DC / Solar LiPo charger | $14.95 | 1 | $14.95 | measured | https://www.adafruit.com/product/5368 (listed with price on that page) |
| 6 | Battery | Untethered power; JST-PH + protection circuit | Adafruit LiIon 3.7 V 2000 mAh, 34 g | $12.50 | 1 | $12.50 | measured | https://www.adafruit.com/product/2011 |
| 7 | Joint actuators | Legs + waist + neck of the biped Scout (v0.1 build: servo-per-joint; tendon variant reuses the same motors centrally) | FEETECH FT1117M mini servo, metal gears, 3.5 kg-cm @6 V, 20 g | $16.74 | 10 | $167.40 | measured | https://www.pololu.com/category/23/rc-servos |
| 8 | microSD card, ≥32 GB | OS + model storage for the Pi | e.g. SanDisk 32 GB microSDHC | $8.00 | 1 | $8.00 | guessed | — (not fetched) |
| 9 | Servo/PWM driver + power distribution | 10 servos can't run off Pi GPIO; needs a PWM driver + separate servo rail | e.g. PCA9685 16-channel 12-bit PWM HAT | $15.00 | 1 | $15.00 | guessed | — (not fetched) |
| 10 | Tendon cord | Antagonistic tendon pairs per the mandate (§1) | ~30 lb braided Dyneema / Spectra line | $10.00 | 1 | $10.00 | guessed | — (not fetched) |
| 11 | Docking hardware | Dock-0 positive-locking clamps; magnets are alignment aids, not the load path | Assorted N42 neodymium magnets + steel pins | $8.00 | 1 | $8.00 | guessed | — (not fetched) |
| 12 | Printed structure | Shells, limbs and clamp bodies (printer prints structure, not motors/battery) | ~500 g of PLA/PETG from a ~$20/kg spool | $10.00 | 1 | $10.00 | guessed | — (not fetched) |
| 13 | Fasteners | M2/M3 screws, threaded inserts, pins for the clamps | Assorted M2/M3 stainless kit | $10.00 | 1 | $10.00 | guessed | — (not fetched) |
| 14 | Wiring & connectors | Servo/battery leads, JST and STEMMA QT cables, fusing | Assorted hookup wire, JST-PH/XT30, inline fuse | $10.00 | 1 | $10.00 | guessed | — (not fetched) |

---

## 2. Subtotals and total

| | Amount | Label |
|---|---|---|
| Measured subtotal (lines 1–7) | **$318.05** | inferred (sum of measured prices) |
| Guessed subtotal (lines 8–14) | **$71.00** | guessed |
| **Total, one kit** | **$389.05** | inferred |
| Guessed share of total | 18.2% | inferred |

Cross-checks (arithmetic verified in Python, not by hand):
- If the kit used **8 servos** instead of 10: **$355.57** (line 7 becomes $133.92).
- If the kit used the **Raspberry Pi 5 4 GB** instead of the 1 GB: **$469.55** — because that SKU is listed at **$130.00** `measured` on the same page (memory-driven price rises; Adafruit also lists 8 GB at $200.00 and 16 GB at $350.00). The 1 GB Pi 5 is the honest way to keep a "Pi 5-class" kit near $400.

### Rough price at 10 kits
Measured volume tiers are available on only two lines I fetched:
- BNO085 IMU: 10–99 units = **$26.55** `measured` (saves $2.95/kit)
- LiPo 2000 mAh: 10–99 units = **$11.25** `measured` (saves $1.25/kit)
- No volume tier was shown for the Pi 5, camera, solar panel, charger, or the FEETECH servos. The Pi 5 page actually shows a **max-2-per-customer** limit `measured`, i.e. an outright supply constraint.

| | Amount | Label |
|---|---|---|
| Per-kit cost at 10, using only the two measured tiers | **$384.85** | inferred |
| **10 kits, total** | **$3,848.50** | inferred |
| Saving vs. single-kit pricing | $4.20/kit (1.1%) | inferred |

**Important: 10 kits gets you almost nothing.** The savings above are 1.1% because the discount tiers I could actually verify cover only ~11% of the kit cost. A real 10-kit price would need direct quotes from Pololu (servos) and Raspberry Pi-approved resellers — and the actuators are where the money is.

---

## 3. What I couldn't find, or am unsure of

1. **No volume pricing for the dominant cost.** The 10 servos are $167 (43% of the kit) and I found no published quantity tier for FEETECH servos. Per-kit cost at 10, 100, or 1,000 kits is genuinely unknown to me — it depends on a quote I cannot get from a web page.
2. **The servo count is a design decision, not a sourced fact.** I assumed 10 joint actuators for a 45 cm biped. The DRD/mandate (tendon actuation, motors central in the torso) would use ~6 central motors instead; I kept the per-joint servo variant because a first Explorer build is simpler, but **this is the biggest single lever on the price** and it is a design choice, not a measurement.
3. **7 of 14 lines are guessed** ($71, 18% of the total): microSD, PWM driver, tendon cord, docking magnets, filament, fasteners, wiring/connectors. I ran out of fetch budget; none of these numbers came off a page. Treat the true total as roughly **$360–$410** (inferred range, ±6%) until those lines are fetched.
4. **Not costed at all:** shipping and tax; the 3D printer itself; a charger/DC supply for bench work; a servo-rail buck converter; fail-safe fusing/overload cutout; spare parts; assembly labour; and tooling. The kit price is parts only.
5. **The solar line is optimistic.** $14.95 buys 1.2 W peak, and the Pi 5 alone pulls far more than that when awake — the panel is a top-up, not a power source for walking. No runtime numbers are claimed here (`simulated`/`measured` runtime does not exist yet for this design).
6. **Weight is not verified.** Actuators total ~200 g (10 × 20 g `measured` per-unit weight from the Pololu listing) against a 1.8 kg target, but I have no mass budget for chassis, battery, compute and clamps. The 1.8 kg figure is asserted in the concept doc, not measured on hardware.
7. **Torque fit is unverified.** 3.5 kg-cm mini servos may be undersized for a 1.8 kg unit that must also *carry other units when docked* (tower/bridge load paths). Choosing motors before the load-path calculation exists would repeat the DRD v0.1 mistake of guessing torques.
8. **One price was read from a related-product line, not a dedicated page:** the $14.95 bq24074 solar charger appears with its price on the solar-panel page (line 5). It is a real listed price on a page I fetched, but I did not open its own product page.
9. **Prices are single-day and volatile.** Raspberry Pi memory-driven increases are visible on the same page (4 GB at $130). Re-verify before quoting a customer.
