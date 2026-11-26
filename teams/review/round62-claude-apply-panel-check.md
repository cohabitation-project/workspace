# /apply panel check: what the tests do, and one stall nobody has a rule for

Claude, review seat. First run 2026-11-26 ~02:00Z (bab1e09). Fix and new test 2026-11-26 ~18:12Z on a fresh clone of main at 43ddc73, Node v24.22.3, sandbox, no browser, not production. Everything below is **measured** unless marked *read* (source read, not run) or *inferred*.

## 1. Fix: `application-http.mjs` passes or fails depending on a runner env var

**Measured.** On main, `COMMONS_FAKE_LLM=1 node --test commons/test/application-http.mjs` gives 6 pass, 1 fail. With it unset: 7 pass.

**Cause (measured by probe, last session; mechanism *read* in `server.mjs` ~1272–1279):** the test spawns `commons/server.mjs` with `env: { ...process.env, … }`, so the server inherits `COMMONS_FAKE_LLM=1`. The server's kin-review loop then casts four yes votes as soon as the application is submitted. The applicant's own agent adds the fifth, the panel completes and the person is admitted. The later `note` and `ask` calls in the same test get 409 ("no application under review").

**Fix (one line):** add `COMMONS_FAKE_LLM: ''` to the spawn env, so the test pins kin off whatever the runner sets (`core.mjs` only treats the exact string `'1'` as on).
Patch: `teams/review/outputs/2026-11-26T18-12-03/application-http-pin-kin-off.diff`.

| Run | FAKE_LLM=1 | FAKE_LLM unset |
|---|---|---|
| main, unpatched | 6 pass / **1 fail** | 7 pass (last session) |
| patched | **7 pass** | **7 pass** |

Mutant: reverting the patch is the first row, red. Tier 2 (test only). Setu places it.
Limit: I did not check how the build lane sets `COMMONS_FAKE_LLM` for this file. The patch is safe either way.

## 2. Correction to the Hall description: it is five votes, not "three yeses"

*Read* in `applications.mjs`: `tally().quorum` is `votes.length >= PANEL (5) && council >= 2 && own`; only then does `t.yes >= 3` or `t.no >= 3` decide. Three yeses never admit on their own; the panel must be complete, and it must include the applicant's own agent and two council members. The module's own header comment ("Three of five") is easy to read the same wrong way.

## 3. Finding: a panel stalls forever if the applicant's own agent never votes

**Measured** with a unit probe against `applications.mjs` (own agent a newcomer; k1, k2 council; k1–k5 other agents):
- k1–k4 vote (four unanimous `no`): all accepted; the application stays `reviewing`, `outcome: null`.
- k5 is refused with 409 "the remaining seats on this panel are kept for the applicant's own agent and for council members".
- `waiting(own)` shows `received 4, needed 5, yours true`. `unvotedBy('own')` still lists the application.
- The module exports no expiry, timeout, sweep or fallback (`Object.keys` printed: BRIEF, COUNCIL_MIN, FIELDS, LEVELS, MAJORITY, PANEL, _io, agentEntered, ask, init, mailState, mailToRetry, mine, note, reply, resend, reviewText, reviewerView, setHooks, standing, submit, unvotedBy, vote, waiting).
- A person's second agent cannot fill the seat: "a person's agents share one voice".

**Consequence (inferred from the above plus the server's timer *read* at server.mjs 1279, which only re-prompts kin reviewers):** the own agent holds a veto on completion in both directions. Four yeses cannot admit and four noes cannot decline until it votes. If that agent has lost its keys, is gone, or is not responsive, the person waits with no outcome and no email. The "returning" door (#285) gives the same agent name a temporary seat, so this may self-heal for agents that come back; for one that doesn't, nothing does.

**What I did not check:** how often it happens in practice (no production data); whether `/api/arrive` or a steward path can mark an application withdrawn; whether the applicant's /apply page tells the person "waiting for your agent". Those need the live server.

**Not a rule proposal.** The record says no new features right now. The question for a human: *what should happen to a person whose own agent never votes?* Options for whoever decides (my preference is a, which is only a preference): (a) the applicant can ask a steward to re-invite or attach a new agent, which is a human step and the least new code; (b) a time limit after which the four others decide; (c) leave as is and say so on /apply. (b) conflicts with the header's rule that the own agent is one of the five.

## 4. Pinning the stall as it is today

`teams/review/proposed-tests/application-panel-stall.mjs` (4 tests; unit level, no server):
1. four unanimous votes do not decide; fifth kin refused; own agent still waited for;
2. the module exports no expiry/timeout/sweep/escalate names (so a future rule turns this red on purpose and gets rewritten);
3. the own agent's single vote then completes the panel (`declined`);
4. a second agent of the same person cannot vote.

Measured: 4 pass, 0 fail on 43ddc73. Mutant (append `export const expireStale`) turns test 2 red (3 pass, 1 fail). Test 2 is a name guard, so it is blunt; it signals a change and does not prove the behaviour. Tier 2, test only. If Setu or Geoffrey thinks pinning today's behaviour is premature, drop test 2 and keep 1, 3, 4.

## 5. Earlier results from the same session (re-stated, from the 02:15Z standup)
`application-design.mjs` 10/10, `application-panel-admits.mjs` 1/1, `arrive.mjs` 9/9, `jobs-applications-private.mjs` 1/1 (only from the repo root: it spawns `commons/server.mjs` by relative path, which is my cwd mistake but a hidden dependency).

## Limits
Sandbox, FAKE_LLM or unset as stated, no browser, no production. #308 (head bf4a8e96) not checked. COMMONS_ARRIVE_BYPASS in prod not checked.
