# Line 4 — file drop, addendum: the server's submit and serving code (Review, Claude, 2026-11-03 evening)

Adds to `teams/review/line4/file-drop.md` (which covered `commons/lib/scan.mjs` only). This time I read the route and the
serving code in `commons/server.mjs` (all 48k chars, in three overlapping reads), `commons/lib/auth.mjs`, `commons/DEPLOY.md`,
and fetched the live `/submit` page and `/api/submissions`. I did NOT run the server (no Node here) and did NOT upload anything.
Everything below is "from reading the code" unless it says "live".

## What I checked live
- `GET /api/submissions` returned `{"items":[]}` — the drop is empty (live, 2026-11-03 ~18:50 UTC). Nobody has yet been exposed to any of what follows.
- The live `/submit` page now says a clean scan publishes at once and any signed-in human can pull a file. That matches the code. (The header comment in scan.mjs, "nothing is served until a human clears it", is still stale.)

## Finding 1 (settles an open item): the SVG link bypass is mitigated by the serving headers — rate LOW, was "unknown"
In file-drop.md I found an entity-encoded `javascript:` link and an external `@import` pass the SVG regex, and said the risk
depended on headers. The route `/submissions/files` sets, per response: `X-Content-Type-Options: nosniff` and
`Content-Security-Policy: default-src 'none'; img-src 'self'`, overriding the site-wide CSP. With `default-src 'none'`
and no `script-src`, a browser that honours CSP will not run inline script or follow a `javascript:` URL, and will not fetch
an external stylesheet or image from the SVG's own document. Session cookie is `HttpOnly; SameSite=Strict` (auth.mjs), so
even a successful script could not read it. So: the regex gap is real, but the second layer covers it for current browsers.
Residual: relies on every viewer's browser honouring CSP; there is no `sandbox` directive and no `Content-Disposition: attachment`.
Cheap hardening (suggestion, not tested): add `sandbox` to that CSP, and serve svg/pdf/zip as attachments.
Label: INFERRED from headers in code; not confirmed by a live request to an uploaded file (none exists).

## Finding 2 (NEW, MEDIUM): the upload body is read before anyone is authenticated, and there is no upload limit per person
`app.post('/api/submit', express.raw({ type: 'multipart/form-data', limit: '100mb' }), handler)` — Express runs the raw-body
parser first, so up to 100 MB per request is buffered in server memory before the handler checks the token or cookie.
I saw no `auth.allow(...)` rate limit in the route (other routes such as login and device-code have one), no per-member quota,
no total-disk cap, no cap on the number of files. Agents can join through `/api/join` (per-IP limited), so "members only" is a
low bar. Possible effect: memory pressure or a full disk on the same machine that runs the Commons, the bridge and Kinward.
Unknown: whether the reverse proxy (DEPLOY.md only says "HTTPS reverse proxy"; Caddy is suggested, nginx mentioned) caps body size.
nginx's default would reject bodies over 1 MB; Caddy has no default cap. That is a one-line check for Geoffrey/Setu.
Label: INFERRED from code; not load-tested.

## Finding 3 (NEW, MEDIUM, for the stop plan): the file drop has no freeze check
`store.isPaused()` is checked in WebSocket messages, `/api/kin/session`, and (per DEPLOY.md) is meant to give "no posting, no
joining, no model calls". In the `/api/submit` and `/api/submissions/review` handlers I read, there is no `isPaused()` check,
and I saw no global freeze middleware among the `app.use` calls before the routes. So after `admin.mjs freeze`, the drop would
probably still accept and publish files. This contradicts the freeze promise in DEPLOY.md and in my stop-plan v0.3 (which lists
freeze as stopping the Commons). Needs a one-line check and a test; I have not been able to confirm by running it.
Action for v0.4 of the stop plan: either add the check, or state that the drop keeps running under freeze and say how to stop it
(`pm2 stop commons`).

## Finding 4 (LOW, behavior bug): reject, then clear leaves a "cleared" file that 404s
Reject moves the file to `quarantine/`; a later "clear" only flips the log status to cleared and does not move it back. The log then
lists a published file that isn't served, with `reviewed_by` a human. Cosmetic, but it makes the log wrong.

## Finding 5 (LOW): who can pull a file
The review route accepts any signed-in member of kind `human`. If profiles are self-service at `/join`, any new human can pull anyone's
file. It is logged with a name, so it is accountable, but it is not "a trusted human". The page does say "any signed-in human", so the wording is honest.

## Not changed by this read
- Streamed-zip bypass (only first entry examined) and the missing-from-refuse-list zip entry types (.html, .hta, .lnk, .docm, .js): still stand. These
  matter to the person who downloads the zip, not to the server; CSP does not help there. Still needs one real upload to confirm my Python port.
- PDF accepted on magic bytes only; STL accepts any file over 84 bytes. ClamAV "unavailable" still counts as clean.
- No public way to report a file; files are public before anyone looks. Legal questions for a lawyer, not me: a host's duties when users can publish with no review (illegal content, takedown handling), and the AI-work copyright wording.
- `/label/files` is served with `nosniff` only (no CSP). Its content comes from repo commits, so only committers could plant active content there. LOW, noted.
- Minor: `decodeURIComponent` on a malformed percent-encoded path in the serving middleware throws; Express turns it into a 500, harmless.

## Verdict (updated)
Still: fine while the drop is empty and uninvited. Before outsiders are invited: (1) put a rate limit and size/quota check ahead of the 100 MB buffer
(or confirm the proxy cap), (2) add the freeze check, (3) fix the zip walk, (4) add `sandbox`/attachment headers. (1) and (2) are the two I would do first.
Board 012 (a named second human) is still open, so every one of these waits on Geoffrey.

## What I'd want someone to run (needs Node or a human)
1. `node commons/admin.mjs freeze`, then POST a small valid PNG to `/api/submit` with a token. Expected by the plan: refused. Predicted by my read: accepted.
2. POST 5 files of 90 MB in a row from one token; watch memory and disk.
3. Upload a streamed zip (data-descriptor entries) whose second entry is `x.exe`; compare with the same zip written normally.
