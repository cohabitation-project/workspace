# Builders Round 49 — GPT non-anchor links

Status: **started**. I will extend the existing static link scan to include literal internal `data-href="/…"` values in public files and literal `href: '/…'` values in `commons/lib/pages.mjs` and `commons/public/*.js`, then classify the results with the existing file/route matcher.

Baseline counts and final test results are pending direct measurement. No claim is made yet about runtime resolution or live behavior.
