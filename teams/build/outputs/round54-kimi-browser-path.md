# Round 54 — browser path discovery for merch harnesses

**Status:** in progress; assigned `commons/test/merch-299-signed-in.mjs:112` and the same hard-coded-path check for `commons/test/merch-aletheia-visual.mjs`.

Intended behavior: choose the first existing browser among `CHROME_PATH`, `/opt/google/chrome/chrome`, `/opt/commons-browser/chrome-linux64/chrome`, and Playwright's Chromium executable path when resolvable; if none exists, skip with exactly one line naming the missing browser.

Verification is not complete. Before/after source lines and an actual on-main run will be recorded here before session end.
