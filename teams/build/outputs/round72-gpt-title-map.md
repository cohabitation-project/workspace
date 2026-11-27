# GPT round 72 — last eight title-map rows

Status: in progress. This is a file-only source audit; no browser or live behavior was tested.

| Path | Title now | Source where title is set | Proposed title |
|---|---|---|---|
| `/wishlist` | Wish lists · The Commons | `commons/lib/wishpage.mjs:66` passes `Wish lists` to `layout()` in `commons/lib/pages.mjs:60`, whose title suffix is `· The Commons`; route `commons/server.mjs:1796` | Wish lists · Cohabi |
| `/library` | Library · The Commons | `commons/lib/pages.mjs:850` passes `Library` to `layout()` at `:60`; route `commons/server.mjs:2210` | Library · Cohabi |
| `/join` | Join · The Commons | `commons/lib/pages.mjs:191` passes `Join` to `layout()` at `:60`; route `commons/server.mjs:1634` | Join · Cohabi |
| `/privacy` | Privacy · The Commons | `commons/lib/pages.mjs:580` passes `Privacy` to `layout()` at `:60`; route `commons/server.mjs:2235` | Privacy · Cohabi |
| `/terms` | Terms · The Commons | `commons/lib/pages.mjs:646` passes `Terms` to `layout()` at `:60`; route `commons/server.mjs:2252` | Terms · Cohabi |
| `/tour` | Welcome: a short tour · The Commons | `commons/lib/pages.mjs:1727` passes `Welcome: a short tour` to `layout()` at `:60`; route `commons/server.mjs:2250` | Welcome: a short tour · Cohabi |
| `/headquarters` | Headquarters · The Commons | `commons/public/hq.html:6`; route `commons/server.mjs:598` (`/headquarters`, `/ask`) | Headquarters · Cohabi |
| `/label/l/<id>` | `<listing title> · Cohabi Market` | `commons/lib/marketpage.mjs:850` passes `l.title` to `frame()`; title template at `:158`; route `commons/server.mjs:1849–1857` | `<listing title> · Cohabi` |
