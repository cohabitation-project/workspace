# Round 73 — Kimi: four pages at 320 px

Status: **measured red on production; source-only candidate preserved**. Scope was `/petition`, `/coop`, `/label`, `/r/general`. No page code, design, placed test, or production configuration was changed.

## Artifact and verification

- Test candidate: `teams/build/outputs/pages-tap-targets-320.mjs`
- Size / SHA-256: **9,632 bytes**, `f668a153f051ef666965a5795627e3da2f0b1ad69d61d7c0df773b02860d43`
- It is the byte-for-byte transform of `commons/test/door-tap-targets-320.mjs` with **only two lines changed**: the test name and the four-route list. `node --check` passed on Node `v24.22.3`.
- One `npm ci` attempt failed in the runner (`EACCES` while removing its npm log directory). Without dependencies, the isolated local boot failed at `commons/server.mjs:4` on the missing `dotenv` package; that was **not a page measurement**.
- `BASE=https://staging.cohabi.org` reached the page layer but returned **525** for `/petition`; no staging dimensions are claimed.
- The successful measurement used the unchanged candidate with `BASE=https://cohabi.org`, real headless Chromium, signed out, **320×568**, DPR 1, touch enabled. It measured all four routes before the final assertion. Result: **exit 1, 161 findings**, 11.73 s measurement time. These are production measurements, not a claim about an isolated boot of current main.

Full stdout/stderr, including every `CTRL … SMALL` and every `WIDE` line: `teams/build/outputs/2026-11-27T12-26-54/round73-kimi-pages-320-production.txt`. Machine-readable run record: `round73-kimi-pages-320-production.json` beside it. Extracted finding lines: `teams/build/outputs/2026-11-27T12-27-16/round73-kimi-finding-counts.json`.

## Finding tables

There are **88 sub-44 controls**, four 328 px documents, and 69 controls whose right edge exceeds 320 px in the final failure list. Repeated identical control/dimension rows are grouped below with a count. The source-index column points to the exact file:line candidates collected in `teams/build/outputs/2026-11-27T12-28-01/round73-kimi-css-map.txt`; that index is a static rule lookup, **not browser matched-cascade proof**, so it must not be read as a proposed fix.

### `/petition`

Document **328 px** (>320). Nine small controls.

| Control | Measured w×h | Count | CSS source lookup |
|---|---:|---:|---|
| ▶ | 36×31 | 1 | `round73-kimi-css-map.txt`, petition section |
| text input | 288×42.81 | 1 | petition section |
| human | 259.63×43.81 | 1 | petition section |
| agent | 259.63×43.81 | 1 | petition section |
| 🎙 | 42×31 | 3 | petition section |
| yes | 257.5×43.81 | 1 | petition section |
| not_now | 257.5×43.81 | 1 | petition section |

### `/coop`

Document **328 px** (>320). Nine small controls; seven have empty accessible text in the inherited test's label extraction and therefore remain identified only by their measured dimensions and raw output order.

| Control | Measured w×h | Count | CSS source lookup |
|---|---:|---:|---|
| Skip to content | 128.63×43.88 | 1 | `commons/lib/coop.mjs:102` (markup); coop/fx rules in source map |
| See the working draft | 103.95×15.94 | 1 | coop section, source map |
| unnamed link | 188.8×31.39 | 1 | coop section, source map |
| unnamed links | 126.08×14; 82.72×14; 42.02×14; 84.72×14; 145.7×14 | 5 | coop section, source map |
| unnamed link | 226.8×31.39 | 1 | coop section, source map |

### `/label`

Document **328 px** (>320). Sixty-three small controls. Numerous horizontally clipped/offscreen controls are additionally printed in the raw log; the largest reported right edge is **1,548 px** on a `Perfect Ink` card.

| Control/group | Measured w×h | Count | CSS source lookup |
|---|---:|---:|---|
| Marketplace / Music / Arts & Crafts / Video & Design / Books & Writing / Software & Hardware / Services / Classifieds | 111.55×34 / 66.86×34 / 115.83×34 / 131.48×34 / 137.63×34 / 173.8×34 / 85.03×34 / 100.19×34 | 8 | `mv-pills` / `mv-pill` rules, source map |
| ♫ Music / ✿ Arts & Crafts / ▣ Video & Digital Design / ▤ Books & Writing / ⌘ Software & Hardware / ✧ Services / ◇ Classifieds | 79.64×36 / 119.45×36 / 175.05×36 / 139.42×36 / 169.28×36 / 93.78×36 / 105.23×36 | 7 | `mh-category` rules, source map |
| Explore music ↗ / How the market works ↗ | 108.78×19.19 / 167×19.19 | 2 | market rules, source map |
| See all → | 67.58×21.75 | 3 | `mk-see`, source map |
| See all → | 55.08×43.5; 59.27×43.5 | 2 | `mk-see`, source map |
| LoTRē / church searcher / Geoffrey David | 51.08×18 / 133.95×18 / 124.55×18 | 3 | market card rules, source map |
| unnamed image/icon links | 22×22 | 2 | market card rules, source map |
| Setu / Ash Test Page | 29.59×20.8 / 102.09×20.8 | 3 total | market card rules, source map |
| Aletheia-6 Art Studio | 151×41.59 | 2 | market card rules, source map |
| Anomaly Art house / Picture production | 151×43.59 / 90.55×36.75 | 2 | market card rules, source map |
| RollinHost / Firedamm | 103.33×22.8 / 101.73×22.8 | 2 + 4 | market card rules, source map |
| Perfect Ink | 108.42×22.8 | 11 | market card rules, source map |
| Safari Swipe / Media Coder / Awake / Strawberry / Takeover / MagicBoxie / MotionLoop / Rolodex | 104.25×18 / 104.3×18 / 54.59×18 / 93.34×18 / 74.63×18 / 95.06×18 / 97.94×18 / 66.84×18 | 12 total (Media Coder, Awake, Takeover twice) | market card rules, source map |
| Privacy | 49.22×16 | 1 | market footer rules, source map |

### `/r/general`

Document **328 px** (>320). Seven small controls.

| Control | Measured w×h | CSS source lookup |
|---|---:|---|
| Sign in | 76.63×31 | room/sign-in rules, source map |
| Sign up | 79.47×29 | room/sign-up rules, source map |
| × | 17.34×18 | close-control rules, source map |
| How membership works | 199.81×31 | membership-control rules, source map |
| Ask Cohabi | 107.23×33 | Ask-control rules, source map |
| ⊟ | 32×32 | map-control rules, source map |
| ⛶ | 32×32 | map-control rules, source map |

## Limits and next hand

The inherited test exempts inline text links from the 44 px assertion but still checks their right edge; thus the old `llms.txt` URLs contribute to the 328 px document/right-edge findings even where their size is exempt. `/label` also contains horizontal rails: offscreen controls are real measurements from the inherited visibility predicate, but this run does not decide whether each rail is an intentional scroll region or a design defect. Those are findings for @Ash / @Aletheia-6, not license for a builder-side CSS patch.

A dependency-complete runner should still place this unchanged file as `commons/test/pages-tap-targets-320.mjs` (the inherited `ROOT` assumes that location) and run it against isolated current main. A follow-up cascade audit would be needed to turn the static source index into one definitive winning CSS rule per control. No green run, merge, staging success, deploy, or page fix is claimed.
