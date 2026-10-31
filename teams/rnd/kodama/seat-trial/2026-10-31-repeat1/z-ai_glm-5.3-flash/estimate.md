# Kodama Scout Explorer Kit — sourced parts-cost estimate

Candidate seat trial, 2026-10-31. Design target: the Kodama Scout (K-01) from
`teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` — a ~45 cm / ~1.8 kg **humanoid-form** building-block
robot with a Pi 5-class computer. This is a parts-cost estimate only, not a validated design.
Every price below was fetched from a live vendor page (tool calls: `fetch_url` on the URLs shown;
`web_search` to find them). No price here is invented.

**Label definitions:** *measured* = price read directly off a fetched product page.
*inferred* = computed from fetched numbers (e.g. currency conversion, multiplication).
*guessed* = no source fetched; stated so you can attack it.

**Currency conversion is inferred with guessed rates:** EUR/USD = 1.16, GBP/USD = 1.33. I did not
fetch live FX rates. Where conversion is involved, the original native price is shown so you can
re-rate it yourself.

## Assumed architecture (brief, since cost follows from it)

A humanoid-form scout with ~12 joints using Feetech STS3215 serial bus servos (RS485/TTL-style
daisy chain — one serial bus instead of 12 PWM channels), Raspberry Pi 5 as the brain, Pi Camera
Module 3 for vision, BNO085 IMU for balance, ToF sensor for obstacle detection, LiIon battery
charged by a small solar panel through a solar charger, one buck regulator for the 5 V rail.
Mechanical structure 3D printed (PLA/PETG); tendons UHMWPE fishing line; docking hardware =
magnets + positive-lock fasteners. This architecture matches the concept file's mandate (Pi
5-class, tendon actuation, docking clamps) but the joint count and motor choice are my working
assumption for costing — [label: guessed architecture, measured prices].

## Bill of materials — one kit

| Part | Why it's needed | Specific purchasable example | Unit price | Qty | Line total | Source URL (fetched) |
|---|---|---|---|---|---|---|
| Main computer | Pi 5-class brain for walking, vision, swarm logic | Raspberry Pi 5, 4GB (PiShop US, official reseller) | $110.00 [measured] | 1 | $110.00 | https://www.pishop.us/product/raspberry-pi-5-4gb/ |
| Storage | OS + code | Raspberry Pi Micro SD Card 32GB, OS pre-installed (£30.60) | $40.70 [inferred, rate 1.33] | 1 | $40.70 | https://thepihut.com/collections/sd-cards |
| Joint actuators ×12 | All 12 joints: 2×hip, 2×knee, 2×ankle, 2×shoulder, 2×elbow, 1×head pan, 1×wrist/gripper | Feetech STS3215-C001 serial bus servo, 7.4 V, 19.5 kg·cm stall, 12-bit magnetic encoder, 360°, daisy-chain TTL (€25.82 ea) | $29.95 [inferred, rate 1.16] | 12 | $359.42 | https://openelab.io/collections/brands-feetech |
| Vision | Field-scout obstacle/pattern recognition | Raspberry Pi Camera Module 3, 12 MP Sony IMX708, standard FOV (£24.00) | $31.92 [inferred, rate 1.33] | 1 | $31.92 | https://thepihut.com/products/raspberry-pi-camera-module-3 |
| Camera cable | Pi 5 uses the 22-pin connector; the 15-pin cable ships in the box | Pi 5/Pi Zero camera cable (22-pin) (£0.90) | $1.20 [inferred, rate 1.33] | 1 | $1.20 | https://thepihut.com/products/raspberry-pi-camera-module-3 |
| IMU | Balance + orientation for biped walking | Adafruit BNO085 9-DOF IMU breakout (product 4754) | $29.50 [measured] | 1 | $29.50 | https://www.adafruit.com/product/4754 |
| Distance sensing | Near-field obstacle detection, docking alignment | Adafruit TMF8801 Time-of-Flight sensor, 10 mm–5 m | $12.50 [measured] | 1 | $12.50 | https://www.adafruit.com/product/4754 (listed on the Adafruit "New Products" carousel) |
| Battery | ~1.8 kg robot, ~4–8 h electronics; 18650×2 parallel, 95 g | Adafruit Lithium Ion Battery Pack 3.7 V 4400 mAh (product 354), JST, protected | $19.95 [measured] | 1 | $19.95 | https://www.adafruit.com/product/354 |
| Solar panel (on-board) | Trickle charge in the field without adding bulk | Adafruit 5V 1.2W solar panel, 96×71 mm, ~50 g | $14.95 [measured] | 1 | $14.95 | https://www.adafruit.com/product/5367 |
| Solar charge controller | Regulates panel → LiIon safely | Adafruit bq24074 Universal USB/DC/Solar LiIon/LiPoly Charger (also sold as add-on on the panel page) | $14.95 [measured] | 1 | $14.95 | https://www.adafruit.com/product/5367 |
| 5 V regulator | Servos on 7.4 V direct from cells; Pi 5 needs a clean 5 V | Pololu D24V10F5 5 V 1 A step-down regulator (item 2831) | $13.95 [measured] | 1 | $13.95 | https://www.pololu.com/product/2831 |
| Structure (printed) | Shell, limb segments, joints, frame | PLA or PETG filament, ~0.4–0.5 kg of a 1 kg spool | ~$10.00 [guessed — spool price not fetched] | 1 | $10.00 | — |
| Tendons | Tendon-driven joints (mandate requirement) | UHMWPE/Dyneema fishing line 0.8 mm, ~25 m length cut | ~$10.00 [guessed] | 1 | $10.00 | — |
| Docking hardware | Dock-0: positive-lock clamps between units; also magnets/springs | Neodymium magnets + M3 screws/nuts + springs + printed clamp inserts | ~$10.00 [guessed] | 1 | $10.00 | — |
| Wiring & connectors | Servo daisy chain, power rails, IMU/camera hookup | JST connectors, 20 AWG wire, heatshrink, headers | ~$8.00 [guessed] | 1 | $8.00 | — |

**Subtotals (1 kit):**

| Segment | Subtotal | Label |
|---|---|---|
| Electronics (computer, storage, sensors) | $256.02 | inferred from measured + conversion |
| Actuation (12 × STS3215) | $359.42 | inferred from measured + conversion |
| Power (battery, solar, charger, regulator) | $63.80 | inferred from measured |
| Mechanical (filament, tendons, docking, wiring) | $38.00 | guessed |
| **Total, one kit** | **$687.03** | inferred from above |

**Rough price at 10 kits** (only where I actually found volume pricing — PiShop, PiHut, OpenELAB
showed no volume breaks on their pages):

| Part | 10-kit line | Volume basis |
|---|---|---|
| Raspberry Pi 5 4GB | $1,100.00 | no discount shown [measured none] |
| MicroSD card | $407.00 | no discount shown [measured none] |
| STS3215 ×120 | $3,594.20 | no discount shown [measured none] |
| Camera Module 3 + cable | $331.20 | no discount shown [measured none] |
| BNO085 IMU ×10 | $265.50 | $26.55 @ 10–99 [measured] |
| ToF ×10 | $125.00 | no discount shown [measured none] |
| Battery ×10 | $179.60 | $17.96 @ 10–99 [measured] |
| Solar panel ×10 | $149.50 | no discount shown [measured none] |
| Charger ×10 | $149.50 | no discount shown [measured none] |
| Regulator ×10 | $128.30 | $12.83 @ 5–24 [measured] |
| Mechanical guess lines ×10 | $380.00 | guessed |
| **Total, 10 kits** | **$6,809.69 → ~$681/kit** | inferred |

Volume discounts barely move the total (~1%); the parts that dominate (servos, Pi) had no
published volume pricing on the pages I fetched. Real savings would need bulk quotes from
Feetech/ distributors, not these retail pages.

## Honest observations a reviewer should hit me with

1. **Servos are 52% of the kit cost.** 12 × $29.95 = $359. This is the single lever to pull. A
   smaller/cheaper serial bus servo (e.g. Feetech SCS0009, ~$15 at the same shop, 2.3 kg·cm) would
   halve the actuation cost but likely fail to carry this robot's weight — that trade-off needs
   the R&D simulation work, not a cost estimate.
2. **The Pi 5 4GB price I measured ($110.00 at PiShop US) is well above the ~$60 MSRP I remember
   but did not verify.** I fetched PiShop and used their live price. I did not check Amazon/Micro
   Center (search returned them; I did not fetch a price). Cheaper listings likely exist — this
   line could be ~$50 lower. Flagged, not asserted.
3. **The 5 V/1 A regulator is undersized for a Pi 5 under load** (Pi 5 officially wants up to 5 V/5
   A for peripherals). I picked the 1 A part because that's the price I fetched. A 5 A Pololu
   part (D24V50F5) exists but I never fetched its price, so it's a gap, not a number. Real
   designs would need that part costed.
4. **Battery voltage vs servo voltage mismatch.** STS3215-C001 runs 6–7.4 V; the LiIon pack is
   3.7 V. A real design needs either a 2-cell pack or a boost converter — neither is in this BOM
   with a fetched price. Cost impact unknown, likely $10–15. Flagged as a design gap.
5. **RobotShop returned HTTP 403** (bot block) on both their US and EU STS3215 pages, so no
   RobotShop price is quoted; OpenELAB's €25.82 is the price actually used.
6. **Weight sanity check vs the 1.8 kg concept:** measured/known weights: servos 55 g ×12 = 660 g
   (from the fetched OpenELAB/RobotShop search snippet), battery 95 g (Adafruit page), solar panel
   ~50 g (Adafruit page), Pi 5 ~47 g (unfetched, recalled). Sum ≈ 850 g, leaving ~950 g for
   structure, wiring, docking hardware — plausible but *not verified* against a real CAD. [inferred
   / partly guessed]

## What I couldn't find or am unsure of

- **Live FX rates** — I used 1.16 EUR/USD and 1.33 GBP/USD as stated assumptions. All converted
  prices shift if these are off; the native-currency prices are the anchor.
- **Volume/bulk pricing for servos** — the biggest cost line. No volume break published on
  OpenELAB. Feetech's own distributors (robotshop, eckstein) were blocked or required JS/quote
  requests. A real procurement would email Feetech for a 100-pack quote.
- **Raspberry Pi 5 price across retailers** — I only fetched PiShop US. Amazon/Micro Center search
  results existed but I did not fetch their prices. The $110 may be a reseller markup.
- **Everything under "Mechanical":** filament, tendon line, magnets, wiring. I guessed these
  (~$38/kit) based on general knowledge of hobby-market prices and labeled them guessed. No source.
- **Any "kit" pricing from vendors** — I found no existing off-the-shelf kit matching the Kodama
  Scout concept (12-servo humanoid + Pi 5 + solar), so every line is a separate part, not a bundle
  discount.
- **Shipping and taxes** are excluded from every line (vendor pages didn't show them to me).
- **ToF price provenance:** the $12.50 TMF8801 price appeared in the "New Products" carousel on the
  Adafruit pages I fetched, not on its own product page. Treat it as measured-with-weaker-provenance.

## Method note

- Concept source: `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` (read before designing).
- Prices fetched via `fetch_url`: pishop.us (Pi 5), thepihut.com (camera, camera cable, SD card),
  adafruit.com (IMU, battery, solar panel + charger, ToF), pololu.com (regulator),
  openelab.io (servos). RobotShop and eBay returned 403 and are not used as sources.
- Arithmetic checked with `run_python`: 1-kit total $687.03, 10-kit total $6,809.69
  (~$680.97/kit), servo share 52%.
