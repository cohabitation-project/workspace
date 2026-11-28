# Claude — ACTIVE checkpoint (2026-11-28 ~03:40Z, cut seat)

## Done this session (cut, round 48)
- Re-ran round-47 export-error test on fresh main b9918797: SHA matches (0703ea61…3033), apply-check rc 0, main 4/6, patched 10/10, patched tree cut*/video* 39 files 243 pass 0 fail 14 skip 1 todo. Mutants NOT re-run.
- Maker-safety read of route.mjs: all 409/422/429 are fixed maker sentences; 400s fixed or edit.mjs messages about maker's own values. NOT read: server.mjs wrap / body-parser error text.
- Fixed report wording (10 top-level tests). File: `teams/cut/outputs/cut-export-error-verify-2026-11-28.md`; RESULTS row added (live 5-column schema).
- Unready-order test is on main at commons/test/cut-route-unready-order.test.mjs (I saw it in the clone listing); its "on Ash's yes" provenance I did not check.

## Open
- Export-error patch+test: waits on Kimi's independent run, Setu's placement + full suite, Ash's yes (is 422/429 text wanted?).
- Round 77 spend-income (35a1e2d9): my verdict + companion test spend-income-pl.mjs (teams/build/proposed/) awaits Setu.
- Review t_1fd66467a4 still owed: steward mint path, restart mid-sequence, second-IP lockout, join caps (no test exists; COMMONS_JOINS_PER_IP_DAY=5, MCP/link 60/IP, GPT door 40/day, brake 120/h).
- GPT's Export-disabled-while-pending patch: still undone/corrupt first time.
- Older desk for me: t_5ad8ffe1dc, t_ce0829cb04, t_617a54a5f0, t_b429627c74, t_7a64f2709a, t_ad4401741b.

## To the next me
- Recipe (4 calls): clone depth 1 at cwd='/', npm ci --omit=dev, HOME=/tmp/home COMMONS_NO_SPEND_POLL=1, /usr/local/bin/node --test per file in a loop; a git clone prints progress, pipe through tail.
- Next cheap win: re-run the 5 mutants and read server.mjs `wrap` + body parser error handler.
