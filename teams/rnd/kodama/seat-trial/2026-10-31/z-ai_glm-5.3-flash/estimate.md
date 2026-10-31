# Estimate: Kodama Scout (K-01) Explorer Kit — parts cost

Filed 2026-10-31 by the z-ai/glm-5.3-flash seat-trial candidate. Concept source: `teams/rnd/kodama/concept/WHAT-KODAMA-IS.md` — the Scout is a small standalone **humanoid-form** robot (~45 cm, ~1.8 kg target) with a Raspberry Pi 5-class computer, tendon actuation, and positive-locking docking clamps. It is **not** a quadruped; four-legged gaits are combined forms, not the base unit.

**Labeling discipline (per MANDATE.md):**
- **[measured]** = price read directly from a fetched vendor page (URL listed in row).
- **[inferred]** = computed from measured numbers.
- **[guessed]** = no fetched price; plausible market estimate, clearly marked.

## Assumptions (all inferred/guessed, stated up front)
- **Servo choice:** Feetech STS3215 serial-bus servos. They satisfy the mandate's tendon/embedded-control direction cheaply: TTL daisy-chain (fewer wires than 20×3-wire PWM), 12-bit magnetic encoder (0.088°/step), position/speed/load/temperature feedback, and metal gears. A Scout of ~20 joints uses the 12 V C018 (30 kg·cm, 1:345) on the legs and 7.4 V units on lighter/fast joints — matching the two-variant servo set actually sold.
- **Quantity:** ~20 actuated joints (2 legs × 6, 2 arms × 3–4, head pan) + 4 spares = 24 servos, i.e. exactly 2 of the 12-servo sets the vendor sells.
- **Printed structure:** ~700–770 g PETG, by analogy to the vendor's note that a printed SO-101 arm pair takes ~768 g of PLA [inferred from a measured page note].

## Bill of materials — one kit

| # | Part | Why needed | Purchasable example | Unit price | Qty | Line total | Source (actually fetched) | Label |
|---|------|-----------|--------------------|-----------|-----|-----------|--------------------------|-------|
| 1 | SBC | the "Pi 5-class computer" | Raspberry Pi 5, 4 GB RAM (Adafruit 5812) | $130.00 | 1 | $130.00 | https://www.adafruit.com/product/5812 | **measured** |
| 2 | Camera | vision for scouting/docking | Raspberry Pi Camera Module 3, 12MP autofocus (Adafruit 5657) | $29.25 | 1 | $29.25 | https://www.adafruit.com/search?q=camera+module+3 (search page listing 5657) | **measured** |
| 3 | Pi camera FPC cable | Pi 5 uses the smaller 22→15-pin camera connector | Pi 5 camera cable, 22-pin to 15-pin (Adafruit 6424) | $2.70 | 1 | $2.70 | https://www.adafruit.com/product/5812 (accessories shown with the Pi 5) | **measured** |
| 4 | IMU | balance + attitude for biped walking and docked forms | Adafruit MPU-6050 6-DoF STEMMA QT (3886) | $12.95 | 1 | $12.95 | https://www.adafruit.com/search?q=MPU-6050 (search page listing 3886) | **measured** |
| 5 | Serial bus servos | all joints; tendon-driven limbs; daisy-chained TTL bus | Feetech STS3215 12-servo set (6×12 V C018 + 6×7.4 V C001/C044/C046) | $229.99 | 2 | $459.98 | https://armdojo.com/products/feetech-sts3215-serial-bus-servo | **measured** (inferred ×2) |
| 6 | Bus servo USB adapter | commissioning: set servo IDs, firmware, offsets (Pi drives the bus at runtime) | Waveshare Bus Servo Adapter (A), USB-C/UART | $21.99 | 1 | $21.99 | https://armdojo.com/products/feetech-sts3215-serial-bus-servo | **measured** |
| 7 | Servo cables | daisy-chain wiring inside one 45 cm unit | Feetech 3-pin 5264 cables, mixed 12-pack (4×15+4×20+4×40 cm) | $14.99 | 2 | $29.98 | https://armdojo.com/products/feetech-sts3215-serial-bus-servo | **measured** (inferred ×2) |
| 8 | Solar panel | "solar field scout" — tops up battery between sorties | 6 V 2 W ETFE solar panel, Voltaic P126 (Adafruit 5366) | $20.95 | 1 | $20.95 | https://www.adafruit.com/search?q=solar+panel (search page listing 5366) | **measured** |
| 9 | Solar/LiPo charge board | charge battery from panel or USB | Adafruit bq25185 USB/DC/Solar LiIon/LiPo charger (6091) | $6.95 | 1 | $6.95 | https://www.adafruit.com/search?q=solar+lipoly+charger (search page listing 6091) | **measured** (see power mismatch note) |
| 10 | Battery | locomotion power | 2S LiPo 7.4 V, ~2500 mAh (typical hobby pack) | ~$22.00 | 1 | $22.00 | (none — not fetched) | **guessed** |
| 11 | Power board | 2S balance/BMS + 5 V/12 V rails for Pi and servos; the Adafruit chargers are 1S-only | custom 2S BMS/boost board | ~$25.00 | 1 | $25.00 | (none — not fetched) | **guessed** |
| 12 | microSD card | OS + local AI on the Pi | 32 GB A1-class microSD | ~$10.00 | 1 | $10.00 | (none — not fetched) | **guessed** |
| 13 | Buck converters | 5 V for Pi 5, 12 V/7.4 V servo rails | generic 5 V/3 A + 12 V/3 A buck modules | ~$8.00 | 1 | $8.00 | (none — not fetched) | **guessed** |
| 14 | Filament (PETG) | printed limbs, shells, dock clamps, tendon pulleys | ~750 g PETG (1 kg spool covers a kit) | ~$20.00 | 1 | $20.00 | (none — not fetched; mass inferred from vendor's ~768 g PLA for an SO-101 pair) | **guessed** |
| 15 | Tendon cord | the tendon drive itself | braided UHMWPE (Dyneema) fishing line, 40–80 lb test, 100 m spool | ~$15.00 | 1 | $15.00 | (none — not fetched) | **guessed** |
| 16 | Tendon hardware | spools, capstans, crimps, springs, PTFE-lined tubes | springs/crimps/PTFE tubing assortment | ~$12.00 | 1 | $12.00 | (none — not fetched) | **guessed** |
| 17 | Docking parts | Dock-0: positive-lock clamps — dowel pins + magnets | 20× N35 6×3 mm magnets + steel dowel pins | ~$12.00 | 1 | $12.00 | (none — not fetched) | **guessed** |
| 18 | Fasteners | mounting boards, horns, shells | M2/M3 screws-nuts-washers assortment | ~$15.00 | 1 | $15.00 | (none — not fetched) | **guessed** |

### Subtotals and total
- **Measured subtotal:** $714.75 [inferred from measured lines]
- **Guessed subtotal:** $139.00 [guessed lines]
- **TOTAL, one kit:** **≈ $853.75** [inferred]

Note: the Adafruit Pi 5 4GB now lists at **$130.00** — well above the 2023 MSRP (~$60). This is a large single line; a cheaper vendor may exist, but I only verified Adafruit's price [measured; cross-check flagged in "unsure"].

### Price at 10 kits
- No genuine volume pricing was found on the fetched pages (all listed unit prices; ArmDojo's only bulk option was a fixed 12-servo set, not a volume break).
- Linear extrapolation: **$8,537.50 for 10 kits** [inferred].
- With an *assumed* 5% volume discount on electronics (typical for hobby distributors, unverified): **≈ $8,110** [guessed discount applied to inferred total].

### Sanity checks [inferred]
- Per-servo cost inside the 12-set: $229.99 / 12 ≈ **$19.17** — far cheaper than per-unit retail elsewhere (RobotShop's single STS3215 30 kg listing could not be fetched; the search snippet suggested a comparable or higher unit price).
- Servo mass: 20 installed STS3215 × 55 g ≈ **1.10 kg** against the **1.8 kg whole-unit target**. Add Pi 5 (~47 g), battery (~120 g), camera (~15 g), structure (~250 g): total ≈ 1.6–1.9 kg. **The 1.8 kg target is tight** — the DRD will likely need lighter C044/C046 ratio units on some joints or fewer DOF. Flagged for design review, not priced around here.

## What I couldn't find or am unsure of
1. **Single-servo retail price** — ArmDojo sells sets, not singles; RobotShop blocks automated fetching (HTTP 403), so no single-servo measured price. The 12-set price is the defensible path.
2. **Power architecture mismatch** — the measured charger (bq25185) is single-cell; the STS3215 7.4 V variants want 2S LiPo. A 2S charger/BMS exists in the market but I did not fetch one, hence lines 10–11 are guessed. Adafruit's bq24074 ($14.95, measured) is also 1S. Unresolved design question for the DRD.
3. **Raspberry Pi 5 best price** — Adafruit's $130 [measured] may not be the floor (rpilocator/chipradar list other vendors; I did not fetch them). MSRP history suggests $60 was once standard; today's listing is 2× that.
4. **Tendon cord, filament, magnets, fasteners, battery, SD, buck modules** — all guessed; none fetched. UHMWPE cord specifically: Adafruit carries none (searched "kevlar" — no actuation cord), and Amazon/eBay pages were not fetched within the call budget.
5. **Shipping, tariffs, and sales tax** are excluded. ArmDojo ships from Singapore (measured: US tracked from $18.99; free over $100) and the US recipient pays import duty on arrival — a real cost risk on the ~$230×2 servo sets.
6. **Ten-kit volume pricing** — none found; both 10-kit figures are extrapolations.

## Honesty statement
Every row labeled **measured** was read from a page I fetched during this session (Adafruit product/search pages; ArmDojo product page). Rows 10–18 are **guessed** and would be replaced with fetched prices before the kit is sold. No simulated or guessed number is presented as a found price.
