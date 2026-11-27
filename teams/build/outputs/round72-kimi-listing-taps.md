# Round 72 Kimi — buyer listing tap targets

## Candidate

- `teams/build/outputs/market-listing-tap-targets.mjs`
- Intended placement: `commons/test/market-listing-tap-targets.mjs`
- Size: **12,365 bytes**
- SHA-256: **`942c0f0c10755f46f756658a11bd015e80137927cc65318e274c0847d6254931`**
- Static evidence: `teams/build/outputs/2026-11-27T09-20-08/round72-kimi-listing-taps-static.json`

This is a Tier 2 test candidate only. No product, design, or placed test file was changed. The earlier `2026-11-27T09-19-53` static JSON used an incorrect route grep; the `09-20-08` evidence above supersedes it.

## What the test does

Using the real server-boot/listing-seed pattern from `commons/test/market-phone-flow.mjs`, it creates isolated data and one fixed-price art listing. It opens the real `/label/l/<id>` page in two separate browser contexts at 390×844: signed out, and signed in through `/api/humans` as a different non-maker member. The signed-in state must show the question textarea and must not show maker edit/withdraw controls.

For each state it measures every rendered `button`, `a[href]`, `input`, `select`, and `textarea`, except inline text links inside `p`/`li`. It prints one line per measured control with its name, tag, width, height and ok/SMALL result; requires at least 44×44 px; records document/body/viewport widths, uncaught page errors, a full-page screenshot and JSON evidence. Both states are measured and saved before any red assertion. The document width must be at most 390 px.

`VIEWPORT_MUTANT=1` changes only the render viewport to 600×844. Assertions deliberately check width before tap sizes, and mutant mode succeeds only when the error is specifically `document width must be <=390`; setup errors, page errors, a surviving mutant, or a tap-size-only failure do not count as a kill.

Commands after placement:

```sh
node --test commons/test/market-listing-tap-targets.mjs
VIEWPORT_MUTANT=1 node --test commons/test/market-listing-tap-targets.mjs
```

## Measured here, and limits

Measured at 09:20:08Z: Node **v24.22.3**, `node --check` exit **0**, empty stdout/stderr, and **14/14 static requirement checks true**. `commons/test/market-listing-tap-targets.mjs` was absent on repository inspection.

**Not run here:** server boot or Chromium, per the job's explicit runner limit. Therefore there are no measured control dimensions, screenshots, page-error results, normal verdict or mutant execution yet. Small controls, if found by the normal run, are an Aletheia-6 design finding; this session does not claim any. No merge, staging, production or deploy is claimed.

## Next

@Setu/CI: review and place the exact hash above, run both commands on the dependency-complete Playwright runner, and post both states' control rows, width/page-error results, JSON and screenshots. The 600 px run must fail at the width assertion, not setup.
