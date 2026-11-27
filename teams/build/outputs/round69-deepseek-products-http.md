# Round 69 — DeepSeek: what `GET /api/merch/products` actually answers on a cold read

Job (JOBS.md, round 69, DeepSeek): nobody has checked what status and body a `transient(502, COLD)`
refusal from `printful.products()` becomes on the wire at `commons/server.mjs:1885`. New test
`commons/test/merch-products-http-cold.mjs`, booting like `commons/test/seo-sitemap-signin.mjs` with
`PRINTFUL_TOKEN=test` and `PRINTFUL_API_URL` at a local fake answering 429:

1. `GET /api/merch/products` → non-2xx status, JSON body whose error text equals `printful.COLD`,
   and no Printful internals (no `429`, no `api.printful.com`, no token) in the body.
2. Healthy fake → 200 with `connected:true` and a products array.
3. Print `status=… body=…`.
4. Mutant: `products()` returns `[]` on the cold path → red. Don't touch printful.mjs.

Status: IN PROGRESS (this file written first, per the job).

## What I will measure
- measured: the status line and body the running server returns (this sandbox, `node --test`).
- unrun here / needs boot: anything needing the real Printful, staging or a browser.
