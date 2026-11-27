# Round 76 — DeepSeek: /cut-new in three link tests

**Deliverable:** `teams/build/proposed/cut-new-links.patch` — 6 323 chars, 6 323 bytes, sha256
`76afd4e23c7b3bf367d94fce819af7305f83f3b387fbba8e7fedf3529ba8259f`. Three files, Tier 2, test-only.
**Status:** applies clean to a fresh copy of main and compiles; **not run** — the tests boot `commons/server.mjs`,
which needs packages this runner does not have (measured reason below). No green claim.

## What it does, file by file

Every hunk adds the same block, copied in shape from `commons/test/jobs-pages.mjs:22-24`, and one skip:

| file | added | skip point |
|---|---|---|
| `commons/test/pages-door-links.mjs` | `SERVED_ELSEWHERE` + `servedElsewhere()`; `const skipped = new Set()` | in the per-page reference loop, after the self-reference/`checked` guard |
| `commons/test/pages-new-links.mjs` | same | same place |
| `commons/test/pages-dynamic-links.mjs` | same | in the target loop, before the `fetch` |

All three also print `served-elsewhere=<paths or none>` on their existing summary line, so a skip can never be
invisible in CI output.

```js
const SERVED_ELSEWHERE = new Set(process.env.LINKS_MUTANT_NOSKIP === '1' ? [] : ['/cut-new']);
const servedElsewhere = (target) => SERVED_ELSEWHERE.has(new URL(target, 'http://commons.test').pathname);
```

**Exact path only, by construction.** The comparison is `URL.pathname === '/cut-new'`, so `/cut-new/anything` is still
followed and still fails if it 404s. A prefix test (`startsWith`) would have hidden the whole subtree; this does not.

## Evidence — measured this session

1. **The shipped file applies.** In one call, on a `copytree` of main: `git apply --check -p1` **rc 0**, `git apply -p1`
   **rc 0**, and `sha256` of the file **read back from the repo** = `76afd4e2…`, 6 323 bytes — i.e. the checks ran
   against the bytes I shipped, not against a draft in memory (round 73's lesson).
2. **It compiles.** `node --check` **rc 0** on all three patched files (node v24.22.3).
3. **The skip is wired, not just declared.** `grep -c servedElsewhere` on the patched `pages-door-links.mjs` → **2**
   (guard + skip site); the same count holds in the other two files.
4. **Skip semantics, measured by executing the shipped lines.** A Node script extracted the two shipped lines from each
   patched file and evaluated them, normal and with `LINKS_MUTANT_NOSKIP=1`:

   | target | normal | mutant | wanted |
   |---|---|---|---|
   | `/cut-new` | skip | fetch | skip |
   | `/cut-new?x=1` | skip | fetch | skip |
   | `/cut-new/anything` | fetch | fetch | fetch |
   | `/cut-newx` | fetch | fetch | fetch |
   | `/cut` | fetch | fetch | fetch |
   | `/label` | fetch | fetch | fetch |

   **ALL-OK ×3 files**; set normal `["/cut-new"]`, set mutant `[]`. The mutant therefore restores the exact condition
   Setu reports as red on main (the `/cut-new` 404 reaching `bad[]`), which is the control the job asked for.

## Why (1) I changed the comment, and (2) the tests are unrun here

**The comment.** The rule in `jobs-pages.mjs:22-24` cites `ops/caddy/Caddyfile.template:37`. **That path does not exist
in this repo copy** (`os.path.isdir('ops')` → `False`), so copying the citation verbatim would have shipped a pointer
nobody can follow — the same class of falsehood as the `server.mjs:1895` line. The shipped comment instead cites what I
could verify: `commons/lib/appmenu.mjs:44` (`isCommonsMember(me) ? a('/cut-new', '🎬 Cohabi Cut') : ''`), which is what
puts the link on these pages in the first place. Two consequences worth naming: the link is **member-only**, so the
skip is exercised on the *signed-in* pass of each test, and `jobs-pages.mjs`'s own citation is probably stale too
(not mine to change this round).

**The run.** All three tests `spawn` `commons/server.mjs`, which imports `express`, `ws`, `dotenv`
(`^import[^'"]*['"]([^'"./][^'"]*)` over `commons/server.mjs`). This runner's copy has **no `node_modules` and, in fact,
no `package.json` anywhere outside `teams/`** (recursive glob → `[]`), so `npm install` fails immediately:

```
npm error code ENOENT
npm error path /tmp/v4/package.json
npm error enoent Could not read package.json
```

That is a **correction to the record**: rounds 73–75 wrote this off as `EACCES` on npm's cache dir. With
`npm_config_cache=/tmp/npmcache` the cache error is gone and the real cause shows — **there is no manifest at the repo
root to install from**, so `npm ci` can never run there. Whether the live server has its manifests untracked is
Geoffrey's/Setu's call; I am not asserting it from here.

## Limits, stated plainly

1. **No run, so no green.** I did not see these three tests pass. What is proven: the patch applies to main, compiles,
   wires the guard, and the guard skips exactly one path.
2. **Baseline not reproduced by me.** "Red on main for `/cut-new`" is Setu's finding; I could not re-measure it without
   a bootable server. The mutant is the same condition, and it is proven to restore the fetch, not proven to redden the
   suite.
3. **`/cut-new/<sub>` is still followed.** If Caddy really serves `/cut-new*` as a prefix, a future link to a
   sub-route would fail these tests falsely. The job said exact path only; this is the trade, and the fix if it bites
   is a second documented entry, not a `startsWith`.
4. **`jobs-pages.mjs` was not touched** — it is green and its citation is not my job this round.
5. Pages other than the eight in these tests (e.g. `/r/general`, `/label`) still see `/cut-new` and are covered by
   other suites; I made no claim about them.

## Next open step

Setu: `git apply teams/build/proposed/cut-new-links.patch` on main, run
`node --test commons/test/pages-{door,new,dynamic}-links.mjs` (expect green, with `served-elsewhere=/cut-new` on each
summary line), then `LINKS_MUTANT_NOSKIP=1 node --test …` (expect red on `/cut-new`, three times). If any of the three
stays green under the mutant, that test never saw the link and the skip is dead weight in it — report that rather than
keeping the line.
