# Review: t_dc2ecc2392, Lulu pricing + price proposal for Books & Writing
Reviewer: Claude (review seat), 2026-11-28. Reviewed: `teams/income/lulu-pricing-2026-11-27.md` and `scripts/lulu-cost-quote.mjs` on main. I read both and re-did the arithmetic in Python. I did NOT call Lulu (no credentials, and that is right). Nothing was run on the server.

## Verdict: ACCEPT as a pricing proposal, with 5 fixes listed below. Not a basis for a live price table until fix 1 is done.

## What I checked, and result
| Claim | How I checked | Result |
|---|---|---|
| Fulfillment fee is $0.75, not $1.75 | Lulu's own pages, fetched today | **Both numbers are real, for two different products.** Lulu *Print API* page (help.api.lulu.com/.../64000265990, modified 17 May 2024): USD 0.75, "the Print Job Cost Calculation endpoint includes this fee". Lulu *Direct* page (help.luludirect.lulu.com/.../64000267494, modified 17 Sep 2026): USD 1.75, plus tax on the handling fee. The server uses the Print API (client credentials against api.lulu.com), so $0.75 is the right figure *if the Print API fee has not changed since the 2024 page*. The live run, as reported, gave $0.75, which agrees. |
| Landed MAIL $12.18 / $15.93 / $24.62 | add print + 0.75 + 5.69 | reconcile (inferred from the doc's own inputs) |
| Author-keeps $6.10 / $5.83 / $6.73 at 10% | Python, processing = 2.9% × (list + shipping) + $0.30 | $6.10 / **$5.84** / $6.73. The PB300 figure differs by 1 cent (rounding). Immaterial. |
| Processing "on the full charge" | formula in §2 | consistent: the author, not the buyer, bears Stripe's fee on the shipping line too. Disclosed in the formula, but not said in words. |
| Floors "author nets ≥ ~$1.50" | solved for list price | PB150 min $9.71 → stated $9.99 gives net $1.75 ✓. PB300 min $14.01 → stated **$13.99 gives $1.48** (under, within the "~"). HC300 min $23.99 → stated $24.99 gives $2.37 ✓. |
| Suggested range ends are profitable | net at each end | PB150 $4.36–7.84, PB300 $4.09–8.45, HC300 $4.98–11.08 (all positive) |
| Gate list (§4) | read | complete for a test-to-real flip: seller of record, vote on cut, refund/reprint policy, shown split, one supervised order |
| "Live read-only run, no print job" | script read | the script only POSTs `/print-job-cost-calculations/`; it creates no job and uploads nothing. Token stays in process. ✓ (code read, not run) |

## Not verified
1. **The raw quote JSON is not in the repo.** The script ends by asking for "this whole block pasted back". I find no file of it under `teams/income/`. So print $5.74 / $9.49 / $18.18 and shipping $5.69 / $20.74 are Setu's report of Geoffrey's run, not something I can open. Only the $0.75 has an independent source (above).
2. The SKUs `…PB060UW444MXX` and `…CW060UW444MXX` were accepted by the API per the report; I did not check Lulu's SKU grammar.
3. Whether Stripe Connect adds a fee on top of 2.9% + $0.30 (the Anomaly 01 payments doc, `c_mwgmf4vp0d74daf1`, is where that lives). The model assumes not.

## Fixes (small; none blocks the doc being a proposal)
1. **File the raw JSON** from the live run as `teams/income/outputs/lulu-cost-quote-2026-11-27.json` (with `ran_at`). It is the only evidence for the print and shipping numbers. Strip nothing except the token (the script never prints it).
2. **Two different floors.** §3 defines the floor as "author nets ≥ ~$1.50" ($9.99 / $13.99 / $24.99). The next paragraph says the endpoint refuses below "landed cost + cut + processing", which is net ≥ $0: **$7.99 / $12.29 / $22.27**. Lulu's own minimum list price is print + processing + fulfillment (no cut, no shipping). Pick one definition before the endpoint is written, and test it: one below-floor refusal per spec and a mutant that removes the check.
3. **Name the $1.75 trap in the doc.** The $1.75 comes from Lulu *Direct* pages (and their buy-button example). Add one line saying so, with the two URLs and dates, so the next reader does not "correct" $0.75 to $1.75. Also note the Print API page is dated May 2024, so the quote endpoint should read the fee from the API response each time, not hardcode $0.75.
4. **Refunds are not modelled.** The fee schedule proposal (item 5) says refunds return the co-op's cut. Stripe does not return its processing fee on refunds, and a Lulu misprint reprint costs the author or co-op the print cost. §4 item 3 names the policy but the author-keeps table has no refund row. Say who bears the Stripe fee on a refund.
5. **US only, MAIL only.** The doc says so. A quote endpoint must refuse a non-US address, not reuse the US flat rate (asked in the review room on 27 Nov, not yet answered).

## Limits of this review
Arithmetic and the public Lulu fee pages only. No live API call, no run of the script, no browser, no server. Competitor numbers in the fee schedule were not re-checked.
