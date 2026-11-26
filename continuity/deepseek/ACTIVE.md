# DeepSeek — active checkpoint

_Last written: 2026-11-26 (round 64). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work since round 48: our side of the paid → ship path, proven by checks that can go red.

- **48–49** `market-ship-to-end-to-end.mjs`; **50** maker-ships address; **51** `physical` flag measured;
  **52** `printableArt()` (merged); **53–55** `salesPage` "Sent to Printful" pinned; **56** every printer named;
  **57** printer **state** on `/label/sales` (merged fb22f51f, Setu's yes on cbff562d); **58** resend guard in
  `merch-checkout.mjs`; **59** buyer page never repeats the printer's error (5 mutants measured);
  **62** the "Send it again" button rendered for a `failed` order (button only).
- **64 (THIS, done):** the button works. `commons/public/market.js` now has the delegated `[data-printer-send]`
  click handler — POST `/api/orders/:id/printer`, `X-Commons: 1`, same-origin, `textContent` only. Result
  `teams/build/outputs/round64-deepseek-resend-handler.md`.
  Measured with a fake DOM + fake `fetch` (node 24.22.3, no browser): draft → `Sent to Printful as a draft.`
  and stays disabled; failed → `Printful refused it again: <error>` re-enabled; 403 → the server's sentence;
  offline → `Could not reach the server. Try again.`; a click elsewhere fetches nothing. Red: the same
  harness on the pre-edit file exits 1 (`NO HANDLER REGISTERED`). Evidence `outputs/2026-11-26T09-59-39/`.
  **No test added — by the job; GPT writes it next round.**

## The exact strings GPT's test should assert
`Sent to ${Name} as a draft.` · `${Name} refused it again: ${error}` · the server's `error` verbatim on non-2xx ·
`Could not reach the server. Try again.` · `Sending…` while in flight · `Nothing was sent. Try again in a minute.`
when `printer` is null. Provider names: printful/printify/lulu → Printful/Printify/Lulu.

## Runner facts (verified, not guessed)
1. `$REPO` is writable for existing files (in-place mutate + restore works; only *new directories* hit EACCES).
2. **`$OUT` is a NEW path on every `run_python` call** — write the harness/fake module in the same call that runs
   it. I broke this again this round (one wasted call on `h2.js`).
3. A bare `✖ … 'test failed'` with 0 pass is the import hook failing. `node --check` first.
4. `new Function('document','window','fetch', code)` evaluates this classic script with stubs — cheap way to test a
   page script's handler without a browser. Capture the listener via a stub `document.addEventListener`.
5. Server-free only: the sandbox cannot boot the Commons server (`src/llm.js` absent).
6. Node v24's reporter is not TAP — count `✔`/`✖` / `ℹ pass|fail N`.

## Open / next
1. **@GPT:** write `commons/test/market-resend-click.mjs` from the strings above (fake DOM + fake fetch, one
   mutant: drop the `failed` branch).
2. **@Setu:** a browser pass on `/label/sales` with a `failed` fulfillment record — the real click and route.
3. **PR #301** (`setu/ship-to-fix`, resend of a `failed` order + newer-Stripe address path) still needs Claude's
   measured yes at its exact head.
4. `market-orders-no-printer-error.mjs` (round 59) still unrun on main by Setu; needs nothing unmerged.
5. Unfinished older thread: `round51-deepseek-physical-flag.md` — the `physical` flag measured but not enforced.
