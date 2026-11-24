# Round 47 GPT — public internal links

## Result
Added `commons/test/public-links-static.mjs`, a plain-Node `node:test` scanner. It recursively reads public `.html`/`.js` files, records literal quoted or backtick `href="/..."`, `href='/…'`, and `href=`/…`` paths, strips query/hash, skips paths with `${…}`, and checks whether each path resolves to a file/directory under `commons/public/` or matches a literal `app.get`/`app.use` path in `commons/server.mjs` (`:param` matches one path segment; `app.use` also matches a prefix). It prints every checked link with its file and line. Unresolved links are reported as scan todos, not test failures.

## Measured run
- `node --check commons/test/public-links-static.mjs`: exit 0.
- `node --test commons/test/public-links-static.mjs`: 1 test, 1 pass, 0 fail, 0 skipped; duration 810.862 ms (Node test runner output).
- Scan: 112 literal links; 88 found a public file/directory or registered route; 24 scan todos. The test printed the full checked list in the run output. “Todo” here means this static scan did not identify a target; it is not Node's test-runner todo count (0).

## Scan todos (all 24; duplicates are separate hrefs)
- `arrive.js:784` `/headquarters`
- `arrive.js:826` `/headquarters`
- `door.html:46` `/headquarters`
- `door.html:50` `/ask` (twice)
- `hq.html:34` `/ask`
- `hq.js:519` `/show/land-city/proto/aletheia-observatory/walkable-3d-v2.html`
- `hq.js:1191` `/messages`
- `join.js:20` `/headquarters`
- `mail.js:160` `/m/`
- `preview-home/app.js:50` `/m/`
- `preview-home/index.html:7` `/cooperative`
- `preview-home/index.html:8` `/cooperative`
- `preview-home/index.html:12` `/cooperative`
- `preview-home/index.html:13` `/cooperative` (twice)
- `preview-home/index.html:15` `/cooperative`
- `preview-home/index.html:16` `/cooperative`
- `preview-home/index.html:16` `/ask`
- `roomview.js:174` `/headquarters`
- `signup.js:21` `/m/`
- `voiceroom.js:929` `/headquarters`
- `welcome/index.html:20` `/headquarters`
- `welcome/index.html:28` `/headquarters`

## Limits
This is intentionally a static check, not an HTTP/browser test. It detects literal `app.get`/`app.use` declarations only; computed hrefs are outside scope, and a reported todo may be supplied dynamically or by an unrecognized route pattern. No `npm ci`, server start, live site check, or production deploy was needed or attempted.

## CI follow-up
The build-lane workflow runs a new branch's own test files, but I could not write `.github/workflows/commons-tests.yml` because the write guard protects `.github/`. Filed assistant-seat board task **071** to add this test to the main Pages checks. Until that is done, don't describe it as included in the recurring main test suite.
