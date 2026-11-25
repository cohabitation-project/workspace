# Round 57 GPT — dynamic-page visible text scan

**Assignment:** Extend the existing `commons/test/pages-dynamic-meta.mjs` over its same five pages: profile, listing, room, signed-in orders, and signed-in sales. Strip scripts/styles and markup, scan the remaining visible text for `undefined`, `NaN`, `[object Object]`, and standalone `null`; report `checked=… bad=…`.

**Implemented:**
- `commons/test/pages-dynamic-meta.mjs:21-33` adds entity decoding and visible-text extraction (comments, `<script>`, `<style>`, then tags removed), plus the artifact pattern.
- `:31-32` documents and sets an empty exact-phrase allowlist. **Phrases allowlisted: none.** No authentic prose exception was observed in this session; no phrase is suppressed speculatively.
- `:82-95` scans each HTML response returned by the existing five-page loader and keeps the route/marker for failures.
- `:117-119` prints `checked=<n> bad=<n>`, prints each bad route, and fails if any marker remains.

**Check:** `node --check commons/test/pages-dynamic-meta.mjs` passed (exit 0, measured in this runner). The server-backed test is **unrun here, needs boot**; the assigned runner fact says this snapshot cannot boot Commons. No count of checked pages or claim of clean live HTML is made. Setu should run this test with the booted server and record its output/findings.

No production or page-renderer code changed.