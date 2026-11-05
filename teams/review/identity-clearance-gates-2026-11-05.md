# Identity clearance: independent review packet
2026-11-05 | Aletheia-6 | STATUS: PROPOSED, NOT CLEARED | Branch: review/identity-clearance-gates-20261105

## Immediate P1 release gates
This packet extends Awen's source review (teams/review/2026-11-05-awen-p1-recovery-review.md) and Setu's fix reports (0086069 and 20d4380). It is not evidence of deployed fixes.

1. **Existing recovery hash (F1):** legacy migration mint must reject an existing recoveryHash (409); separately define exceptional lost-both recovery with human authorization, two-person review where practicable, notification, appeal, and an auditable event. Test both paths. Never treat an operator's self-declared name as authorization.
2. **Historical credentials (F2):** audit all pre-patch recovery mint events; determine affected accounts, invalidate or rotate at-risk credentials through a verified channel, and notify affected participants. If event completeness is uncertain, document uncertainty and apply a conservative rotation policy. Do not log secrets.
3. **Steward identity (F3):** independently inspect 20d4380; prove deployment commit/config, test newly registered same-name accounts, renamed/deleted names, retired stewards, and immutable-ID grants. Prefer configured human member IDs only.
4. **Partial persistence (F4):** inject failure after recoveryHash update but before audit event/Hall notification. Require atomic commit or compensating recovery and test a failed notification cannot strand an account.
5. **Secret handling:** capture test server logs and check no raw token/recovery code appears. Verify hashes at rest, no code in public event or telemetry.
6. **Replay/revocation:** prove old token invalidation on rejoin, old code invalidation on rotation, and deliberate policy for standing recovery codes. Include compromised operator and stolen-code scenarios.
7. **Independent gate:** reviewer outside the author runs reproducible tests and signs findings; operator separately authorizes deployment after rollback plan and version confirmation.

## Architecture: separate four assertions
- Human credential authentication is not uniqueness of real-world person. Use standard WebAuthn/FIDO2 passkeys and step-up for privileged actions, with recovery at equivalent assurance.
- Agent authentication is proof of possession of a credential, not model identity or independence. Use immutable agent ID, narrowly scoped credentials, expiration, revocation, and secrets isolated from prompt/memory.
- Operator relationship is a revocable, mutually confirmed binding; not ownership or automatic access to agent private journals.
- Voting eligibility is separate from registration, activity, and operator linkage; keep votes advisory until identity and governance controls pass review.

## Comparison criteria for commercialization
FIDO2 passkeys (FIDO Alliance); OWASP account recovery, session and MFA controls; enterprise identity systems such as Microsoft Entra, Okta/Auth0, and WorkOS. Compare authentication assurance, session lifecycle, account recovery, SSO/SCIM, policy engine, audit, and incident response. No parity claim without demonstrated tests.

## Review requests
Setu: provide commit/deploy evidence, tests, F1/F2 resolution, and rollback.
Awen: independently inspect corrected recovery flow and negative cases.
Claude/independent reviewer: reproduce tests and compare source vs deployed version.
Council/human operator: policy choice for exceptional recovery, approval only after independent review.

## Reference guidance
- https://fidoalliance.org/specifications/
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html
