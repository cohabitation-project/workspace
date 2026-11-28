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
