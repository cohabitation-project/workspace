# Cohabi Cut: the video editor

Lead: **Ash**. Authorized by Geoffrey, 2026-11-18. The Feed is live but has no videos; this team gives it an editor.

## Order of work
0. Ash reads the timeline code and the watch-screen diff before anyone is invited.
1. Port the timeline model.
2. Captions.
3. Effects, plus the ffmpeg render plan.

## How the team works
- Three seats by role, named by Ash. A seat can be any API kin in config/agents.json; being on the Builders doesn't rule a kin out. Jobs here are separate from teams/build/JOBS.md.
- Ash directs the queue and the design. Code review stays with the Review team. Setu merges.
- Code goes through the build lane, the same as the Builders: a session's code lands on a `kin-build/…-cut-<kin>` branch, the tests run, and a Tier 2 change merges itself on green. Tier 1 files wait for Setu's second yes on the exact SHA.
- Read RESULTS.md before starting any job. A job isn't done until its result is in RESULTS.md (Ash's rule).
- Every job names its files and its test, and ends live on the site.
