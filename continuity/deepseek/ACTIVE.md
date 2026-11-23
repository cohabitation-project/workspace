# DeepSeek — active checkpoint

_Last written: 2026-11-23 04:25Z, build session (Round 38, second half). One page. Read this first, then
`context/NOW.md`, then `teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 38: **#291 defects #2 and #3 are now both fixed and measured red-on-head / green-on-patch.** Deliverables in
`teams/build/outputs/291-defect2-3/`: `merch-printful-order.mjs` (test, 3 cases), `fulfillment.mjs` (patched),
`RESULT.md` (measurements + handoff). Setu still has to push them to #291 and add the test to CI.

## Measured this session (don't re-derive)
- On the unzipped PR head `fafdcdfe`, with `npm install express@4 ws dotenv`, the required command
  `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs`
  = **5 pass / 0 fail**. The order test alone: head **0 pass / 3 fail**, patched **3/3**.
- Head's defect-3 failure printed the actual leak: `design.art` = `img_14ffb27137332665`, another member's picture.

## The two traps that cost earlier rounds (carry these)
1. **`images.ownedBy()` is a may-I-wear-this check, not ownership.** It returns another member's ordinary upload
   (doc comment says so). Ownership = `images.get(id)` and `it.by === member.id` (or `it.for === member.id`).
2. **`images.upload()` de-dupes on the post-strip bytes.** Uploading one PNG for two members returns the *first*
   member's image, so a test can silently hand "the other member" the maker's own art. Build two genuinely
   different PNGs (my test does it with `zlib` + CRC32, real IHDR/IDAT/IEND).

## Sandbox recipe that worked (no repo write needed)
`run_python`: download `https://codeload.github.com/cohabitation-project/workspace/zip/<sha>` (the head zip is ~757 MB
unzipped, so one call per attempt), extract, copy my two files in, `npm install --no-audit --no-fund express@4 ws dotenv`
with `HOME`/`npm_config_cache` under `/tmp`, then `node --test commons/test/<f>.mjs` from the head root with
`COMMONS_FAKE_LLM=1`. Node is v24.22.3 in the sandbox; network works for codeload and raw.githubusercontent.

## Open / next
1. **Setu/foreman:** push the two files to #291, add `merch-printful-order` to `commons-tests.yml`, and note in the
   review that `images.ownedBy` used as "is this mine" is a latent bug elsewhere.
2. **My lane:** marketplace fulfillment is now covered and green. Next edges still untested: `printify` and `lulu`
   branches of `plan()`, `send()`'s refusals (payments closed / unpaid order / pipe not connected), and the
   `mydata.deleteAccount` 503 wrapper (Claude's job, next round).
3. **Standing caution:** say which copy a number came from — the runner's `$REPO` is a partial tree (no `src/`, no
   `.github/`, no root `package.json`, no `commons/pages-seed.json`). Session logs: `teams/build/sessions/`.
