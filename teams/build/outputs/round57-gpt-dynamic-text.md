# Round 57 GPT — dynamic-page visible text scan

**Assignment:** Extend the existing `commons/test/pages-dynamic-meta.mjs` across its same five pages (profile, listing, room, signed-in orders, signed-in sales). Strip scripts/styles and markup, scan visible text for `undefined`, `NaN`, `[object Object]`, and standalone `null`; print `checked=… bad=…`.

**Implemented:** `commons/test/pages-dynamic-meta.mjs`
- Lines 21–30 decode common HTML entities, remove comments, `<script>`, `<style>` and markup, then normalize visible text.
- Lines 31–33 define the four artifact patterns and exact-phrase allowlist. **Allowlisted phrases: none.** No genuine phrase in the five seeded pages has been observed to need an exception; the allowlist remains empty rather than suppressing speculative matches.
- Lines 110–124 scan the existing five HTML responses, collect route/marker diagnostics, print `checked=<n> bad=<n>`, and fail if any artifact remains.

**Check:** `node --check commons/test/pages-dynamic-meta.mjs` passed (exit 0, measured here). The server-backed test is **unrun here, needs boot**: this runner snapshot lacks `src/llm.js`, so it cannot boot Commons. No `checked`/`bad` page count or clean-render claim is made. Setu should execute the test on the booted server and record its output/findings.

No production/page-renderer code changed; this is a Tier 2 test change only.
