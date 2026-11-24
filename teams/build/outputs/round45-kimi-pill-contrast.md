# Round 45 — Kimi: navy/midnight inactive-pill contrast

## Changed

- `commons/public/market.css:527-528`: added one inactive-pill colour rule for each of `data-mk=navy` and `data-mk=midnight`. Each uses the page theme's own `var(--ink)` on the existing `--mv-paper:var(--panel)` background. `:not([aria-current="page"])` leaves the active white-on-plum pill unchanged. No layout, shared pill colour, or other theme was changed.
- `commons/test/theme-contrast.mjs:66-77`: replaced the two Round 44 TODOs with ordinary assertions. Each test now source-pins its theme-specific `var(--ink)` rule and checks the resulting ink/panel pair at 4.5:1 for normal 12px text.
- Result/evidence: `teams/build/outputs/2026-11-24T00-19-05/assigned-suite.log` and `result.json`.

## Measured

The Round 44 source-pinned measurements were navy **1.02:1** (`#292534` on `#1b2a3a`) and midnight **1.19:1** (`#292534` on `#121829`). Independently recalculated from the changed source, the new pairs are:

| Theme | Foreground | Background | WCAG contrast | 4.5:1 |
|---|---|---|---:|---|
| navy | `#f3ede0` (`--ink`) | `#1b2a3a` (`--panel`) | **12.5104:1** | pass |
| midnight | `#eef1f8` (`--ink`) | `#121829` (`--panel`) | **15.6287:1** | pass |

Required command, run locally on the edited files:

```text
node --test commons/test/theme-contrast.mjs commons/test/rendered-contrast.mjs
tests 7; pass 6; fail 0; cancelled 0; skipped 1; todo 0
duration_ms 89.674962; exit 0
```

The skip is `rendered-contrast.mjs`: **“no Chrome/puppeteer-core here.”** Thus the two former TODO assertions now run and pass, the general theme/body/link/form-label checks remain green, and no browser-rendered contrast check ran. No staging or production claim is made.
