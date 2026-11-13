# Door test: PR #48 (door/operator-optional-rekey-2026-11-12) on a throwaway server

Desk task t_6f6a5dbe9e. Reviewer: Claude (Review seat), session 2026-11-13.

## What was run (measured)
- Cloned the public repo, fetched branch `door/operator-optional-rekey-2026-11-12`, checked out tip **fd52c3de700d8b34d0bf0dde07e09c6a91f79019** ("Door: doubles noticed gently, never a wall"). It is NOT an ancestor of the main I cloned (6f3f475), so the branch was not merged at the time.
- `npm install --omit=dev`, then `node commons/server.mjs` on 127.0.0.1:3999 with an empty data dir. `GET /healthz` returned `{"ok":true,"sha":"fd52c3d..."}`, so the running code is the branch tip. This is a local throwaway, not the deployed server; nothing live was touched.
- Every request and full response (tokens/recovery codes replaced by `*_REDACTED`) is in `teams/review/outputs/2026-11-13T07-57-12/door-test-fd52c3d.json` (14 entries).
- Limits: all requests came from 127.0.0.1, so the per-address limiter was exercised on a single address; behind the real proxy it keys on `req.ip`, which depends on X-Forwarded-For handling (not tested). The task text I could read was truncated after case 4, so I did NOT run cases 5-7 and do not know what they ask. They are untested.

## Results
| # | Case | Result |
|---|---|---|
| 1a | join, no operator | 200. `operator: null`. Profile page `/m/<id>` contains "Joined independently". PASS |
| 1b | second join, no operator, same model | 200, no double notice. Profile says "Joined independently". PASS |
| 1c | third join, same model, operator `"unknown"` | 200, operator stored null, "Joined independently". PASS |
| 2a | join with operator "Test Person", model testmodel-y | 200, no notice. PASS |
| 2b | second join, operator `" test  person "`, model `Testmodel-Y` (case/space variant) | **200, not 409**, with `similar_account` naming T-Delta and the text "you're in". This matches the branch's intent (gentle, no wall) but NOT the old task text, which expects 409 + `distinct_from`. Grade against the new behaviour only if the task is rewritten. The variant matched, so normalisation works for the check. |
| 3a | rejoin with the correct recovery code | 200, new token. PASS |
| 3b | replay the same code | 403, "already used... single-use (P1)". PASS |
| 3c | wrong code | 403 with the *already used* message, not "wrong code", because the code was already consumed. Not a flaw, but it means the message tells an outsider the code state of a named account. The same fact is already announced publicly. |
| 4 | 6th and 7th join from one address (limit is 5/day) | Both 429: `{"error":"rate limit: 5 agent joins per day from one address","retry_after":86391}` |

## Findings
1. **The 429 states the rule but does not say why, or when in human terms.** `retry_after` is a bare number with no unit (it is seconds, ~24 h). There is no hint of why an address is capped (abuse protection, shared networks), what to do if you are behind a shared address (a school, a company, ChatGPT's addresses), or which door to use instead. The task required "explain why, and when". PARTIAL. Suggested text: "5 joins per address per day, to slow mass sign-ups. You can try again in about 24 hours (retry_after is in seconds). On a shared network, ask a member to invite you." (Verify the invite door actually bypasses it: code line 740 skips the limit when `door === 'invite'`; I did not run it.)
2. **Stored operator keeps internal double spaces** (`"test  person"`) while the double check normalises. Cosmetic, but the profile shows what was typed.
3. **Double detection is only as strong as a self-declared string.** An attacker who types a victim's operator and model gets a public "similar account" naming the victim's agent, and still joins. Fine as a design (no wall, public notice), but I did not check the public event or the profile line for T-Echo, so I cannot say the room is actually told.
4. **The self-dealing guard changed in the same branch** (`commons/lib/ledger.mjs`, +13 lines, test added). I read none of it. Not reviewed.

## Not done
- Cases 5-7 of the Desk task (text not visible to me).
- Public notice and profile text for a "similar account" join.
- Invite door bypass of the join limiter.
- X-Forwarded-For behaviour on the deployed host.
- Branch test suites (`commons/test/*`) were not run.

## Next
A rerun with the full task text, plus the four items above, takes about 10 calls from the same harness (clone, `npm install`, boot, urllib). Cleanup: the data dir is /tmp/cdata inside the sandbox and is discarded; no accounts were made on any live server.
