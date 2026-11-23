# Round 39 — DeepSeek, marketplace: `send()` refuses before it calls anyone

Job (Setu, `teams/build/JOBS.md` Round 39): write `commons/test/fulfillment-send-refusals.mjs`. **Test file only — no
code changed.** Verdict: **the four refusals all hold. No defect found.** In every one of them the fake fetch is called
**0 times**, and a fifth control case proves the harness is live by sending once when all gates are open.

## What was measured

`node --test` on a copy of main (`commons/` + stubbed `src/llm.js`, root `package.json` `{"type":"module"}`,
`npm install express@4 ws dotenv`), node v24.22.3, `COMMONS_FAKE_LLM=1`, no real keys, no network to any provider:

| test | result |
|---|---|
| `commons/test/fulfillment-send-refusals.mjs` (new) | **8 pass / 0 fail** |
| `commons/test/fulfillment-share.mjs` (existing) | **8 pass / 0 fail** |
| `commons/test/market-fulfillment-read.mjs` (existing, boots a real server) | **7 pass / 0 fail** |

The job's three-test command: **23 pass / 0 fail.**

## What the code actually answers in each case (quoted from the run)

`send()` checks in this order — payments open → order paid → there is a link → the pipe is connected — and only then
builds headers and calls `fetchImpl`. The test asks the four questions in that order, so each case reaches the gate it
names rather than an earlier one:

| case | what `send()` answers | status | fetch calls |
|---|---|---|---|
| **(c)** payments closed | `Payments aren't open yet, so no order goes to a printer.` | 503 | **0** |
| **(b)** unpaid order (`pending`, `unpaid`, `refunded`, `undefined`) | `only a paid order goes to the printer` | 409 | **0** |
| **(a)** listing with no link | `this listing has no print or fulfillment link: the maker ships it` | 409 | **0** |
| **(d)** linked pipe, no key | `printful isn't connected yet` | 503 | **0** |
| **(d)** pipe with only half its keys (`PRINTFUL_TOKEN`, no `PRINTFUL_STORE_ID`) | `printful isn't connected yet` | 503 | **0** |

Two more checks the cases make, so the numbers mean what they look like:

- **Control (all gates open, test-mode fake key):** exactly **1** call, to `${PRINTFUL_API_URL}/orders`, `POST`,
  `body.external_id = ord_1`, `items[0].quantity = 1`, answer `{result:{id:'prov_order_1'}}` surfaced as
  `provider_order`. Then the keys are removed again and the *same* order is refused with **0** calls — so the zero
  counts above are refusals, not a dead harness.
- The fixture asserts its own starting state before it is used: `checkout.paymentsOpen()===false`, `printful`,
  `printify` and `lulu` all `connected:false`, and the listing genuinely linked (`ful.link` returned
  `connected:false`). Every provider key and `COMMONS_PAYMENTS` is deleted at the top of the file.

## Two things a reader should know

1. **My first run was 5/2, and the bug was mine, not the site's.** `node:test` evaluates the whole module *before*
   running any case, so my top-level `Object.assign(process.env, {COMMONS_PAYMENTS:'stripe'})` was already in effect
   when case (c) ran: it got `printful isn't connected yet` instead of `Payments aren't open yet`. Opening payments is
   now itself a test, declared between (c) and (b). Anything else that sets env at module top level in this suite has
   the same trap.
2. **The control deliberately does not assert the variant key.** On main, `plan()`'s Printful item still sends
   `sync_variant_id`; the `variant_id` + `files[]` fix is only on PR #291 head `15d49c1e`. The control asserts URL,
   method, `external_id` and quantity — keys the #291 patch leaves alone — so this file stays green both on main and on
   the #291 head and does not quietly duplicate or fight the defect-2 test. **Not measured on the #291 head**; expected
   to hold, for that reason.

## Limits, stated plainly

- Only the **Printful** branch was exercised end to end. `printify` and `lulu` are covered only by the
  "not connected" refusal (their key check is the same code path); their *send* shapes remain untested.
- `luluToken()`'s own failure path (`Lulu sign-in failed`) is not exercised.
- No server was needed for the new test; the third test in the command boots one, which is why `express/ws/dotenv`
  were installed in the sandbox.
- Nothing was placed, merged or deployed. Not checked on staging or production.

## For the foreman

- Add `fulfillment-send-refusals` to `commons-tests.yml` next to `fulfillment-share` (builders cannot write
  `.github/`). It needs no server and runs in ~0.4 s.
- Next untested edges in this file, if a later round wants them: `printify`/`lulu` `plan()` shapes, `send()`'s 502
  when a provider refuses (`r.ok === false`), and `luluToken`'s auth failure.
