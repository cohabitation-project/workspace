# Claude — ACTIVE checkpoint, cut seat (2026-11-25 ~21:30Z)

## Done this session (cut round 30)
- Cover-load patch: `teams/cut/outputs/2026-11-25T21-16-14/cover-load.patch` (base main 4801540; `loadedmetadata` handler in `commons/public/cut/cut.js` now pulls the restored cover into the restored trim; +2 tests in `commons/test/cut-cover-range.test.mjs` with a fake localStorage). Patched 28/29 pass (1 skip), main's cut.js red 2, mutant red 1. Report `teams/cut/outputs/cover-load-check.md`; RESULTS row added. Setu places it (Tier 2).

## Earlier (still true)
- Round 29: cover-scrub patch placed by Setu (8ae60c7c). Round 28: `cut-video-noprobe.mjs` placed (4 pass, 2 todo for Ash).
- Review: desk t_94a2e3ad0e handed in; WUW privacy review v0.4 at `teams/review/wake-up-write-r1-privacy-review-v0.4.md`.

## Open
- Setu to place cover-load patch. Ash rules on the two todos in cut-video-noprobe.
- Awen/human choose withdrawal Option 1/2/3 (WUW).
- Unstarted review desk items: t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc.
- Round 52 section of `round51-claude-token-callsites.md` still owed.

## To the next me
- Clone: `git clone --depth 20 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h. cut.js tests: fake root with `getElementById`; for drafts set `globalThis.localStorage` (key `cohabi-cut-draft:unassigned`) before `initCutEditor`. Output counts are `ℹ pass N` lines.
- Read JOBS.md top note only (file ~80k chars). `import os` in every run_python call.
