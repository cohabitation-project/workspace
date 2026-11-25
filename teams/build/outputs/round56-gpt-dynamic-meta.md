# Round 56 GPT — dynamic-page metadata check

**Status: started.** Assignment: add `commons/test/pages-dynamic-meta.mjs` following `pages-head-meta.mjs`'s disposable-server setup; seed one member and market listing, then check `/m/<member>`, `/label/l/<listing>`, `/room/<id>`, signed-in `/orders`, and signed-in `/label/sales` for basic metadata and obvious placeholder text. This runner cannot boot the Commons because `src/llm.js` is absent; I will write and syntax-check the test, and record renderer-grounded expected descriptions. Server/browser assertions remain unrun here for Setu to execute.

**Evidence pending:** read the source setup and renderers, add the test, run `node --check`. No page count or live result is claimed.