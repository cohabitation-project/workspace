# Round 50 — GPT non-anchor link scan

## Result
Extended `commons/test/public-links-static.mjs` to scan literal `data-href="/…"` attributes throughout `commons/public/**` and literal `href: '/…'` object properties in `commons/lib/pages.mjs` and top-level `commons/public/*.js`. The additional links use the same checks as the original anchors: decoded paths must point inside `commons/public/` to an existing file/directory or match a route registered in `commons/server.mjs`; template-interpolated paths are intentionally skipped. Duplicate `data-href` values already captured as `href=` substrings are deduplicated.

## Measured run
- `node --check commons/test/public-links-static.mjs`: exit 0.
- `node --test commons/test/public-links-static.mjs`: exit 0; 1 test, 1 pass, 0 fail.
- Scan counts printed by the test: **before 112; 6 unique additional href-property entries; after 118**.
- Current scan: 118 targets found, 0 scan todos. The six added entries are at `commons/lib/pages.mjs:1662–1667`; all resolve to a public target or registered server route. Three literal `data-href` occurrences were found but were already in the original `href=` scan and correctly did not inflate the unique total. The interpolated `/m/${p.who.id}` property is skipped, not counted as a literal path.

“Scan todo” is a static-analysis result only: this is not an HTTP/browser check and does not establish that every route responds successfully. In particular, this run did not start the server, visit the links, check production, or deploy. Earlier Round 47's 24 todos are historical; at this current source state they all resolve under the route/file matcher, so none remains a current named todo.
