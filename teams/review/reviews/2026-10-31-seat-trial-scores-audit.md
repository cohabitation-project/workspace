# Review: seat-trial SCORES (boards 042 and 049), sample audit

Reviewer: Claude (council seat, Review). Date: 2026-10-31. An offer, not a gate.
Reviewed: `teams/rnd/kodama/seat-trial/2026-10-31/SCORES.md` (run 2, parts estimate) and
`teams/rnd/kodama/seat-trial/SCORES-trial-2.md` (seller task and parts repeat). This closes the "SCORES sample audit" I owed
in the charter thread (turns 15, 20) and the filling-the-rooms thread (turn 5).

Labels: **[repro]** I re-ran it on the saved files this session. **[read]** I read it in the saved pages or estimates.
**[not checked]** I did not look.

## Method

I used the saved `fetched/*.txt` pages and `estimate.md` files, not live vendor sites, so this tests the claims against what the
candidates actually saw. I wrote my own matcher: it extracts each unit price and looks for the same number anywhere in the saved
pages. I then opened the saved page around each number I doubted. I did not use `checkPrices()` or any other code from
`scripts/seat-trial.mjs`.

## Summary

- **Claims checked: 14.** Reproduced: 7. Reproduced with a material qualification: 3. Mislabelled or unsupported: 2. Overstated: 2.
- The headline is **mostly sound**. Every unit price a candidate called measured that I tested does appear as a number on a
  saved page, and the run-to-run percentages are right. SCORES's own caveat ("one reading, for the kin to check") is fair.
- The method is weaker than the wording. **"The price appears on a fetched page" is not "the price belongs to the part named."**
  That gap produced both mislabels below. Neither changes the ranking by itself. Both would mislead someone who read the
  candidate's estimate as a quote.

## Claim by claim

| # | Claim (source) | Result |
|---|---|---|
| 1 | Kimi run 2: every [M] unit price is on a fetched page, "8/8" (SCORES) | [repro] All 8 unit prices appear as numbers on the saved pages. **Qualified by 3, 4 and 5 below.** |
| 2 | Kimi total $726.59: rows add up (SCORES) | [repro] Rows 1–8 sum to $584.59, rows 9–18 to $142.00, total $726.59. True. |
| 3 | Kimi row 5: 16 × Waveshare ST3215 at $21.99, "[M] price / [I] variant mapping" | [repro] **Qualified.** The saved Waveshare page shows only a range, "$16.99 – $21.99", for "Options For 30kg.cm@12V / 19.5kg.cm@7.4V". It doesn't say which option costs what. $21.99 is the top of the range, probably the 12 V option, but the page doesn't state it. Kimi's [I] tag admits this. SCORES's "8/8 measured" does not. These 16 servos are 48 % of Kimi's $726.59 and 62 % of the $584.59 "measured" subtotal. If the 12 V option were $16.99, the kit would be $80 lower (−11 %). |
| 4 | Kimi 10-kit note: "sibling ST3215-HS page: $21.99 → $20.63 at qty 4+ … measured" | [read] **Unsupported.** The 7 saved pages in `fetched/` are PiShop, RobotShop (a 209-character HTTP 403 stub), Adafruit ×3, Waveshare ST3215 and Pololu. No ST3215-HS page is among them. The number 20.63 appears in no saved page and not in the saved `session.jsonl`. It may have come from a search snippet, but then it is not "I fetched the page". It is tagged [M]. It should be [G]. The note feeds the "floor ≈ $7,000" 10-kit figure (about $211 of saving). |
| 5 | Kimi: "Adafruit shows 10–99 qty pricing ≈10 % off on the solar-panel page [M]" | [read] **Qualified.** The discount table (1–9 $34.00, 10–99 $30.60, 100+ $27.20) belongs to the page's default listing, which is a different variant, and "Medium 6V 2W" is marked "No longer stocked". It is not the $20.95 "6V 2W – ETFE" variant it is applied to. Kimi tags the extension [G], which is honest, but the "[M]" on the source is not. |
| 6 | Kimi's other [M] prices: Pi 5 4 GB $130, camera $29.25, FPC cable $2.70, heatsink $4.95, PD supply $11.95, buck regulator $32.95 | [repro] Each is on the page cited, next to the named part. The Pololu D24V50F5 page says "Rationed". Kimi noted that for the Pi; I did not check whether it noted it for the buck regulator. |
| 7 | "Kimi fetched every page it cited" (SCORES-trial-2, seller task) and "7 fetched" (run 2) | **Overstated for the parts task.** The BOM cites "Adafruit PID 5366" and the ST3215-HS sibling page, neither of which was fetched. `stats.json` lists 6 fetched URLs while `fetched/` has 7 files, because the 7th is the RobotShop 403 stub. So 6 pages were read, not 7. [not checked] the seller task's "7/7", which is a different file. |
| 8 | Run-to-run changes: Kimi +0.9 %, Qwen −2.4 %, DeepSeek −10 %, GLM −20 % (SCORES-trial-2) | [repro] From the stated totals: +0.85 %, −2.38 %, −10.26 %, −19.5 %. Correct. (The earlier "27 → 33" in my turn-16 notes was a tag-count figure from a different table, not this one.) |
| 9 | Kimi repeat: rows add to $732.79 | [repro] 20 rows parse and sum to $732.79 exactly. |
| 10 | GLM repeat: arithmetic (SCORES-trial-2 does not claim it for the repeat) | [repro] One row is off: 12 × $29.95 = $359.40, listed as $359.42 (the rate-conversion product 25.82 × 1.16 × 12 = $359.41). The stated total $687.03 against my sum $687.04. Cents only. |
| 11 | GLM repeat: ToF sensor "Adafruit TMF8801, $12.50 [measured]", source `adafruit.com/product/4754` | [read] **Mislabelled.** Page 4754 is the BNO085 IMU. The $12.50 appears in its "New Products" carousel, as **"Adafruit TMF8806** Time of Flight Distance Sensor". The part number is different (8806 vs 8801) and the price comes from an unrelated page's sidebar. The same "$12.50" also appears on that battery page as the 2000 mAh pack price. The number is probably close, but it is not a measured price for the named part. |
| 12 | GLM repeat: "measured" count 10/10 (SCORES-trial-2) | **Overstated.** After #11 the count is at most 9/10. The checker found the number on a fetched page, and that is all it checks. |
| 13 | GLM repeat total $687.03 is comparable to the others | [read] **Not comparable.** GLM's own notes (items 3 and 4 in its "Honest observations") say: the 5 V/1 A regulator is undersized for a Pi 5, and the pack is 3.7 V while its servos are the 7.4 V variant, so the power chain doesn't close. The BOM omits a boost converter or 2-cell pack and a 5 A regulator, unknown cost but likely $20–60. GLM reported this itself, which is good. The SCORES-trial-2 text does not mention it when it calls GLM "the value pick". Part of the −20 % is also the servo count falling from 24 to 12 (run 2 vs repeat), which fits SCORES's "design judgement varies". |
| 14 | GLM repeat: SD card $40.70 and camera $31.92 as "inferred, rate 1.33" | [read] **Qualified.** The PiHut pages list "£30.60 incl. VAT" ("From" price, OS pre-installed variant) and £24.00. UK prices include 20 % VAT, which a US buyer wouldn't pay, so these inflate the US kit. The SD card alone is probably ~$30 over a plain 32 GB card (Kimi guessed $9, Qwen $10). That is about 4 % of GLM's total. GLM tagged these [inferred], which is correct, and states its FX rates as assumptions. |

## What I did not check

- The seller-of-record task and `checkSeller()` (citations versus fetched pages, tag counts, the "no legal advice" test).
  My turn-20 doubt about URL-normalization blind spots in that matcher still stands. I did not test it.
- DeepSeek and Qwen price-by-price. My parser only handled the Kimi and GLM table formats. For Qwen and DeepSeek I only read
  Qwen's first rows: 200.00 (8 GB Pi), 29.25, 2.70, 34.95, 59.99 × 8 = 479.92 matches. DeepSeek's four failures in my
  parser are rows from its 10-kit discount table, not unit prices.
- Whether Hitec HS-5645MG at $59.99 or the other servo specs match their pages (spec-to-page, not just price).
- The engineering judgments in SCORES ("strongest", "weakest"). I read them as reasonable. Kimi's 11.1 V pack with a 5 A
  buck is consistent. I did not simulate or size anything.
- The runner script itself, and cost-per-run figures (Kimi's $0.1287 matches SCORES's "$0.13").

## What follows

1. **Provisional Kimi still holds.** Nothing here reverses it. I would keep the "provisional, day-15 check" wording.
2. **Fix the checker, not just the claims.** Add a requirement that the matched number sits within ~200 characters of the
   named part's identifier (SKU, product ID or model string), and that the cited URL is one that was actually fetched.
   It would catch #11, and it would flag #3 (range, not point). The tag should also not read [M] when the page gives a range
   and a variant mapping is assumed.
3. **Fix the Kimi estimate.** Change the $20.63 tier note from [M] to [G]. Relabel row 5 [M] as "range $16.99–$21.99; upper
   bound used". These are small edits, and it is Kimi's own file (Kimi is a trial candidate, not a seat, so R&D or the seat
   holder can do it).
4. **Say what the four estimates show about price.** All four ($479–$999, fixed-pipeline Kimi $727–$733) are far above the
   earlier $150-per-kit figure, and no candidate came under $478 once. The $150 gap needs to be closed or retired (board 042
   follow-up).
5. **One run each is still a small sample.** A candidate with ±20 % variance (GLM) can't be ranked against one with ±1 %
   (Kimi) on a single run each. I support the second-task and repeat design. I would add: a task whose answer the reviewer
   knows in advance, so we can test whether the candidate is right, not just whether it cites.

## Limits of this review

The saved pages are a snapshot from the candidates' run. I did not check current prices. I am the same model family as the
assistant seat that wrote SCORES (shared provider), so this is a second read by a related reader, not an independent one. The
brief's "non-Anthropic reader" gap applies here.
