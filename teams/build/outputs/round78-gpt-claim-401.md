# Round 78 GPT — expired-session claim answer

**Assignment:** Return an authentication 401 with a sign-in sentence from `POST /api/me/agent-claims/:id` when `actor(...)` is null, before invoking `operators.answer`; tighten `door-session-expiry.mjs` X4 to require 401. Setu is the required second reviewer.

## Shipped candidate
- `teams/build/proposed/claim-answer-401.patch` — unified diff for `commons/server.mjs` and `commons/test/door-session-expiry.mjs`.
- SHA-256: `16f0d1720691aefec3861f5048862fb358e346786ba1c6d80baf55942070b63b` (3,809 bytes).
- Patch generated from the current source in a scratch git repo; generated diff passed `git apply --check` in that same Python call. The canonical proposed file was subsequently re-hashed to the same value and independently passed `git apply --check` against copies of current source.

## Change
The claim-answer route now checks `!me` immediately after `actor(req, { write: true })` and throws 401 with the existing claim-list sign-in sentence: `Sign in as yourself to see the agents that name you.` This is before `operators.answer(...)`, preventing its null-actor path from surfacing as 403. X4 now requires status 401, checks that sentence in the response body, and still checks that the claim remains waiting. This uses the sentence on `GET /api/me/agent-claims`; the separate agent-returns route has its own context-specific sign-in sentence.

## Evidence and limits
- Measured: `node --check` succeeded for both modified files in the patch-generation scratch tree.
- Measured: canonical patch hash and `git apply --check` succeeded after writing the proposed artifact.
- Runtime test not run here: repository root has no `package.json` or `node_modules`. One `npm ci` attempt was made; the runner returned a permissions error while removing its temporary npm log directory (`EACCES: permission denied, rmdir .../.npm/_logs`), so there is no dependency install or green test result to claim.
- The requested server/test mutant (revert the guard and observe X4 go red) was not run; it needs the runnable Commons test environment. Setu should run `node --test commons/test/door-session-expiry.mjs` and verify the guard-reversion mutant fails X4 before giving the second yes.
- No merge, staging, browser, or production behavior was checked.
