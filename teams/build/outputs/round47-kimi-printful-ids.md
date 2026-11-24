# Round 47 — Printful catalog IDs for Ash's expansion

**Research only; no product code changed and no API key used.**  
Fetched **2026-11-24 06:17–06:18 UTC** from Printful's public endpoint: <https://api.printful.com/products>. It returned HTTP 200 / body `code: 200`, with **587 catalog products** (measured). The exact public response is preserved at `teams/build/outputs/2026-11-24T06-17-05/printful-products-public.json` (SHA-256 `79becfc57b14f8e684385b281f2e695f75801bd315d7283738b0c789e873f3e5`).

## Current eight, checked against that catalog

Source: `commons/lib/printful.mjs`, `DEFAULT_PRODUCTS`.

| Key | Printful product ID | Exact current catalog title | Variants | Discontinued? |
|---|---:|---|---:|---|
| tee | **71** | Unisex Staple T-Shirt \| Bella + Canvas 3001 | 628 | No |
| hoodie | **146** | Unisex Heavy Blend Hoodie \| Gildan 18500 | 192 | No |
| mug | **19** | White Glossy Mug | 3 | No |
| poster | **1** | Enhanced Matte Paper Poster (in) | 33 | No |
| canvas | **3** | Canvas (in) | 46 | No |
| tote | **84** | All-Over Print Tote Bag | 3 | No |
| sticker | **358** | Kiss-Cut Stickers | 4 | No |
| phone | **181** | Clear Case for iPhone® | 33 | No |

## Recommended expansion candidates

These are **catalog candidates, not approved or integration-tested products**. IDs, titles, variant counts, techniques and file types below come directly from the public response. `*` is not used; the technique named is the catalog's default.

| Suggested key | Product ID | Exact Printful title | Variants | Default technique | Catalog print-file type(s) | Why it is a useful next candidate |
|---|---:|---|---:|---|---|---|
| `sweatshirt` | **145** | Unisex Crew Neck Sweatshirt \| Gildan 18000 | 177 | DTG printing | front, back, sleeves, plus other options | Direct companion to the existing Gildan hoodie; a familiar, non-all-over garment. |
| `journal` | **867** | Hardcover Journal Matte | 1 | Digital printing | front | Adds a simple art-bearing stationery product with one variant. |
| `notebook` | **474** | Spiral Notebook | 1 | Digital printing | front, back | A second stationery option; back support would be a later choice, not required for a front-only first pass. |
| `blanket` | **395** | Throw Blanket | 3 | Sublimation | default | Home decor with three sizes and a single default print area. |
| `pillow` | **83** | All-Over Print Basic Pillow | 5 | All-over synthetic | front, back | Five sizes; suitable for art-led, all-over designs. |
| `bottle` | **382** | Stainless Steel Water Bottle | 2 | UV printing | default | Adds durable drinkware beyond the ceramic mug. |
| `deskmat` | **853** | Desk Mat | 3 | Sublimation | default | Wide-format desk accessory, three variants. |
| `apron` | **894** | All-Over Print Apron | 1 | Sublimation | front | One-variant kitchen/studio product. |
| `towel` | **259** | Beach Towel | 2 | Sublimation | default | Large-format seasonal/home product, two variants. |
| `magnet` | **656** | Die-Cut Magnets | 3 | Digital printing | default | Small, lower-complexity companion to stickers. |

### Headwear: valid IDs, but keep separate from the first drop-in batch

| Suggested key | Product ID | Exact Printful title | Variants | Default technique | Integration caution |
|---|---:|---|---:|---|---|
| `dadhats` | **206** | Classic Dad Hat \| Yupoong 6245CM | 11 | Embroidery | Its default catalog file is `embroidery_front`; do not assume the existing garment art settings or print-quality grading transfer to embroidery. |
| `beanie` | **449** | Organic Ribbed Beanie \| Atlantis | 7 | Embroidery | Same embroidery caveat; its default file is `embroidery_front`. |

## Integration notes and limits

- `commons/lib/printful.mjs` already supports replacing the curated list through `PRINTFUL_PRODUCTS` JSON, but **this session changed no configuration and did not enable any candidate**.
- A catalog ID alone is not sufficient. The existing `products()` path must still fetch the authenticated product detail and `/mockup-generator/printfiles/:id`, find a usable placement and printfile dimensions, and retain at least one in-stock variant. Those authenticated checks were **not run** here.
- `commons/lib/merchsets.mjs` derives either colour or size choices from returned variants and computes print quality from each print area. The one-variant journal/notebook/apron and multi-shape home goods therefore need a real panel/mockup test before release; this report makes no visual or fulfillment claim.
- Product **145** has catalog colour-appearance disclaimers (White may look off-white; Orange can shift hue under lighting). That is a product-content consideration, not a blocker established by this research.
- No shipping price, base price, stock level, mockup, template, regional availability, or production outcome was measured. No staging or production claim is made.

**Suggested next build step:** choose a small first batch (for example **145, 867, 395, 853**), run the existing authenticated product/printfile checks and real mockup panel tests, then let Ash/Aletheia-6 decide the visible assortment. Headwear should follow only after embroidery is explicitly handled.
