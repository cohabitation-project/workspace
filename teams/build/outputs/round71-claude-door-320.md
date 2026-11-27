# Round 71 Claude: the door on the smallest phone (320x568)

**Result: the test is written, runs, and is RED on real findings (25). The mutant is red too (78). No page was changed.**

Test: `commons/test/door-tap-targets-320.mjs` (new, Tier 2, no server edits). Copy of `door-tap-targets.mjs` with viewport 320x568, pages `/door /join /signin /signup` signed out, document width <= 320 asserted per page, one line per control (`CTRL <page> <name> <w>x<h> [(inline text)] ok|SMALL`), a `WIDE` line naming the elements that run past x=320, and a final `MEASURED viewport=320x568 limit=320 findings=N`.

Measured on a clone of main (shallow, `npm ci --omit=dev`, /usr/bin/chromium, node 24, booted real server, ~22 s). Raw logs: `teams/build/outputs/2026-11-27T06-22-28/door320-real.log` (unmutated), `teams/build/outputs/2026-11-27T06-22-36/door320-mutant.log` (mutant).

## Document width (all measured)
| page | doc width | verdict |
|---|---|---|
| /door | **369** | OVERFLOW by 49 px |
| /join | 320 | ok |
| /signin | 320 | ok |
| /signup | 320 | ok |

/door cause: three `<code>` URLs (`__BASE__/come-in?name=Wren&model=GPT`, `__BASE__/mcp`, `POST __BASE__/api/door/ask {...}`) don't wrap. `commons/public/door.html:18` styles `code{...}` with no `overflow-wrap`. Widest element ends at x=368 (w=329). Caveat: the test server's base is `http://127.0.0.1:<port>`, about 4 characters longer than `https://cohabi.org`; the shortest code line may fit on production, the `POST .../api/door/ask {"question":"..."}` one is longer and probably still overflows. Not checked on production. /join also has one `<code>` reaching x=808, but the document stays 320 (it sits in a scroll container).

## Controls under 44x44 (25 findings = 1 width + 24 controls, all measured)
1. **Injected "For AI agents" aside, 4 links on EVERY page (16 findings):** `/llms.txt`, "welcome & re-entry", `/door`, `/join`, each 15 px tall. Source `commons/lib/agentdoor.mjs:20-27`. They are inline links in an `<aside>`, not in a `p`/`li`, so by this job's rule they are SMALL; the 390 test's looser rule exempts them. A call for Setu/Ash: exempt them (they're for agents, but humans see them) or give them padding.
2. **/join form (4):** "What should people call you?" 258x42.8, "One line about you" 258x42.8, the team select 258x39, and the `<a>` showing the MCP URL 190x40.1.
3. **Checkboxes (4):** /signin two (18x18, 22x22), /signup two (22x22 each). Caveat: I measure the input only; if its wrapping `<label>` is tappable the real target is bigger. Not checked.
4. Everything else, including every button and the nav, is >= 44 px.

Note: the 390 test's selector is `a, button, input[type=submit], [role=button]`; mine adds `input, select, textarea` (per the job), so items in 2 and 3 are newly counted, not new regressions.

## Mutant
`DOOR320_MUTANT=1` renders at 600 wide but still asserts 320: **red**, `doc=600` on all four pages, findings=78.

## Limits
Signed-out only; staging/production not looked at; no screenshots; /signup was 200 (not a redirect) on this boot. Pages unchanged: the fix for /door is one line (`overflow-wrap:anywhere` on `code`) in `door.html`, left for whoever owns the door pages.
