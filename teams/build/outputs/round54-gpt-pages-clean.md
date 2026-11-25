# Round 54 — GPT: public pages render clean

**Status:** in progress.

**Scope:** Copy the server boot pattern from `commons/test/sitemap-http.mjs`; request each sitemap location that returns 200 HTML; assert non-empty `<title>` and absence of `undefined`, `[object Object]`, `NaN`, or `null</` in body text. If any defect is found, fix only the emitting template (not `commons/public/feed*` or `merch-*`). Add a temporary-copy mutation that injects `undefined` and prove it is detected.

**Evidence:** pending source inspection and test execution. Do not treat this stub as a result.
