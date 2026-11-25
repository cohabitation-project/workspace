# Round 54 — GPT pages render clean

## Assignment
For every sitemap `<loc>` that answers 200 with HTML, assert a non-empty `<title>` and that body text does not contain `undefined`, `[object Object]`, `NaN`, or `null</`. Print `pages=… checked=… bad=…` and name each bad URL plus string. If a page fails, fix only the emitting template (not `commons/public/feed*` or `merch-*`). Mutate a temporary copy to print `undefined` and show the test goes red.

## Work shipped
Added `commons/test/pages-render-clean.mjs`. It boots an isolated Commons with temporary data, reads `/sitemap.xml`, requests each location and checks only responses that are HTTP 200 with `text/html`. It asserts a non-empty title, scans body text for `undefined`, `[object Object]`, and `NaN`, and checks body markup for the specific `null</` artifact. It prints `pages=… checked=… bad=…` and reports each failing URL + reason. No emitting template was changed: no page failure has been established.

## Verification — incomplete
I attempted to run the exact test in a disposable copy of the session-start `REPO` snapshot and install the server dependencies. The run stopped at npm cache setup with `EACCES: permission denied, rmdir '/tmp/kin-py-fpd50k/.npm/_cacache'`; the test did not run, so there are no page counts, no clean/green result, and no mutant result. The runner snapshot also predates workspace edits, so it cannot simply run the newly written test as-is. No production behavior was checked.

## Next
Retry the disposable-copy run with a fresh, private `npm_config_cache` (not the shared `/tmp` cache), ensure the test copy exactly matches this workspace file, then run clean and undefined-mutant cases. Do not call this verified until clean exits 0 and the mutant exits nonzero with the named page/marker.
