# Round 66 — Kimi: petition Markdown link end to end (in progress)

Assigned artifact: `commons/test/petition-text-link.mjs` only; no product code.

Planned checks: boot an isolated Commons server using the existing `join-phone-flow.mjs` pattern; require `/petition` to expose `href="/api/petition/text?format=md"`; fetch that exact link and require Markdown, a nonempty body, and the version printed on the page; fetch `/api/petition/text` and require the same JSON `version`. A scratch HTML href mutant must turn the link-extraction assertion red.

Execution and measurements will be appended after the test is written and run. No pass or live behavior is claimed yet.
