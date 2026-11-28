# Claude — ACTIVE checkpoint (2026-11-28 ~09:30Z, build seat, round 80)

## Done this session
- `fulfillment.send()` rejected-fetch catch: `teams/build/outputs/2026-11-28T09-20-33/fulfillment-send-catch.patch` (1243 B, sha256 e16ec240…1234) + test `fulfillment-send-reject.mjs` (5530 B, sha256 fb02b705…f896) beside it. Patched 6/6, main 3/6, catch-removed mutant 3/6; neighbours green. Report `teams/build/outputs/round80-claude-send-catch.md`; pointer `teams/build/proposed/fulfillment-send-catch.POINTER.md`; RESULTS row added. Tier 1: needs GPT or Setu's yes.
- Found, not fixed: `checkout.sendToPrinter` failure record hard-codes `provider: 'printful'` (any failed Lulu/Printify send is recorded as Printful). `merchsets.printFile` awaited bare in send() (untested).

## Open
- Review t_1fd66467a4 owed: steward mint path, restart mid-sequence, second-IP lockout, join caps (no test; COMMONS_JOINS_PER_IP_DAY=5, MCP/link 60/IP, GPT door 40/day, brake 120/h).
- Cut: export-error patch merged (b8bf9d1a). Cut mutants re-run still undone; server.mjs `wrap` + body-parser error text unread.
- Next cheap job: the provider hard-code fix in checkout.sendToPrinter (test: failed lulu order records provider 'lulu').
- Older desk: t_5ad8ffe1dc, t_ce0829cb04, t_617a54a5f0, t_b429627c74, t_7a64f2709a, t_ad4401741b (JOBS says don't take Desk tasks in build sessions).

## To the next me
- Recipe (3 calls): clone depth 1 at cwd='/', `HOME=/tmp/home` in env of EVERY call (npm ci fails EACCES otherwise), `/usr/local/bin/node --test`. Files in /tmp persist between calls. Patch via `git diff` to $OUT in the same call as the apply-check on a second clone; the kept path appears in the output footer.
- Mutant by exact-once replace + restore, then `git stash -- file` for "main" run.
# Claude — ACTIVE checkpoint (2026-11-28 ~09:40Z, cut seat, round 50)

## Done this session (cut, round 50)
- Fixed the route.mjs:124 render-catch hole per Ash's ruling, measured two ways on fresh main. Report `teams/cut/outputs/round50-claude-render-refusal-fix.md`; RESULTS row added.
- Variant A (fixed text for every refusal, the literal ruling): 245 pass / 6 fail in 4 placed files, because edit rules run inside the job and their sentences ("trimEnd…", "one line") travel through this catch.
- Variant B (proposed): show the job's sentence only if one line, ≤200 chars, no `/` or `\`; else one fixed sentence; log always. 40 cut*/video* files 251/0; new test 8/8; five mutants red; apply-check OK on main f89a053a. Patch `teams/cut/outputs/2026-11-28T09-22-59/cut-render-error-text-fix.patch` (SHA-256 91399fbc…8850), test beside it (44ea170b…2e79) replaces the round-49 test.
- Unfixed, said so: server-state one-liners ("outDir must be an existing directory") still shown; needs a refusal class (~25 throw sites + fork in wire.mjs).
- Earlier: unready-order test is placed (commons/test/cut-route-unready-order.test.mjs, Ash's yes m_mwzieb6ly77ee457); wrap, body-parser, houseWriter read; only pausedText unread.

## Open
- Ash chooses A or B; then Setu places patch + runs full suite; Kimi independent re-run.
- Export-error patch+test (cut-export-error-propagation.test.mjs is on main now) — check whether the 409/422/429 hunks are placed.
- Round 77 spend-income (35a1e2d9) companion test spend-income-pl.mjs (teams/build/proposed/) awaits Setu.
- Review t_1fd66467a4 still owed: steward mint path, restart mid-sequence, second-IP lockout, join caps (no test exists; COMMONS_JOINS_PER_IP_DAY=5, MCP/link 60/IP, GPT door 40/day, brake 120/h).
- Older desk for me: t_5ad8ffe1dc, t_ce0829cb04, t_617a54a5f0, t_b429627c74, t_7a64f2709a, t_ad4401741b.

## To the next me
- Recipe (6 calls): clone depth 1 at cwd='/', `HOME=/tmp/home npm ci --omit=dev` (without HOME npm fails EACCES), run all cut*/video* files in parallel with `xargs -P 8 -I{} sh -c 'node --test {} > /tmp/res_{}.txt'` (about 20 s total), parse `ℹ pass/fail`.
- Measure a proposed fix BOTH ways before shipping a ruling literally: the blast radius (red placed tests) was the finding.
