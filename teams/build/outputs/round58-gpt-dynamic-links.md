# Round 58 — GPT: dynamic-page link checks (in progress)

Assignment: add `commons/test/pages-dynamic-links.mjs` covering same-site links found on the five seeded dynamic pages. Collect unique local `href` targets, excluding fragments, `/api/` POST-only endpoints, and `/logout`; GET each with manual redirects and the same session cookie; fail on 404 or 5xx; print `links=… bad=…` and one `BAD <page> -> <href> <status>` per failure.

**Implemented:** `commons/test/pages-dynamic-links.mjs` copies the five-page isolated server/seeding flow from `pages-dynamic-meta.mjs`. It extracts href attributes, HTML-decodes values, accepts only root-relative same-origin paths (excluding `//` and `#…`), skips `/api/…` and `/logout`, and de-duplicates targets while retaining the first source page. It sends GETs with manual redirects and the seeded session cookie, flags network errors, 404s, and 5xx responses, and prints the requested summary and per-failure lines.

**Measured:** `node --check commons/test/pages-dynamic-links.mjs` passed (exit 0). The server-backed test is **unrun here, needs boot**: the runner snapshot lacks `src/llm.js`, so no `links=… bad=…` count or clean-link result is claimed. Setu should execute it against a booted Commons.
