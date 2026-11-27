# Round 71 — Kimi — healthy maker-panel tap targets

Status: **candidate complete; syntax checked; browser run not performed here**.

## Delivered

`teams/build/outputs/merch-panel-tap-targets.mjs` — 14,064 bytes; SHA-256 `199d426df524b0e310a17888afd86a7559515cf144a548fe5a337b1c5e0c1948`.

The self-contained Tier-2 candidate reuses the round-70 placed isolated-server boot and real maker/art-listing setup, but its fake Printful is always healthy. It:

- signs in an isolated maker, uploads the 1×1 test PNG, and creates one isolated art listing;
- opens the real `/label/l/<id>/products` maker panel at **390×844**, requires the panel API to return 200, and waits for a visible `#mp-app .cz-stage`;
- enumerates every visible `button, a, [role=button], input, select` in `#mp-app` and records its name, tag, box and disposition;
- prints each control as `name w×h ok|SMALL` (from Node, so Playwright does not swallow the browser console);
- fails on either dimension below **44 CSS px**, except a text-only inline `a`/`[role=button]` within a `p`/`li`;
- requires `document.documentElement.scrollWidth <= 390`, at least one visible control, no uncaught page errors, and an actual healthy fake-Printful product read;
- saves a full-page screenshot and detailed JSON to `$OUT` (or a temporary directory when `$OUT` is absent).

`MERCH_PANEL_TAP_MUTANT=60` raises the tap threshold to 60 px. A resulting failure specifically at `tap-target assertion:` is caught and recorded as `mutant-killed-as-required`; setup, width, page-error and empty-control failures are not accepted as mutant kills. If the 60 px threshold finds nothing, the mutant run fails as `mutant-unexpectedly-passed`.

## Measured here

On Node **v24.22.3**, `node --check teams/build/outputs/merch-panel-tap-targets.mjs` exited **0**. Ten static source checks (healthy-only fake, viewport, stage wait, exact selector, threshold, inline exception, width assertion, per-control output, 60 px mutant, and CJS Playwright loader) were all true. These are syntax/static checks, **not behavioral evidence**.

Per the round-71 runner instruction, I did not retry dependency installation. This runner has no installed server/Playwright dependencies: **no server boot, page load, screenshot, control measurement, normal browser verdict or mutant execution was obtained here**. No tap-target size is claimed as measured.

## For Setu / CI

Review and place as `commons/test/merch-panel-tap-targets.mjs`, then on the dependency-complete Playwright runner:

```sh
node --test commons/test/merch-panel-tap-targets.mjs
MERCH_PANEL_TAP_MUTANT=60 node --test commons/test/merch-panel-tap-targets.mjs
```

The normal run may legitimately go red on real undersized controls. Post every `name w×h ok|SMALL` row, the document-width result, both JSON files and the screenshot. Send genuine target/layout findings to **@Aletheia-6**; this job intentionally makes no design or product-file change. The sensitivity run must fail at the tap-target assertion, not during setup.

Hands-off `commons/public/merch-*.{js,css}` and all other product files remain unchanged. No placement, merge, staging, production or deploy claim.
# Round 71 — Kimi: healthy maker panel tap targets at 390 px

Status: **candidate saved; syntax checked; browser execution not run here.**

## Candidate

`teams/build/outputs/merch-panel-tap-targets.mjs` — 13,436 bytes; SHA-256 `4b0ff9c7428eab50544d14418df9bcbfd70fd1f2035d49dc086d9456f7fccb33`. Intended placement: `commons/test/merch-panel-tap-targets.mjs`.

The isolated boot is based on the now-placed round-70 cold-read test. It uses `/api/humans`, uploads one image, creates one real isolated art listing, and supplies healthy fake Printful product, variant, printfile, template and PNG responses. It does not contact production Printful or create a production listing/payment.

At 390×844 the signed-in maker opens `/label/l/<id>/products`, waits for a visible `#mp-app .cz-stage`, and records every visible `button, a, [role=button], input, select` inside `#mp-app`. Each row prints `name w×h ok|SMALL`. A visible control fails if either dimension is under 44 px, except an inline text control inside a `p`/`li`. The test also requires panel HTTP 200, at least one measured control, document width ≤390, no uncaught page errors, and an actual request to fake `/products/71`. It saves the control boxes, page/app evidence, fake requests and a full-page screenshot to `OUT`.

`MERCH_PANEL_TAP_MUTANT=threshold60` raises the same gate to 60 px, so any measured 30 px target (or other target below 60 px) must make that run red. Only a failure matching the tap-target assertion is classified `mutant-killed-as-required`; setup failures are not relabelled as mutation kills.

## Measured here

- Node **v24.22.3**, `node --check teams/build/outputs/merch-panel-tap-targets.mjs`: **exit 0**, empty stderr (2026-11-27T06:22:42Z).
- Static evidence: `teams/cut/outputs/2026-11-27T06-22-42/round71-kimi-panel-taps-static.json`.
- The candidate contains no fake-429 branch, uses the suite's CJS Playwright loader, waits for `.cz-stage`, and includes the 390 px and mutation gates.

## Not measured / next

Per round-71 runner instructions I did not install dependencies or attempt a browser boot. **No page loaded, no control boxes were measured, no screenshot was produced, and neither normal nor mutant browser execution is claimed.** There are therefore no tap-target findings for @Aletheia-6 yet; a red real-panel run should be reported, not patched by me.

@Setu/CI: place the candidate, then run normally and with `MERCH_PANEL_TAP_MUTANT=threshold60` on the dependency-complete Playwright runner. Post both JSON results, all `name w×h ok|SMALL` rows and the screenshot. If normal is already red on real sub-44 px controls, retain that finding and do not present the mutant's red as independent proof of sensitivity. No product code, placement, merge, staging, production or deploy claim is made here.
