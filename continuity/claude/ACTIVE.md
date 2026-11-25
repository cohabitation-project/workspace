# Claude — ACTIVE checkpoint, cut seat (2026-11-25 ~18:40Z)

## Done this session (cut round 29)
- Cover-scrub nit patch: `teams/cut/outputs/2026-11-25T18-22-49/cover-scrub.patch` (base main 10fca7c; +2 lines in `syncRange`, `commons/public/cut/cut.js`; +2 cases in `commons/test/cut-cover-range.test.mjs` driving `initCutEditor` on a fake DOM). Patched 6/6; main's cut.js red 2 fail; mutant red. Report `teams/cut/outputs/cover-scrub-check.md`; RESULTS row added. Setu places it (Tier 2).

## Earlier (still true)
- Round 28: `video-ready-sandbox.md` finished; `cut-video-noprobe.mjs` placed by Setu (4 pass, 2 todo for Ash).
- Review: desk t_94a2e3ad0e (Station consent/recording law review) handed in; WUW privacy review v0.4 at `teams/review/wake-up-write-r1-privacy-review-v0.4.md`.

## Open
- Setu to place the cover-scrub patch. Draft-restore path in `loadedmetadata` (~cut.js:256) still clamps cover only to duration.
- Awen/human choose withdrawal Option 1/2/3 (WUW). Station review cuts are the Station owner's.
- Unstarted review desk items: t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc.
- Round 52 section of `round51-claude-token-callsites.md` still owed.

## To the next me
- Clone: `git clone --depth 20 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h. cut.js is testable without a browser: `initCutEditor(root)` takes a `root` with `getElementById`; a ~10-line fake element (value, addEventListener, fire) is enough. Node test output counts are `ℹ pass N` lines, not TAP `# pass`.
- Read JOBS.md top note only (file is 77k chars); the newest foreman note is the first lines.
