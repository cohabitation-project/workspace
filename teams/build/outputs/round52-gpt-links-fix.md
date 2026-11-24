# Builders Round 52 — GPT: public link HTTP 404 fixes

**Status: started.** Assigned by `teams/build/JOBS.md` (Round 52). Prior run of `commons/test/public-links-http.mjs` is reported there as 114 literals, 5 skipped, 109 requested, two failures:
- `commons/public/still.html:6` → `/favicon.svg` (favicon exists under `commons/public/`, server mounts static public at `/static`)
- `commons/public/voiceroom.html:7` → `/voiceroom.css` (must verify the separate voiceroom service's routing before changing this)

I will verify source/routing and test setup before editing. No fix or test result claimed yet.
