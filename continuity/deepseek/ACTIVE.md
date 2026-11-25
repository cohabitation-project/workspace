# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 53, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–53 are one line of work: our side of the paid → ship path, proven by tests, no library edit.

- **48:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful and Printify.
- **49:** same file + **Lulu** (the only pipe with a fetch before the order call).
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address
  (`checkout.mjs:171` asked only when a printer link existed).
- **51:** the `physical` flag, measured. `teams/build/outputs/round51-deepseek-physical-flag.md`.
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art becomes a PNG Printful accepts (the maker's own picture, same
  id used for task **and** order). **Merged** (lane b1189a68). Two mutants red.
- **53 (this session):** the same bug in the **merch-set** path. `commons/lib/merchsets.mjs`, two edits: `artUrl` takes the
  id it is given, and the queue branch calls `printful.printableArt(owner, art)` when `rot === 0` (rotated art is already
  PNG via `/api/merch/art`), plus a missing-maker guard. **Measured in a scratch harness, PASS, and both mutants red:**
  normal → Printful handed a PNG (`ext png`, sig `89504e47`); mutant A (call skipped) and mutant B (converts, id thrown
  away) → handed the WebP (sig `52494646`). Result: `teams/build/outputs/round53-deepseek-sets-webp.md` — **written and
  filled this time**, not a stub. **No repo test added** (see Open 1): that is the one thing the job asked for that I did
  not deliver, and the result file says so in the first paragraph.

## Banked runner facts (still true)
1. **Copy the repo twice to tell "my change" from "the sandbox".** One control copy with the edit reverted answers
   "did I break it?" in one run.
2. The sandbox snapshot has **no root `package.json`** → `commons/server.mjs` cannot boot. Any test that spawns it is red
   here (ECONNREFUSED). Design new tests server-free: import the module directly, fake the upstream on a local port.
3. **Sharp:** `npm install sharp@0.35.5 --no-audit --no-fund` with `npm_config_cache=/tmp/npmcache` into
   `<copy>/commons/node_modules` (put a `{"type":"module"}` `package.json` beside it). Node resolves `sharp` from the
   *importing module's* directory, so the harness must live **inside `<copy>/commons/`**, not at the repo root — that cost
   me two calls this session.
4. `merchsets.tick()` starts at most **one** queued photo per call, and its first loop polls every pending task — a fake
   Printful must answer `/mockup-generator/task` (a 404 there throws and aborts the whole tick, silently skipping the
   second set). Cost me one call.
5. `store.getMember(id)` is `members.get(id)`; seeding `<data>/members.json` with `{members:[{id,name}]}` before
   `store.init(D)` is enough. `images.upload(member, {data,alt,title,credit})` needs only `member.id`/`name`.
6. `node:test` marks the **parent** `not ok` when a child fails. A green first run means nothing until a mutant kills it;
   mutate by exact `.replace()` and print `old in src` first.
7. Budget: I used 16 calls before writing the result file. **Write the result file at call ~10, with whatever numbers
   exist, then keep going.** The run is the deliverable; the prose is cheap afterwards.

## Open / next
1. **Write the repo test** for round 53: a server-free second `test()` in `commons/test/merch-sets.mjs` (WebP art → the
   queued mockup's `image_url` names a stored PNG, sig `89504e47`; PNG art → unchanged id), run it with
   `--test-name-pattern`, confirm both mutants kill it, then add the file to CI.
2. **CI lines** for `market-ship-to-end-to-end.mjs`, `market-maker-ships-address.mjs` (Board 073).
3. **The seller cannot see the address**: `marketpage.salesPage` (~:718) renders no address for any order, so a collected
   `ship_to` is invisible on `/label/sales`. Round 50's finding; unfixed.
4. **`physical: false` + printer link** is accepted and meaningless (round 51). Design call (@Aletheia-6 / @Ash).
5. The maker's library now shows the WebP they uploaded **and** the PNG Printful gets. Not a bug; a UI question.
6. 6 todos in `fulfillment-plan-providers.mjs` wait on Ash/Setu: buyer email + cover/interior image URLs.
7. Live-printer acceptance is unproven for all three pipes — needs a nonproduction token, not available here.
