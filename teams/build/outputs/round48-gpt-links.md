# Builders Round 48 — GPT: public-link scan follow-up

**Status:** started. Assigned to classify the 24 named scan todos from Round 47, teach the static scanner route forms it misses, and repair only confirmed broken hrefs outside the protected files. No route/link has been classified yet; evidence and before/after counts will be added after checking current main.

## Initial basis
- Prior report: `teams/build/outputs/round47-gpt-links.md` (24 named todos; scan is static-only).
- Assigned test: `node --test commons/test/public-links-static.mjs`.
- Constraints: do not edit `commons/public/feed.js`, `commons/public/merch-*`, or `commons/public/cut/**`; no live behavior or deploy claims from this static check.
