# Kodama Scout (K-01) Explorer Kit — Sourced Parts-Cost Estimate

**Trial candidate:** qwen/qwen3.8-27b · **Date:** 2026-10-31 · **Basis:** concept in `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` (small standalone **humanoid-form** scout, ~45 cm, ~1.8 kg, Pi-5-class computer, tendon actuation, Dock-0 clamping, "assemble anywhere"). This is **not** a quadruped; walking is a combined form (hexapod = 6 units).

**Method:** every "measured" price below was fetched from the cited vendor page on 2026-10-31 (URLs in §6). "Inferred" = computed from fetched numbers or stated engineering assumptions. "Guessed" = no price could be fetched; typical street price, flagged explicitly.

## 1. Bill of materials (one kit)

| # | Part | Why it's needed | Specific purchasable example | Unit $ | Qty | Line $ | Source (fetched) | Label |
|---|------|-----------------|------------------------------|-------:|----:|-------:|------------------|-------|
| 1 | SBC: Raspberry Pi 5, 8 GB | "Pi 5-class computer": local autonomy, camera ISP, peer-to-peer swarm sync | Raspberry Pi 5 8GB (Adafruit product 5813) | 200.00 | 1 | 200.00 | adafruit.com/product/5813 | measured |
| 2 | Storage: 32 GB microSD A2 | OS + local continuity memory | Generic 32 GB A2 UHS-I card (e.g., SanDisk Ultra 32GB) | 10.00 | 1 | 10.00 | — (no page fetched) | guessed |
| 3 | Camera: Pi Camera Module 3, 12 MP autofocus | Field vision / spatial mapping; supported by libcamera | Raspberry Pi Camera Module 3 Standard (Adafruit 5657, 75° AF) | 29.25 | 1 | 29.25 | adafruit.com/product/5657 | measured |
| 4 | Camera cable spare | 200 mm FPC cable ships with cam; spare for routing | Pi 5 FPC camera cable (price shown on Adafruit 5657 page) | 2.70 | 1 | 2.70 | adafruit.com/product/5657 | measured |
| 5 | IMU: BNO055 9-DoF | Absolute orientation (quaternion/Euler @100 Hz) for balance control of a biped | Adafruit 9-DoF BNO055 breakout (product 2472) | 34.95 | 1 | 34.95 | adafruit.com/product/2472 | measured |
| 6 | Actuators: 8 × Hitec HS-5645MG | Tendon-drive for 8 primary joints (2× hip pitch, 2× knee, 2× shoulder pitch, 2× elbow). 12.1 kgf·cm (1.19 Nm) @6 V, metal gear train, 60 g each, 3.5–6.8 V. Servo gearbox also gives the passive holding/brake the mandate asks for | Hitec HS-5645MG (hitecrcd.com, part 35645S) | 59.99 | 8 | 479.92 | hitecrcd.com/hs-5645mg-high-torque-metal-gear-digital-sport-servo | measured |
| 7 | Servo driver: PCA9685 16-ch I2C | Drives all 8 servos from Pi I2C, 12-bit PWM; headroom to 16 (antagonistic upgrade) | Adafruit 16-Channel 12-bit PWM/Servo Driver, PCA9685 (product 1411) | 17.50 | 1 | 17.50 | adafruit.com/product/1411 | measured |
| 8 | Battery: 4S 14.8 V 2200 mAh Li-ion w/ protection PCB | Powers 4-servo rail, Pi (via buck), ~32.56 Wh; protected pack = safer than loose cells | Tenergy 14.8 V 2200 mAh 4S1P Li-ion pack w/ PCB (P/N 31021) | 57.99 | 1 | 57.99 | power.tenergy.com/battery-packs/li-ion-packs/14-8v/ | measured |
| 9 | Solar: 10 W 12 V monocrystalline panel | "Solar field scout": field top-up. 18.34 Vmp / 0.55 A suits a 4S (16.8 V) charge controller | Newpowa 10 W 12 V mono panel NPA10S-12J | 26.49 | 1 | 26.49 | newpowa.com/10w-monocrystalline-12v-solar-panel/ | measured |
| 10 | Solar charge controller 12 V (PWM or MPPT) | Regulates panel → 4S pack; protects against overcharge | e.g., 12 V 10–20 A MPPT controller (EPEVER-class) | 25.00 | 1 | 25.00 | — (no page fetched) | guessed |
| 11 | Power rails: 14.8 V→5 V 5 A + 14.8 V→6 V 6 A buck converters | Pi 5 wants 5 V/5 A (27 W PD); HS-5645MG wants 5–6 V (max 6.8 V) | 2 × 14.8 V-input DC-DC buck modules (e.g., 5 A class) | 20.00 | 1 | 20.00 | — (no page fetched) | guessed |
| 12 | Tendon: 100 m braided Dacron/Dyneema line, 1.5 mm | Tendon routing from central servo spools to joint pulleys (wear/stretch to be simulated) | RC/hardware-store braided line spool | 15.00 | 1 | 15.00 | — (no page fetched) | guessed |
| 13 | Structure: printed shell, limbs, Dock-0 clamps | Torso, limb booms, positive-locking clamp bodies, panel mount; ~600 g PETG | JLC3DP FDM printing (instant quote "from $1.00"), or self-print (~$12–15 filament only) | 35.00 | 1 | 35.00 | jlcpcb.com/3d-printing (reference only, not fetched — quote-based) | inferred |
| 14 | Dock-0 hardware: 12 × N52 neodymium magnets (10×5 mm) + M3 screws/nuts + release pins | Positive-locking inter-unit holds (leg-to-shoulder, arm-to-body); magnets give pull-in, mechanical clamp gives the positive lock | Assorted magnet pack + M3 hardware bag | 20.00 | 1 | 20.00 | — (no page fetched) | guessed |
| 15 | Wiring & protection: XT60/JST connectors, fuses, e-stop switch, heatshrink, terminal blocks, caps | Safe power distribution incl. emergency stop (mandate §5) | Misc harness kit | 25.00 | 1 | 25.00 | — (no page fetched) | guessed |

### Subtotals (one kit)

| Bucket | $ | Label |
|--------|-----:|-------|
| Measured (fetched pages): items 1,3,4,5,6,7,8,9 | 848.80 | measured |
| Inferred: item 13 | 35.00 | inferred |
| Guessed: items 2,10,11,12,14,15 | 115.00 | guessed |
| **Total, one kit** | **998.80** | **~$999** |

Roughly 85 % of the bill is on fetched vendor pages. Add ~10 % contingency for freight/failure parts → **~$1,100 landed per kit**.

### Price at 10 kits (volume where tiers exist)

| Item | 10-kit math | 10-kit $ |
|------|-------------|---------:|
| Pi 5 8 GB | $200.00 × 10 (no volume tier; Adafruit caps 2/customer — reseller needed) | 2,000.00 |
| BNO055 | $31.46 × 10 (10–99 tier) | 314.60 |
| PCA9685 | $15.75 × 10 (10–99 tier) | 157.50 |
| Servos, battery, solar, camera, cable, guessed items | unchanged (no tiers fetched) | 7,463.50 |
| **10 kits** | | **9,935.60** |

≈ **$993.56/kit at 10** (savings $52.40, mostly IMU + driver tiers). *Inferred* from fetched tier prices.

## 2. Sanity checks (all inferred from fetched specs)

- **Mass:** Pi 5 ~55 g + 8 × 60 g servos + ~300 g battery + ~500 g structure + ~10 g camera + ~3 g IMU + ~150 g wiring/hardware ≈ **1.5 kg core** (excl. 1.13 kg solar panel) → consistent with the ~1.8 kg concept. The rigid 2.5 lb solar panel is a field accessory, not core mass.
- **Torque:** HS-5645MG = 168 oz-in = 1.19 Nm @6 V; knee static load ≈ 0.9 kg × 9.81 m/s² × 0.06 m ≈ 0.53 Nm → ~2.2× static margin at 1:1 pulley ratio; dynamic walking peaks untested — **must be simulated before buying hardware** (mandate §5).
- **Runtime:** 32.56 Wh ÷ (14.8 V × 0.5–1 A avg) ≈ **2–4 h** active walking (Pi 5 at ~5 W included in the estimate range). Guessed duty cycle.
- **Charge:** 10 W panel at 0.55 A ≈ 6–10 W net into a 16.8 V 4S pack → ~3–5 h of sun to recover a full walking discharge. *Inferred.*

## 3. Alternatives considered (why not selected)

- **HS-645MG analog, $43.99** (fetched, same page) — same torque class, digital version chosen for smoother walking; saves $128/kit if analog is acceptable.
- **4 GB Pi 5, $130.00** (fetched, same page) — saves $70/kit; 8 GB kept for camera ISP + local AI headroom.
- **DSSERVO DS3225 25 kg·cm (≈2.45 Nm)** — more torque, but only sourced via Amazon/AliExpress/Walmart (all blocked or no price in search results on trial day); Hitec is a US-direct, in-stock, datasheet-verified source.
- **HS-805MG "mega" servo** — 140 g+ class for 1/5-scale trucks; too heavy for a 1.8 kg unit. Rejected on mass.
- **16 servos (antagonistic pairs)** — doubles item 6 to +$480/kit; the mandate lists antagonistic pairs *to investigate*, not to buy. v0.1 uses single-actuator joints + servo-holding; PCA9685 already has the channel headroom.
- **Depth camera (e.g., Orbbec-class)** — better spatial mapping but +$100–250; Pi Camera 3 kept for v0.1 cost. Not priced on trial day (see §5).

## 4. What I couldn't find or am unsure of

1. **No fetched price for:** microSD, solar charge controller, buck converters, tendon line, dock magnets/hardware, wiring kit (rows 2, 10–12, 14, 15 = $115, all labeled *guessed*). A second sourcing pass should replace these with fetched prices before the number is used commercially.
2. **3D-print cost is quote-based:** JLCPCB/JLC3DP advertise "from $1.00"/"from $0.30" per part (search snippets, pages not fetched); the $35 line is an inference on ~600 g of PETG. Self-printing drops it to ~$12–15 filament (guessed).
3. **Servo voltage headroom:** HS-5645MG is rated 3.5–6.8 V (2S LiFe); it will run off a 6 V buck rail from the 4S pack, *not* straight off the pack. The buck rails (item 11) are load-bearing for the design and unpriced.
4. **Solar panel mass:** 2.5 lb rigid panel is the only 10 W/12 V panel I could fetch; a flexible 10 W film (~300 g, ~$25–35) would be a better fit but I found no fetched price for one.
5. **Dock-0 is the real unknown:** clamp geometry, load path, and inter-unit power/data connectors (mandate's defining problem) have no off-the-shelf part; row 14 is a placeholder, and the printed-structure cost will move with the final clamp design.
6. **Adafruit caps Pi 5 at 2/customer** — a 10-kit batch needs a reseller (e.g., CanaKit/PiShop) or Raspberry Pi direct; volume pricing unknown.
7. **2026 component inflation:** Pi 5 8 GB is $200 at Adafruit vs. $80 at launch (price tracker snippets on trial day); all "measured" prices are today's prices and will drift.

## 5. Bottom line

- **One Scout Explorer Kit: ~$999 BOM (~$1,100 landed w/ 10 % contingency)**, of which **$848.80 (85 %) is measured on fetched vendor pages** and $150 is inferred/guessed.
- **Ten kits: ~$9,936** (fetched volume tiers applied where they exist).
- The dominant cost is the **8 × Hitec HS-5645MG servos ($479.92, 48 %)** — the single biggest lever is the actuation choice (see §3).

## 6. Sources (all fetched 2026-10-31 unless noted)

1. https://www.adafruit.com/product/5813 — Pi 5 8 GB $200.00; 4 GB $130.00 (max 2/customer)
2. https://www.adafruit.com/product/5657 — Pi Camera 3 Std $29.25 (wide $38.50, NoIR $25.00); cable $2.70
3. https://www.adafruit.com/product/2472 — BNO055 $34.95; tiers $31.46 / $27.96
4. https://www.adafruit.com/product/1411 — PCA9685 16-ch $17.50; tiers $15.75 / $14.00
5. https://hitecrcd.com/hs-5645mg-high-torque-metal-gear-digital-sport-servo/ — HS-5645MG $59.99 (168 oz-in @6 V, 60 g); HS-645MG analog $43.99
6. https://power.tenergy.com/battery-packs/li-ion-packs/14-8v/ — Tenergy 4S packs from $57.99 (P/N 31021, in stock)
7. https://www.newpowa.com/10w-monocrystalline-12v-solar-panel/ — 10 W 12 V mono $26.49 (MSRP $34.99), Vmp 18.34 V
8. https://jlcpcb.com/3d-printing/ — "price starts from $1.00" (search snippet, **not** fetched — reference only)
9. Search-result context (not fetched): Pi 5 2026 price-increase coverage (tomshardware.com, chipradar.io); DSSERVO DS3225 listings (Amazon/Walmart/AliExpress — bot-blocked or no price in snippet)
