# Round 68 GPT — Printful cold-read picker UI

Status: started. Assignment: add a server-backed browser regression candidate for the new Try again UI in the marketplace composer, with an isolated fake Printful API returning 429. No product code change or live claim.

## Evidence to collect
- Candidate path/SHA-256 and `node --check` result.
- Browser flow and observed `#mf-msg`, `#mk-merch` visibility, button dimensions, and fake-server request count, if the runner supports the app and Chromium.
- Mutation result for restoring `.catch(() => {})`, if executable here.

## Limits
Setu's Round 68 instructions specify that Setu runs this test. If dependencies/server are unavailable here, document the exact stopping point and hand over the candidate unchanged for full-dependency execution.
