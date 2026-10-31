# Kodama Scout (K-01) Explorer Kit — Parts-Cost Estimate

**Prepared:** 2026-10-31, seat-trial candidate `moonshotai/kimi-k3`
**Scope:** One Scout unit per `concept/WHAT-KODAMA-IS.md` — a ~45 cm, ~1.8 kg humanoid-form scout with a Pi 5-class brain, tendon-routed limbs (mandate §1), Dock-0 clamp hardware, and solar field-scout power. **Not a quadruped.**
**Labeling (mandate §4):** **[M]** measured (price read off a page I actually fetched) · **[I]** inferred (computed from measured numbers) · **[G]** guessed (no source fetched; typical market price — treat as ±30%).

All prices USD, single-quantity retail, excluding shipping and tax.

---

## 1. Bill of materials

### Electronics & compute
| Part | Why it's needed | Purchasable example | Unit | Qty | Line | Label | Source (fetched) |
|---|---|---|---|---|---|---|---|
| Raspberry Pi 5, 4GB | Main computer (concept calls for "Pi 5-class") | Raspberry Pi 5/4GB, SKU 4GB-9024 | $110.00 | 1 | $110.00 | [M] | https://www.pishop.us/product/raspberry-pi-5-4gb/ |
| microSD card, 64GB A2 | OS + firmware + logs | SanDisk Extreme A2 64GB (generic) | $10.00 | 1 | $10.00 | [G] | — |
| Camera Module 3 (standard) | Vision / spatial sensing | RSP-CAM-V3 (Sony IMX708, PDAF) | $26.95 | 1 | $26.95 | [M] | https://www.canakit.com/raspberry-pi-camera-module-3.html |
| Pi 5 camera FPC cable | Pi 5 uses new, smaller MIPI connectors — old cables don't fit (noted on both fetched Pi pages) | PiShop "Camera Cable for Raspberry Pi 5" | $3.95 | 1 | $3.95 | [M] | https://www.pishop.us/product/raspberry-pi-5-4gb/ (listed under related products) |
| IMU (MPU-6050 module) | Balance/orientation feedback (DRD §5: IMU required) | GY-521 breakout (generic) | $4.00 | 1 | $4.00 | [G] | — |
| USB↔TTL serial-bus linker | Drives the ST3215 servo bus from the Pi's USB port | Feetech FE-URT-1 (appears in the fetched Seeed listing's selection guide; price not shown) | $12.00 | 1 | $12.00 | [G] | variant seen at https://www.seeedstudio.com/STS3215-30KG-Serial-Servo-p-6340.html |
| 30 mm fan + heatsink | Pi 5 sustained-load thermals (PiShop FAQ recommends active cooling) | generic active cooler | $5.00 | 1 | $5.00 | [G] | — |

**Subtotal: $171.90 [I]**

### Actuation (tendon-driven limbs, per mandate §1)
| Part | Why it's needed | Purchasable example | Unit | Qty | Line | Label | Source (fetched) |
|---|---|---|---|---|---|---|---|
| Serial bus servo, 30 kg·cm, metal gear, 12-bit mag encoder | 16-DOF humanoid scout (5/leg, 3/arm): these sit in the torso/limb roots and drive Dyneema tendons as capstan winches; bus wiring also daisy-chains across Dock-0 later | Feetech ST3215-C047 (STS3215 family, used in LeRobot SO-ARM101) | $22.00 | 16 | $352.00 | [M] unit, [I] line | https://www.seeedstudio.com/STS3215-30KG-Serial-Servo-p-6340.html |
| Dyneema SK78 cord, 1.0–1.5 mm, 30 m | Tendon runs (antagonistic pairs, mandate §1) | generic braided Dyneema/Spectra | $9.00 | 1 | $9.00 | [G] | — |
| Extension/torsion springs + idler pulleys | Tension retention & passive compliance (mandate §1) | assorted hardware-store | $8.00 | 1 | $8.00 | [G] | — |

**Subtotal: $369.00 [I]** (servos $352.00 + tendon hardware $17.00 [G])

### Power & solar (field scout)
| Part | Why it's needed | Purchasable example | Unit | Qty | Line | Label | Source (fetched) |
|---|---|---|---|---|---|---|---|
| 2S LiPo, 2200 mAh, 50C, XT60 (113 g) | Swappable main battery, 7.4 V bus for servos | PowerHobby 2S 2200 mAh 50C w/ XT60 | $26.99 | 1 | $26.99 | [M] | https://www.powerhobby.com/products/powerhobby-2s-7-4v-2200mah-50c-lipo-battery-w-xt60-plug |
| 5 V buck regulator, 2.5 A | 7.4 V → 5 V for Pi/camera/IMU (reverse-polarity, short-circuit, thermal protection — DRD §7 fail-safe) | Pololu D24V22F5, item #2858 | $26.95 | 1 | $26.95 | [M] | https://www.pololu.com/product/2858 |
| 2S balance charger (bench) | Safe LiPo charging during dev | iMAX B6-class generic | $25.00 | 1 | $25.00 | [G] | — |
| Solar panel, 5 V 5 W, ETFE | Field top-up; in stock at Adafruit (the 6 V 5.6 W "Huge" panel is discontinued there) | Voltaic P105 via Adafruit PID 5367 | $34.95 | 1 | $34.95 | [M] | https://www.adafruit.com/category/580 |
| 2S MPPT solar charge module | Panel → 2S LiPo charge path (see §4 caveat) | CN3791-based MPPT board (generic) | $8.00 | 1 | $8.00 | [G] | — |
| Power wiring: XT60 pigtail, master switch, 10 A fuse, wire | Safe power distribution, emergency cutout (DRD §7) | assorted | $12.00 | 1 | $12.00 | [G] | — |

**Subtotal: $133.89 [I]**

### Structure, Dock-0 & assembly
| Part | Why it's needed | Purchasable example | Unit | Qty | Line | Label | Source (fetched) |
|---|---|---|---|---|---|---|---|
| PETG filament, 1 kg | Printed shells, limb segments, clamp bodies ("assemble anywhere" — printer makes shells, not motors) | Overture/Polymaker PETG 1 kg (generic) | $22.00 | 1 | $22.00 | [G] | — |
| M2/M3 fastener + heat-set insert assortment | Assembly of printed parts; modular swap-out (DRD §1.2) | generic kit | $12.00 | 1 | $12.00 | [G] | — |
| Flanged micro bearings ×20 (683/684) | Joint and pulley shafts | generic pack | $10.00 | 1 | $10.00 | [G] | — |
| Dock-0 clamp hardware: N52 magnets, steel striker plates, M3 hardware | Positive-locking leg-to-shoulder / arm-to-body holds (concept) | generic assortment | $14.00 | 1 | $14.00 | [G] | — |

**Subtotal: $58.00 [I]** (structure only; tendon hardware counted under Actuation)

---

## 2. Totals

| Group | Subtotal | Label |
|---|---|---|
| Electronics & compute | $171.90 | [I] |
| Actuation (incl. tendon hardware) | $369.00 | [I] |
| Power & solar | $133.89 | [I] |
| Structure, Dock-0 & assembly | $58.00 | [I] |
| **TOTAL, one kit** | **$732.79** | **[I]** |
| — of which measured line items | $581.79 | [M] |
| — of which guessed line items | $151.00 | [G] |

**Price at 10 kits: ≈ $7,151.90 total (~$715.19/kit) [I].**
Only one volume break was actually found: Seeed lists the ST3215 servo at **$20.90 each at qty 10+** [M] (same fetched page). At 10 kits (160 servos) that saves $176.00 [I]. No other volume pricing was fetched; other lines are held flat at single-unit retail, so the real 10-kit price is likely a bit lower (e.g., filament by the 4-pack, servos from the OEM at 100+).

Sanity notes [I]: servos are 48% of kit cost — the single biggest lever. A minimal 10-DOF "walker-only" scout (10 servos, no arms) would cost ≈ $600.79 [I]; the 16-DOF spec was kept because the concept requires limbs that double as clamps.

## 3. Design rationale (brief)
- **Servo-as-winch choice:** The mandate wants tendon actuation with affordable motors. STS3215-class serial bus servos are the pragmatic v0.1 capstan driver: built-in gearbox, encoder, temperature/load feedback over one TTL bus (fewer cables across future docks), and already proven in the open LeRobot SO-ARM101 arm. Central-Motor BLDC tendon drives remain the research track (mandate §1); the BOM keeps all torque-dense parts removable so that swap stays possible.
- **16 DOF:** 5 per leg + 3 per arm, no neck servo; head camera is fixed (pan via body yaw).

## 4. What I couldn't find or am unsure of
1. **Pi 5 price looks high:** PiShop shows $110.00 [M] vs. the well-known $60 launch MSRP (not re-fetched). RAM-cost inflation is the likely cause, but shop around — a $60–80 Pi would cut kit cost to ~$680–700 [G].
2. **Servo voltage mismatch:** The measured STS3215-C047 is a **12 V** part; the measured battery is 2S (7.4 V). The same fetched Seeed page lists 7.4 V variants (C001/C044/C046) whose prices were not shown — BOM assumes same $22.00 [I]. Running the 12 V part at 7.4 V is possible but derates torque/speed [G]; alternatively move to a 3S battery (~$30 [G]) and re-check the buck's input range (fine: D24V22F5 takes 36 V in [M]).
3. **5 V rail margin:** D24V22F5 is 2.5 A max; Pi 5 recommends 5 A. At 7.4 V input the regulator's real continuous output (~2.3–2.5 A, per the fetched page's own derating note) may brown out the Pi under CPU+vision load [I]. A 5 A buck (Pololu D24V50F5, ~$15–20 [G]) is the likely fix.
4. **Solar charge path is unvalidated:** 5 V panel → CN3791 boost-MPPT → 2S LiPo is a common hobby pattern [G], but no sourced module was fetched and panel-only-5W means ~1–2 h of sun per 10 min of walking [G]. Treat solar as a range-extender demo, not primary power.
5. **Guessed lines (≈21% of total):** microSD, IMU, bus linker, charger, charge module, wiring, filament, fasteners, bearings, cord, springs, dock hardware — all [G], ±30%. Dock-0 clamp hardware is the least-characterized: no off-the-shelf part matches the concept's positive-locking clamp, so $14.00 covers magnets/strikers/fasteners only; a machined latch would cost more.
6. **Not priced:** shipping, tax, print time/failures, assembly labor, spares, tools, and the kit box/manual. A real Explorer Kit retail price would add margin on top of this BOM.
