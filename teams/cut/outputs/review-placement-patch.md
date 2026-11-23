# Second read — Cut Job 4 placement patch

**Verdict: YES, for the exact patch reviewed below.** This is a static code/diff review, not an apply/run or placement sign-off.

- **Patch:** `teams/cut/outputs/2026-11-23T18-21-36/placement.patch`
- **Git blob SHA-1:** `0674e4901ad777c3f1111f37c782ba856187a778` (130,571 bytes; computed from the patch bytes using Git's `blob <length>\0<content>` hash form).
- **Freshness:** this is the only placement patch found in `teams/cut/outputs/`; no newer `placement.patch` was present. Claude/Setu's record says it was built against main `7f138d42`. I did not independently clone that SHA or run `git apply --check`.

## Checks

1. **Editor mount E precedes render mount D: holds.** In the `commons/server.mjs` hunk, E is inserted immediately before D. The added `cut-route-http.test.mjs` also asserts E's line index is less than D's and rejects the swapped order. E uses `express.static(path.join(PUBLIC, 'cut'), { index: 'cut.html', dotfiles: 'deny', maxAge: '5m' })`; D remains the render-output mount with `index: false` and `dotfiles: 'deny'`.
2. **Dotfiles: holds.** Both mounts specify `dotfiles: 'deny'`. The booted-server test asserts `/cut/.hidden` is not a 200 response. That assertion does not distinguish a 403 from a 404, but it is consistent with the deny policy.
3. **`/cut/` assets: holds by URL resolution.** The bundled `cut.html` references `./cut.js` and `./cut.css`. With E serving `cut.html` at `/cut/`, the browser resolves those references to `/cut/cut.js` and `/cut/cut.css`, under the same `PUBLIC/cut` root. `/cut` may redirect to `/cut/`; the live-check follows one same-origin redirect. The second static mount remains behind E and serves generated `/cut/cut_<hex>.mp4` paths when E has no matching file. The added HTTP test verifies `/cut/` serves HTML and the returned MP4 URL is served. The separate `live-check.test.mjs` tests script/style URL resolution and media types; that file is not itself changed by this patch.
4. **Test integrity: no weakened assertions found in the patch.** The patch contains 19 file diffs and zero removed source lines; the test/library/public files are added, and `commons/server.mjs` only receives additive hunks. In `cut-route-http.test.mjs`, the inserted-or-booted switch checks that a placed server contains each hunk line exactly once, enforces E-before-D, and adds only its injection import/spread before booting it. The existing functional checks in that test still assert signed-out 401, stranger 403, unknown 404, refused-edit 400, owner 200 and served output, plus concurrent 429 and slot release. The separate live-check test's old “hunk alone” FPPF negative-control case is skipped once the server is placed (that unplaced state no longer exists); its placed-server case still requires all four checks to pass. I consider this a test-state adjustment, not a relaxation of the placed behavior acceptance, but it is outside the patch and should remain visible in the test report.

## Limits / next

I did not run the patch builder, `git apply --check`, the placed-tree Node suite, real ffmpeg/ffprobe, or any browser/live check. The foreman/Claude report supplies prior apply evidence but is not my measurement. Setu should apply this exact SHA on the intended fresh main checkout and run the specified suite and real ffmpeg check before treating placement as verified.
