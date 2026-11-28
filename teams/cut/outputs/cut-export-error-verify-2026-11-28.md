# Export-error patch: independent re-run and maker-safety read (Claude, 2026-11-28 ~03:30Z)

Fresh `git clone --depth 1` of main at `b9918797f2fadd8e2390c37b1a760e43df70ae9d`, `npm ci --omit=dev`, `HOME=/tmp/home COMMONS_NO_SPEND_POLL=1`, `/usr/local/bin/node --test`. No ffmpeg. All numbers below are MEASURED in this session unless marked READ.

This reproduces my own round-47 numbers in a new sandbox. It is not Kimi's independent run, and Setu's full-suite and Ash's yes are still separate.

| check | result |
|---|---|
| SHA-256 of `teams/cut/outputs/2026-11-28T00-23-17/cut-export-error-propagation.mjs` | `0703ea61f9eb4225c609ffea2a2628ebe84c1a15f2917c4d42e24a829d483033`, 7,566 bytes. Matches the report. |
| Copy to `commons/test/cut-export-error-propagation.test.mjs` | byte-identical (hash prefix 0703ea61f9eb4225 after copy) |
| `git apply --check exportFailureMessage-409.patch` on main b991879 | rc 0 |
| Test on main, no patch | 4 pass / 6 fail |
| Test on main + patch | 10 pass / 0 fail |
| Wider run on the patched tree: every `commons/test/cut-*` and `commons/test/video*` file, one process per file (39 files) | 243 pass, 0 fail, 14 skipped, 1 todo. No file failed or printed no summary. |
| Related files in one run (route-unready-order, export-body, route-http, failed-ui-live) | 16 pass, 0 fail, 1 skipped |

Not re-run this session: the five mutants M1-M5 (the numbers in `round47-results.json` stand as my round-47 measurement only). Not run: a browser, staging, production, real ffmpeg.

## Maker-safety of the four statuses (READ, `commons/lib/cut/route.mjs` on b991879)
With the patch the client shows `payload.error` verbatim for 400, 409, 422, 429. Every `fail(...)` site for those statuses:

- **409** (lines 75-76): "This video could not be prepared. Upload it again." / "This video is still being prepared. Try again when it shows ready." Fixed strings.
- **422** (lines 103, 105): "could not read that video". Fixed string; the probe's own error is not included (the chain test pins that "/secret/path" doesn't reach the toast).
- **429** (lines 89-90): "one export at a time" / "the editor is busy, try again in a minute". Fixed strings.
- **400** (lines 59-68, 80): fixed strings such as "send { videoId, edit }", "videoId is required", "musicId must be a short text id", "the edit asks for music but gives no music id", "music is not available on this server". These already reached the maker before the patch, since 400 was already shown.
- **400 at line 124**: `String(err.message || "the edit was refused")` where err is whatever `editToTracks` throws. Messages from `commons/lib/cut/edit.mjs` (lines 43-126) are about the maker's own values: "trimEnd (x) must be greater than trimStart (y)", "text is too long to fit on one line of a 1080px frame", "music.volume must be from 0 to 1, got v". They name no path, no probe/ffmpeg output, no member data. They interpolate the maker's own numbers, and `String(v)` of the submitted value in line 43 ("must be a finite number, got ...") echoes the maker's own input back to them. This is unchanged by the patch.
- **500** (lines 57, 127): stays generic on the client (not in the list).

Result: for the four statuses the patch adds (409, 422, 429) every sentence is a fixed maker-facing string. I found no leak at the route. Two things I did NOT check: (1) any middleware in `server.mjs` that could produce a 400/429 with its own `error` text before the route runs (line 935 calls `handleCutRender` through `wrap`; I did not read `wrap` or the body-parser error handler); (2) whether `houseWriter(req)` can make the route return anything other than the above.

### Addendum (READ, `commons/server.mjs` on b991879): the middleware spot is closed except one call
- Body-parser errors (server.mjs:419-425): parse failure answers 400 `{error:"invalid JSON"}` (fixed string, now shown to the maker for 400 as before); too-large answers 413 `request body too large`. 413 is not in the patch's list, so it stays generic.
- `wrap` (server.mjs:520-533): a thrown `CommonsError`/`DeskError` returns its own `e.message`, and any plain error with a 4xx `status` and a message returns that message. This only matters for 400/409/422/429 if `houseWriter(req)` (line 935, called before the route) throws one of those statuses. I did NOT read `houseWriter`. 401/403 are not in the list, so an auth failure there stays generic on the client. Open: confirm `houseWriter` throws nothing in 400/409/422/429 with internal text.
- Unhandled errors become 500 "server error", generic on the client.

## Corrections made to the round-47 report
- "10 results (7 test functions, node counts nested subtests)" was wrong. The file has 10 top-level `test(...)` declarations and no nested subtests (Kimi's count, confirmed against the 4+6 and 10 results).
- The first client test's title says "trimmed of nothing else" but asserts exact equality. Title only; behaviour is fine (the patch's `payload.error.trim()` check is what makes whitespace-only fall back to the generic text, test 3).

## What this leaves for others
- Kimi: independent dynamic run (hash, red-alone, apply-check, patched-green, mutants) and the `server.mjs` `wrap` / body-parser read.
- Setu: place patch and test together; the test is red without the patch.
- Ash: yes or no, and whether 422/429 should show server text (M2/M3 show what changes if not).
