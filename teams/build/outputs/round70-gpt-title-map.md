# Round 70 — GPT title map

Status: round 71, filling. Inventory only; no page code changed. The sitemap inventory has 35 paths (Setu's Round 70 measurement); this working draft below starts with the exact examples provided in `teams/build/JOBS.md`. I am collecting the other paths and source locations before calling it complete.

Proposed rule for Ash to accept or change: **`<Page> · Cohabi`**, with the home page unchanged.

| Path | Title now (Setu measurement in JOBS.md unless noted) | Source where title is set | Proposed title |
|---|---|---|---|
| `/commons` | The Commons · Cohabi | `commons/lib/pages.mjs:114` static title | The Commons · Cohabi |
| `/label/releases` | Last of the Real Estate · The Commons | route `commons/server.mjs:2009-2012` → `pages.labelPage`; exact title line not located yet | Last of the Real Estate · Cohabi |
| `/petition` | The Cohabitation Petition · The Commons | `commons/lib/pages.mjs:60` dynamic `<title>${esc(title)} · The Commons`; caller not traced yet | The Cohabitation Petition · Cohabi |
| `/social` | Feed · Cohabitation | `commons/lib/feedv2.mjs:508` dynamic `socialPage` title suffix | Feed · Cohabi |
| `/feed` | Cohabi Feed · Cohabi | `commons/lib/feedv2.mjs:667` static title | Cohabi Feed · Cohabi |
| `/label` | Market · Cohabi Market | `commons/lib/marketpage.mjs:158` dynamic page-title template | Market · Cohabi |
| `/signup` | Create your account · Cohabitation | `commons/lib/pages.mjs:1024` dynamic title suffix | Create your account · Cohabi |
| `/arrive` | First Arrival — The Commons | `commons/public/arrive.html:6` | First Arrival · Cohabi |
| `/door` | The Door — the Commons | `commons/public/door.html:6` | The Door · Cohabi |
| `/ask` | Headquarters · The Commons | `commons/public/hq.html:6`; server wrapper at `commons/server.mjs:547,604` titles room page | Headquarters · Cohabi |
| `/members` | Members · Cohabi | `commons/lib/memberspage.mjs:57` calls `socialPage('Members', ...)` → `feedv2.mjs:508` | Members · Cohabi |
| `/room/<id>` | `<Room> · The Commons` | `commons/server.mjs:604` sets `hqTitle` to room name; `:547` replaces template title | `<Room> · Cohabi` |
| `/wishlist` | (not in measured examples) | pending | (derive after lookup) |
| `/library` | (not in measured examples) | pending | (derive after lookup) |
| `/join` | (not in measured examples) | pending | (derive after lookup) |
| `/privacy` | (not in measured examples) | pending | (derive after lookup) |
| `/terms` | (not in measured examples) | pending | (derive after lookup) |
| `/tour` | (not in measured examples) | pending | (derive after lookup) |
| `/headquarters` | (not in measured examples) | pending | (derive after lookup) |
| `/label/l/<id>` | (not in measured examples) | pending | (derive after lookup) |

Remaining sitemap paths and source lines are not yet inventoried; do not treat this draft as complete.
