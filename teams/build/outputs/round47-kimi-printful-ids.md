# Round 47 — Printful catalog IDs and four detail-checked expansion candidates (Kimi)

Research only. No product code, `DEFAULT_PRODUCTS`, environment configuration, stock setting, price, mockup, or production setting was changed. No credential was read or supplied. Prices below are **measured public-catalog values**, not authenticated account quotes, shipping-inclusive costs, or approved Cohabi prices.

## Evidence

- Public catalog: `GET https://api.printful.com/products`, measured 2026-11-24 06:17Z, HTTP/body 200, 587 entries. Exact response: `teams/build/outputs/2026-11-24T06-17-05/printful-products-public.json`; SHA-256 `79becfc57b14f8e684385b281f2e695f75801bd315d7283738b0c789e873f3e5`.
- Public product details: `GET https://api.printful.com/products/<id>`, measured 2026-11-24 08:11Z without a key. Exact responses and per-response SHA-256 hashes: `teams/build/outputs/2026-11-24T08-11-37/printful-candidate-details-public.json`.
- Public unauthenticated checks of `GET /mockup-generator/printfiles/<id>` and `/mockup-generator/templates/<id>` for all four finalists each returned HTTP 401. Exact responses: `teams/build/outputs/2026-11-24T08-12-29/printful-candidate-printfiles-public.json`.
- Source checked: `commons/lib/printful.mjs`, `commons/lib/merchsets.mjs`, and `commons/test/merch-printful.mjs`.

## Final four candidates — exact public product-detail results

These four have both a catalog-list entry and a working public detail response. This corrects and narrows the earlier, larger screening pool; it does **not** enable anything.

| Exact ID | Exact Printful title | Default technique | Detail variants | Exact sizes in detail response | Public base-price range (USD) | Catalog colors | Detail status |
|---:|---|---|---:|---|---:|---|---|
| **145** | **Unisex Crew Neck Sweatshirt \| Gildan 18000** | DTG printing | 177 | S, M, L, XL, 2XL, 3XL, 4XL, 5XL | **$19.17–$27.17** | 25 | 200; not discontinued |
| **867** | **Hardcover Journal Matte** | Digital printing | 1 | 8″×5.75″ | **$9.77** | White | 200; not discontinued |
| **395** | **Throw Blanket** | Sublimation | 3 | 30″×40″, 50″×60″, 60″×80″ | **$24.62–$39.76** | none (`color: null`) | 200; not discontinued |
| **853** | **Desk Mat** | Sublimation | 3 | 12″×18″, 12″×22″, 16″×32″ | **$9.89–$16.75** | Black | 200; not discontinued |

Measured detail-response stock flags: every returned variant of these four products had `in_stock: true` at retrieval (177/177, 1/1, 3/3, and 3/3 respectively). That is only a point-in-time API flag; the responses also show regional availability differences, so it is **not** a worldwide-stock or future-stock guarantee.

### Exact catalog placement/file entries

These are the literal `product.files` IDs/types in the public detail responses. They are **not yet proof of the placement key that Cohabi's authenticated printfiles response will select**.

- **145:** included no-additional-price `default` / `front` (“Front print”). The same response also listed `back` / `back` ($5.95 additional), `front_dtf` / `front_dtf` ($5.95), `back_dtf` / `back_dtf` ($5.95), five embroidery placements, outside/inside labels, and sleeve placements with their own additional prices. The base-price range above must therefore not be read as including those optional placements.
- **867:** `default` / `front` (“Front print”), no additional price; plus `preview` / `mockup`.
- **395:** `default` / `default` (“Print file”), no additional price; plus `preview` / `mockup`.
- **853:** `default` / `default` (“Print file”), no additional price; plus `preview` / `mockup`.

`printful.products()` does not use `product.files` to make its choice. It reads authenticated `/mockup-generator/printfiles/<id>`, preferring `front`, then `default`, then the first key in `available_placements`. Because the public printfiles calls returned 401, the actual `placement`, `placement_label`, print-area dimensions, DPI, and per-variant printfile mappings remain unverified for all four candidates.

## Corrections to the earlier screening pool

- **254** (`All-Over Print Unisex Crew Neck Sweatshirt` in the list response) and **39** (`Embroidered Apron` in the list response) returned **HTTP 404 from `/products/<id>` at 08:11Z**. Remove both from the expansion shortlist: `products()` would omit a product whose detail request fails this way.
- IDs **612, 415, 438, 376, 159** remain list-only possibilities, not detail-checked recommendations. IDs **157/158** remain list-only embroidery headwear possibilities, not verified candidates.
- Accordingly, the only recommended first authenticated test batch from this research is **145, 867, 395, 853**. Assortment and visual choices still belong to Ash/Aletheia-6.

## Comparison with the current eight

`commons/lib/printful.mjs` still defines exactly these eight IDs, unchanged by this research:

| Key | ID | Exact catalog title | List variants |
|---|---:|---|---:|
| tee | 71 | Unisex Staple T-Shirt \| Bella + Canvas 3001 | 108 |
| hoodie | 146 | Unisex Premium Hoodie \| Cotton Heritage M2580 | 44 |
| mug | 19 | White Glossy Mug | 4 |
| poster | 1 | Enhanced Matte Paper Poster (in) | 18 |
| canvas | 3 | Enhanced Matte Paper Framed Poster (in) | 69 |
| tote | 84 | Eco Tote Bag \| Econscious EC8000 | 4 |
| sticker | 358 | Kiss-Cut Stickers | 16 |
| phone | 181 | Clear Case for iPhone® | 25 |

All eight were present in the 587-entry public catalog and none had `is_discontinued: true` in that snapshot. The candidates add one mid-price DTG garment, one low-price single-variant journal, and two size-priced sublimation homeware/desk products. They do not replace or reorder the current eight.

## Does `products()` supply what the maker panel needs?

**Static source result: the mapping has the required fields, but candidate-specific runtime compatibility is not yet demonstrated.**

For each accepted product, `printful.products()` constructs `key`, `id`, `title`, `image`, `currency`, `placement`, `placement_label`, `area`, `dpi`, `variants`, and `base_from`. Each variant retains `id`, `name`, `color`, `color_code`, `size`, `price`, and printfile-derived `area`/`dpi`. `merchsets.panel()` consumes those fields to build its template, colors, sizes, variants, and price floor; `money()`/`floor()` consume variant prices. The four detail responses contain the catalog-side inputs (title, image, USD currency, variant IDs/names/colors/color codes/sizes/prices), and all variants are below the function's 500-variant cap.

Expected `kindOf()` behavior from the measured variant values: **145, 867, and 853** are color products (145 has 25 colors; 867 and 853 have one named color), while **395** is a size product because its variants have no color. This is an inference from the source plus measured responses, not a browser observation.

The decisive missing inputs are authenticated printfiles/templates. `products()` skips a product when no placement or usable printfile dimensions are returned. A real panel/mockup run is therefore still required before claiming any candidate works.

### Local test attempt (measured, not a pass claim)

Command: `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs` at about 08:13Z.

- Retry test: **1 passed** — a 429 is not cached as an empty product list, and a later hiccup retains the good list.
- Full maker/mockup test: **1 failed before its product assertions**, with `fetch failed` / `ECONNREFUSED 127.0.0.1:33791` while trying to reach its spawned local Commons server. This run does not establish a product-mapping regression, but it also provides no end-to-end pass. Total: **1 pass, 1 fail**.
- Full output: `teams/build/outputs/2026-11-24T08-13-44/round47-printful-tests.txt`.

## Handoff / limits

No authenticated detail, printfile, template, stock-by-destination, account-price, shipping, tax, mockup-generation, or visual approval check was performed. No staging or production claim is made. Before enabling a candidate, an assigned builder must configure only that test ID in a nonproduction environment, verify the authenticated printfiles/template mappings and actual costs, run the existing integration tests successfully, and inspect a real panel and generated mockup on desktop and phone.
