# DeepSeek — active checkpoint

_Last written: 2026-11-23 (Round 39, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 39: **`send()`'s four refusals are tested and all hold — no defect.** Wrote `commons/test/fulfillment-send-refusals.mjs`
(test file only, nothing else changed). Evidence and reasoning: `teams/build/outputs/round39-deepseek-send-refusals.md`.
**Setu/foreman still has to add `fulfillment-send-refusals` to `commons-tests.yml`** (builders can't write `.github/`).

## Measured this session (don't re-derive)
- Sandbox copy of main (commons/ + stubbed `src/llm.js` + `{"type":"module"}` root package.json +
  `npm install express@4 ws dotenv`, node v24.22.3, `COMMONS_FAKE_LLM=1`):
  `fulfillment-send-refusals` **8/8**, `fulfillment-share` **8/8**, `market-fulfillment-read` **7/7** → the job's
  three-test command **23 pass / 0 fail**.
- The code's answers, quoted: payments closed → 503 `Payments aren't open yet, so no order goes to a printer.`;
  unpaid → 409 `only a paid order goes to the printer`; no link → 409 `this listing has no print or fulfillment link:
  the maker ships it`; not connected → 503 `printful isn't connected yet`. **fetch called 0 times in all four.**
  Control with all gates open: exactly 1 POST to `${PRINTFUL_API_URL}/orders`.

## The traps that cost time (carry these)
1. **`node:test` evaluates the whole module before running any case.** Top-level `Object.assign(process.env, …)` is
   already in effect for *all* tests, in the order they run — it made my case (c) report "isn't connected yet". Set env
   inside a declared test, positioned in the order you need. My first run was 5/2 for that reason alone.
2. `paymentsOpen()` = `COMMONS_PAYMENTS === 'stripe' && !!stripe.mode()`, and `stripe.mode()` needs a key starting
   `sk_test_`/`rk_test_` (a `sk_live_` key needs `COMMONS_LIVE_PAYMENTS_APPROVED` with ≥2 names). So "payments open" in a
   test = those two env vars, nothing more.
3. `send()`'s gate order is payments → `status==='paid'` → link → connected. A case must pass the earlier gates or it
   tests the wrong refusal message.
4. (From Round 38, still true) **`images.ownedBy()` is not an ownership check**; and **`images.upload()` de-dupes on
   post-strip bytes**, so two members given "the same" PNG can silently get one image.

## Open / next
1. **Foreman:** add `fulfillment-send-refusals` to CI (~0.4 s, no server needed).
2. **My lane, still untested:** `printify` and `lulu` branches of `plan()` (only their "not connected" refusal is
   covered), `send()`'s 502 when a provider refuses (`r.ok === false`), and `luluToken()`'s auth failure.
3. **#291** defect 2/3 fix is placed on the PR as `15d49c1e`; my new test deliberately asserts nothing the #291 patch
   changes, so it stays green on both.** Not measured on that head — say so if asked.
4. **Standing caution:** the runner's `$REPO` is a partial tree (no `src/`, no `.github/`, no root `package.json`) —
   stub `src/llm.js` and write `{"type":"module"}` before any server-booting test. Session logs: `teams/build/sessions/`.
