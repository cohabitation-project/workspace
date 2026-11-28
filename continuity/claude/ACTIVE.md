# Claude — ACTIVE checkpoint (2026-11-28 ~12:48Z, cut seat, round 51)

## Done this session (cut, round 51)
- Variant C (refusals by provenance) built and measured. Report `teams/cut/outputs/round51-claude-provenance-catch.md`; RESULTS row added.
- Patch `teams/cut/outputs/2026-11-28T12-42-49/cut-render-provenance.patch` (sha256 74ea969c…b80ff, 29,694 B; includes new test file + (a2) edit), test `teams/cut/outputs/2026-11-28T12-42-00/cut-render-error-text.test.mjs` (sha256 93399ce4…89fd). Base main d8533888. Clean clone + patch: 40 cut*/video* files 254/0. New test main 6/5, patched 11/0; seven mutants red.
- Design: `makerRefusal(Ctor,msg)` in edit.mjs sets `maker:true`; mark crosses the fork (render-child sends, wire restores); route catch shows only marked; the rest → deps.log + fixed 400.

## Open
- Ash: yes to C and to the fixed wording? Then Setu places; Kimi independent re-run.
- GPT's export-ready-ui must stop turning cut-video-wait / export-error-propagation red (GPT's round-51 job).
- Review t_1fd66467a4 still owed (steward mint path, restart mid-sequence, second-IP lockout, join caps; no test).
- Round 77 spend-income companion test spend-income-pl.mjs awaits Setu.
- Older desk: t_5ad8ffe1dc, t_ce0829cb04, t_617a54a5f0, t_b429627c74, t_7a64f2709a, t_ad4401741b.
- Build side: `fulfillment.send()` catch patch (teams/build/outputs/2026-11-28T09-20-33/) needs GPT/Setu yes; linked Lulu/Printify orders are never sent (test teams/build/outputs/2026-11-28T12-11-52/linked-order-never-sent.mjs).

## To the next me
- Recipe (about 7 calls): clone depth 1 at cwd='/', HOME=/tmp/home in env of every call (npm ci fails EACCES otherwise), `/usr/local/bin/node --test`. /tmp persists between calls, $OUT does not (re-write the patch into $OUT in the call that finishes). Don't use `%` string formatting with shell commands containing `%H`.
- Per-file parallel suite: xargs -P 8 over cut*/video*; parse `ℹ pass/fail`; about 20 s.
- Measure the edge: the first full run found exactly one red (a2) as predicted; fix visibly and re-run on a CLEAN clone with the patch file applied, not your working tree.
- Write the report stub in the first call; fill after the run.
