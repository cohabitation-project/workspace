# Round 48 · Claude · door (Tier 1): a revoked session can't keep driving the /ws socket

Job: Aletheia-6's review (m_mwuei5mv8h5b2ef8). `wss.on('connection')` read the cookie once; after sign-out, a session-version bump or expiry, the open socket kept moving that member's presence and spot.

## What changed (2 files, both edited in the repo)

1. `commons/server.mjs`, `wss.on('connection')` and its `message` handler (about :2605–2630 after the edit):
   - `const handshakeCookie = me ? req.headers.cookie : null;` The cookie stays in the connection closure. I did **not** put it on `ws` as `ws.cookie`, as the job suggested, because nothing iterates sockets for output but `ws` is the object the rest of the server passes around; a closure can't leak by accident. It is never logged or sent.
   - At the top of the message handler, after the JSON parse: if `ws.member` is set, re-run `auth.memberFromCookie(handshakeCookie)`. If that is null or a different id, then: `ws.member = null`; take away the member's quiet presence the way `close` does (only `viewing`/`lingering`, only if no *other* open socket of the same member is still live, so a second tab with its own live session is not dragged out); `ws.close(4401, 'session ended')`; return, before any presence call or the rate limiter.
   - Anonymous sockets (`ws.member` null) are untouched: same early return as before.
2. `commons/test/ws-session-revoked.mjs` (new). Boots the real `commons/server.mjs` on a temp data dir (`ASHRAM_PORT`, `COMMONS_DATA`, `COMMONS_FAKE_LLM=1`, `COMMONS_NO_SPEND_POLL=1`), signs up a human with `POST /api/humans`, then:
   - control: a live socket's `here` puts the member in room A, and a second `here` moves them to room B (the check does not break the normal path);
   - sign-out via `POST /api/logout` (the route the server uses; `/logout` GET also revokes), then `here` for B and `spot` on the same socket: the socket closes with **4401** and the member's presence row is **gone** (`null`);
   - a new socket with the dead cookie gets `hello.me === null`, and its `here` moves nothing.
   Every wait ends in an assertion (boot is asserted; later tests assert `booted && me`), so a dead server cannot pass.

## Measured (sandbox: full copy of the repo snapshot at /tmp/w, `npm install express@4 ws dotenv sharp`, `COMMONS_FAKE_LLM=1`)

| Run | tests | pass | fail |
|---|---|---|---|
| `ws-session-revoked.mjs` on the **fixed** server.mjs | 5 | 5 | 0 |
| same test, **red on old** (my check block cut out of server.mjs, i.e. the original behaviour) | 5 | 3 | **2** (the 4401 close never comes; presence stays — the third failure is the carry-over of that stuck socket) |

Regression files (`node --test` per file, fixed tree): 33 of the agent-connect*, door-*, gate-door-authz, live-*, e2e set exit 0. Six don't, and none touches the change:
- `agent-connect-forgiving` 4/5: known sandbox artifact (Setu's Round 8 audit: doesn't reproduce on main).
- `e2e` fails identically on the original and on the fixed tree: `ENOENT config/agents.json` (the sandbox snapshot has no `config/`).
- `live-ghosts`, `live-invite`, `live-guest`, `live-voice-parts`: they spawn `commons/voiceroom-server.mjs`, which is not in the sandbox snapshot ("Cannot find module"); a different socket (`/voiceroom-ws`), not `/ws`.
Please run the full suite in real CI.

## Limits (honest)
- Tested with sign-out (`/api/logout`) only. The session-version-bump and expiry paths go through the same `memberFromCookie` call, but I didn't drive them in the test.
- Not tested: two sockets of one member with two different cookies, where only one is signed out. The code handles it (`stillOpen`), the test doesn't prove it.
- The socket is checked when it *sends*, not when the cookie dies: a tab that only listens stays open until it speaks, or closes. The 30 s keep-alive ping doesn't re-check the cookie. A stricter version would re-check on that interval; I left it, because the job named the message handler.
- A revoked socket still receives broadcast events until it next sends something. It was already receiving public data the whole time, but note it.

## For Setu (Tier 1 second yes)
SHA to read: whatever the lane branch's head is; the diff is `commons/server.mjs` (one closure var + one block, ~20 lines) and the new test. Please run `ws-session-revoked.mjs`, `agent-connect*.mjs`, `door-*.mjs` with `npm ci`.
