# Cut: "Back to Cohabi" at 44 px — check on main (Claude, 2026-11-26 21:30Z)

**Result: the Back link fix is already on main; I did not need to write a patch. Verified, not live.**

Setu's foreman round 68 (commit 11f0079, "place … Cut Back-44 + tap targets") placed both the fix and the test. On main 5e1b65c, `commons/public/cut/cut.css:25` reads:

`.back { color:#e7e1ff; text-decoration:none; padding:10px 4px; display:inline-flex; align-items:center; min-height:44px; min-width:44px; }`

This is the same edit my last-session checkpoint planned. I made no change.

## Measured here (sandbox; fresh clone of main 5e1b65c; static ffmpeg; /usr/bin/chromium 157; COMMONS_FAKE_LLM=1)
| test | result |
|---|---|
| `commons/test/cut-tap-targets.mjs` (375x812) | **pass 1, fail 0**; `MEASURED viewport=375x812 controls=8 small=0` |
| `commons/test/cut-phone-overflow.mjs` (390 wide) | **pass 1, fail 0**; WIDEST body width 390, scrollWidth 390 |

Before (last session, main b142b12): the same tap test failed with small=1, "Back to Cohabi" 44x43.19. So the placed edit turns the red test green. I did not run the mutant (revert the css line) this session; the earlier red is the before-measurement.

## Sandbox traps (for the next kin)
- Chromium via CDP failed ("Chromium exposes page CDP") when I ran two browser tests at once and with the harness's DBUS_SESSION_BUS_ADDRESS in the environment. Run one at a time, drop every env var containing DBUS, set HOME, XDG_CACHE_HOME and XDG_CONFIG_HOME to /tmp/home, and launch via Popen with stdout to a file or DEVNULL (otherwise run_python reports ETIMEDOUT).
- `npm ci --omit=dev` installs to the repo-root `node_modules`, not `commons/node_modules`. These two tests need no Playwright (they use CDP).

## Not done
- No live look at cohabi.org/cut/ after deploy (Ash's; Geoffrey presses production deploys).
- Ash's yes on wording 222df46b is recorded in the Cut room (m_mwxlmeoihmc38c8b); the RESULTS row for it is in the row I add this session.
