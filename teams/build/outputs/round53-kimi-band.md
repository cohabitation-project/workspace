# Round 53 — Kimi, PR #299 purple-band candidate

## Verdict

**PASS for the proposed one-line candidate, on the assigned automated checks.** Removing the scoped search bar's desktop `33px` bottom padding eliminates the measured 1,200 px purple run, preserves all three desktop geometry/overflow passes, and produces no measured mobile regression. This is a patch candidate for **@Aletheia-6 / @Ash**, not a merged implementation or human visual approval.

- Exact PR #299 head: `3e60cce9e99f6a5dce76082d893783f72105798d` (git-verified in the isolated checkout).
- Browser actually used: **`/opt/google/chrome/chrome`** (the path named by this job), headless, device scale factor 1.
- Four signed-in runs completed with `status:"measured"` and `failure:null`: before/after at **1536×900** and **390×844**. Each used an isolated server, stand-in Printful and a newly created isolated listing; eight products rendered and “PR299 Painter” was visible.
- No `commons/public/merch-*` implementation file or CI configuration was changed in the shared record. The durable diagnostic was generalized only in the scratch checkout. The only implementation change is represented by the separate patch file below.

## Candidate and diff hash

`teams/build/outputs/round53-kimi-band.patch` changes only:

```diff
-  padding:0 clamp(16px,5vw,84px) 33px;
+  padding:0 clamp(16px,5vw,84px);
```

`git hash-object teams/build/outputs/round53-kimi-band.patch` = **`477e093311009587303592985676e25ade7e9a0f`**. Patch size: 606 bytes.

## Before-style diagnosis at 1536×900

The exact selector **`.mk-searchbar.mv-search`** was found. Before the candidate, its own computed style was:

- rect: `x=0, y=189.59, width=1200, height=77, bottom=266.59`; client/scroll height `77/77`;
- `display:flex`, `box-sizing:border-box`;
- padding: `0 76.8px 33px`; bottom margin `19px`;
- `background-color:rgba(0, 0, 0, 0)`;
- own `background-image:linear-gradient(rgb(154, 69, 125), rgb(104, 52, 95) 12%, rgb(109, 53, 100) 62%, rgba(0, 0, 0, 0) 100%)`.

Computed `::before` and `::after` styles were also dumped. Both had `background-image:none`, transparent background color, no padding and `height:auto`; neither supplies the measured purple strip. The strip is the tail of the element's **own gradient across its extra 33 px padding box**. This also explains why a DOM query limited to opaque background colors or different gradient colors could miss it while PNG pixels saw it.

After the candidate, the same desktop element has `height:44px`, `padding-bottom:0px`, and `bottom:233.59px`. Its gradient therefore ends where the former 1,200 px run at y=234–246 began.

## Measured before/after results

Pixel method is unchanged from round 50: `R>45, B>65, B>1.25G, R>1.15G`, with at least 65% of the row width matching. Screenshot pixels decide the purple-band verdict.

| Check | Before | After | Verdict |
|---|---:|---:|---|
| Desktop defective purple run | **1,200 px wide, y=234–246** | **absent** | **PASS** |
| Other desktop upper-chrome runs | y=86–154 and y=162–189 | same two runs | unchanged; not classified as the defect |
| Actions card / heading overlap | 0 px² | 0 px² | **PASS** |
| Pricing heading / price overlap | 0 px² | 0 px² | **PASS** |
| Desktop pricing table | client/scroll `420/420`; internal 0 px; outside viewport 0 px | same | **PASS** |
| Desktop document horizontal overflow | 0 px | 0 px | **PASS** |
| Desktop full-page PNG | 1536×2317 | 1536×2284 | 33 px shorter, matching removed padding |

### 390×844 regression check

Before and after are identical on the measured mobile checks: search bar `390×59` with `padding-bottom:15px` from the mobile rule; full-page PNG `390×3641`; actions/heading and pricing/price overlaps both 0 px²; table client/scroll `380/380`, internal overflow 0 px; document horizontal overflow 0 px. The mobile purple-run lists are also unchanged.

The table's bounding rect extends **42 px beyond the mobile viewport both before and after**, inside its horizontally scrollable breakdown container; this is pre-existing, does not create document overflow, and is not newly introduced by this candidate. It is recorded rather than hidden. These automated checks are not a claim that every mobile visual detail has human approval.

## Evidence

All evidence is under **`teams/build/outputs/2026-11-25T00-19-24/`**:

- `round53-measurement-summary.json` — combined head, computed-style dumps, geometry and pixel results for all four runs.
- `before-1536x900/` and `after-1536x900/` — full-page PNG, result JSON, pixel JSON, run log and server log for each.
- `before-390x844/` and `after-390x844/` — the same mobile evidence.
- `round53-kimi-band.patch` — exact measured candidate, also filed beside this report.

The outer Python cleanup reported an `EACCES` while removing its temporary fontconfig directory after producing the evidence. The four browser result files were nevertheless completely written as `measured` with null failures, and the combined summary and patch were produced afterward; no failed browser stage is being concealed. Next: **@Aletheia-6 decides whether to apply the patch to #299; @Ash reviews the evidence.**
