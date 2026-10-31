# Kodama Scout Explorer Kit — Sourced Parts-Cost Estimate

**Author:** kimi-k3 (R&D seat candidate) · **Date:** 2026-10-31
**Scope:** One Kodama Scout unit (K-01): ~45 cm, ~1.8 kg humanoid-form scout per `concept/WHAT-KODAMA-IS.md` — **not** a quadruped. Kit assumes 16 DoF (2 legs × 5, 2 arms × 3, 1 neck/pan... see note) built on serial-bus smart servos as the v0.1 baseline, with Dyneema tendon cord and docking electromagnets included so buyers can run the mandate §1 tendon/docking experiments.
**Labels:** **[M]** measured (I fetched the page showing this price on 2026-10-31) · **[I]** inferred (computed from fetched numbers) · **[G]** guessed (no live price fetched — treat as placeholder).

---

## Bill of materials

| # | Part | Why it's needed | Specific purchasable example | Unit price | Qty | Line total | Label | Source URL (fetched) |
|---|------|-----------------|------------------------------|-----------:|----:|-----------:|-------|----------------------|
| 1 | Raspberry Pi 5, 4 GB | Main computer ("Pi 5-class" per concept); runs vision + control | Raspberry Pi 5 4GB (Adafruit PID 5812) | $130.00 | 1 | $130.00 | [M] | https://www.adafruit.com/product/5812 |
| 2 | Camera Module 3 (Standard) | Head/eye vision for field scouting | RPi Camera Module 3 Standard, 12MP AF (Adafruit PID 5657) | $29.25 | 1 | $29.25 | [M] | https://www.adafruit.com/product/5657 |
| 3 | Pi 5 FPC camera cable | Pi 5 needs 22-pin→15-pin adapter cable (noted on both pages above) | Raspberry Pi 5 FPC Camera Cable (Adafruit add-on on PID 5657/5812 pages) | $2.70 | 1 | $2.70 | [M] | https://www.adafruit.com/product/5657 |
| 4 | Heatsink set for Pi 5 | Passive cooling under robot load | Set of Heatsinks for Pi 5, 4-pack, copper (PiShop) | $4.95 | 1 | $4.95 | [M] | https://www.pishop.us/product/raspberry-pi-5-8gb/ |
| 5 | Serial bus servo, 12 V / 30 kg·cm | All 16 joints. 30 kg·cm = 2.94 N·m stall [I], meets DRD ≥2 N·m joint target; TTL bus daisy-chains, gives position/load/voltage feedback for balance + dock-load sensing | Waveshare ST3215 (Feetech core), 30kg.cm@12V option | $21.99 | 16 | $351.84 | [M] price / [I] variant mapping | https://www.waveshare.com/st3215-servo.htm |
| 6 | 5 V / 5 A buck regulator | Powers Pi 5 from the 11.1 V battery bus | Pololu D24V50F5 (Pololu #2851) | $32.95 | 1 | $32.95 | [M] | https://www.pololu.com/product/2851 |
| 7 | 27 W USB-C PD supply | Bench development / pre-field top-off (official-spec 5.1 V 5 A) | USB-C PD Power Supply for Pi 5, 27W (PiShop) | $11.95 | 1 | $11.95 | [M] | https://www.pishop.us/product/raspberry-pi-5-8gb/ |
| 8 | 6 V 2 W solar panel, ETFE | Field top-up for the "solar field scout" role (idle charging, not run power — see §Uncertain) | 6V 2W Solar Panel – ETFE – Voltaic P126 (Adafruit PID 5366 / variant on PID 200 page) | $20.95 | 1 | $20.95 | [M] | https://www.adafruit.com/product/200 |
| 9 | Servo driver board (USB/UART↔TTL bus) | Pi 5 talks to the ST3215 daisy chain | Waveshare Bus Servo Adapter / Driver Board | $12.00 | 1 | $12.00 | [G] | — (not fetched; Waveshare page notes driver board NOT included) |
| 10 | 3S 2200 mAh LiPo pack | 11.1 V bus for 16×12 V servos (stall 2.7 A each; pack must source burst current) | Generic RC 3S 2200 mAh 25C+ LiPo | $26.00 | 1 | $26.00 | [G] | — (RobotShop 403-blocked; no live price fetched) |
| 11 | Solar Li-Poly charger board | Safely charges a cell from the 6 V panel | Adafruit Universal USB/DC/Solar LiIon/LiPoly charger (bq24074) | $12.00 | 1 | $12.00 | [G] | — (linked from PID 200 page; price not fetched) |
| 12 | microSD card 32 GB | OS + logs + captured imagery | Class-10 32 GB microSD | $9.00 | 1 | $9.00 | [G] | — |
| 13 | IMU (6-axis) | Balance/walking feedback (DRD §1.4, §5) | MPU-6050-class breakout | $10.00 | 1 | $10.00 | [G] | — |
| 14 | PETG/PLA filament, 1 kg | All printed shells, limbs, clamp jaws ("assemble anywhere") | 1 kg PETG spool | $20.00 | 1 | $20.00 | [G] | — |
| 15 | Fastener + bearing assortment | Joint shafts, servo mounting (M2/M3), Dock-0 hardware | M2/M3 screw + MR-bearing kit | $15.00 | 1 | $15.00 | [G] | — |
| 16 | Dyneema tendon cord, ~50 m | Mandate §1 tendon-actuation experiments (ankles, wrists, clamps) | Braided Dyneema/Spectra cord, 100–200 lb test | $12.00 | 1 | $12.00 | [G] | — |
| 17 | Latching electromagnets, 12 V | Dock-0 positive-lock docking experiments (leg-to-shoulder holds) | 12 V holding electromagnet, ~2.5 kg hold | $8.00 | 2 | $16.00 | [G] | — |
| 18 | Wire, JST/XT60 connectors, heat-shrink, switch/fuse | Power bus wiring; DRD §7 fail-safe fuse | Assorted wiring kit | $10.00 | 1 | $10.00 | [G] | — |

## Totals

| Subtotal | Amount | Label |
|----------|-------:|-------|
| Measured items (rows 1–8) | **$584.59** | [M]/[I] — computed by script |
| Guessed items (rows 9–18) | **$142.00** | [G] |
| **Total, one kit** | **$726.59** | [I] |
| 10 kits, linear (no discounts) | **$7,265.90** | [I] |
| 10 kits, plausible low | **≈ $7,002** | [G] — see note |

**10-kit pricing note:** Waveshare publishes quantity tiers (sibling ST3215-HS page: $21.99 → $20.63 at qty 4+, ≈6% off — measured); applying ~6% to 160 servos saves ≈$211 [I from measured tier structure, [G] that tiers apply to the 12 V SKU]. Adafruit shows 10–99 qty pricing ≈10% off on the solar-panel page [M on that page]; if extended to panel+camera+cable it saves ≈$53 over 10 kits [G]. Adafruit limits Pi 5 to 2/customer [M] — **no volume Pi pricing**, and Pi is rationed, so a 10-kit run may need multiple orders/vendors. Floor estimate ≈ **$7,000** [G], ceiling $7,265.90 [I].

## Sanity checks (all [I])
- **Mass:** 16 servos × ~55 g (≈880 g) + 3S 2200 pack (~180 g) + Pi+camera (~60 g) + structure/hardware (~500 g) ≈ **1.6 kg** — consistent with the 1.8 kg concept target.
- **Torque:** 30 kg·cm × 9.80665/100 = **2.94 N·m** stall per joint, above the DRD v0.1 ≥2 N·m target (which survives the quadruped→scout rewrite as a reasonable joint bar).
- **Arithmetic:** verified with `run_python` (sums above are script output).

## What I couldn't find or am unsure of
1. **Servo variant→price mapping.** Waveshare's ST3215 page shows a **range "$16.99–$21.99"** across the 7.4 V/12 V options; I assumed the 12 V/30 kg·cm option is the $21.99 end [I]. If it's $16.99, the kit drops by $80.
2. **Battery price is a guess.** RobotShop is Cloudflare-blocked (HTTP 403); Amazon/HobbyKing also not reliably fetchable. $26 for a 3S 2200 mAh pack is a market-typical placeholder [G], and a charger/BMS is **not included** — a real kit needs one.
3. **Solar architecture is unresolved.** The measured 2 W panel + a 1S Li-Poly charger board is a *top-up trickle*; it does not integrate with the 11.1 V servo bus (needs a 3S-MPPT stage I could not source in budget). Honest read: solar on v0.1 extends idle/standby time, it does not power walking. Design gap flagged for R&D.
4. **Pi pricing is volatile and inflated right now.** Adafruit: 4 GB $130, 8 GB $200 [M]; PiShop: 8 GB $175 [M, related-page price]; 1 GB $49.50 exists [M] but is too small for vision. I used 4 GB. If prices normalize toward the historical $60 MSRP, the kit drops ~$70.
5. **IMU, microSD, filament, cord, fasteners, electromagnets, wiring** are all [G] placeholders at market-typical prices; none were fetched. Electromagnet docking force/tolerance is unvalidated — Dock-0 is Kodama's defining open problem.
6. **DoF count is an assumption** [G]: 16 (legs 5+5, arms 3+3) matches a minimal walking+clamping scout; the concept poster implies but doesn't specify. Each removed joint saves $21.99 [I].
7. **This is a servo-baseline kit.** The mandate's preferred tendon/central-motor architecture is represented only as experiment materials (rows 16–17); a tendon-native BOM would trade servo count for motors+pulleys and isn't priced here.
8. **Shipping, tax, and print farm time excluded.** Prices are pre-shipping single-unit US retail on 2026-10-31.
