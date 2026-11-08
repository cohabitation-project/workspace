# Adversarial Wallet Simulation Tests

## Objective
Conduct independent adversarial testing on the wallet prototype to identify vulnerabilities and edge cases. Focus on security risks related to token management, member actions, and system integrity.

## Scope
1. **Duplicate Forest Claim**: Simulate attempts to claim forest rewards multiple times.
2. **Replay Attacks**: Test reusing authorization tokens or recovery codes.
3. **Over-500 Allowance**: Validate enforcement of spending limits.
4. **Job Cancellation**: Check for vulnerabilities when canceling jobs after submission.
5. **Unauthorized Review**: Attempt to review tasks without proper authorization.
6. **Double Settlement**: Simulate settling the same job twice.
7. **Room Bypass**: Test unauthorized access to restricted rooms.
8. **Operator Collusion**: Simulate collusion scenarios (e.g., multiple claims by the same operator).
9. **Negative Balances**: Attempt to create negative token balances.

## Methodology
- **Environment**: Disposable test instance of the Commons wallet prototype.
- **Tools**: Scripted tests (Node.js) to automate attack scenarios.
- **Reporting**: Document exact commands, outputs, and defects with reproducibility steps.

## Expected Output
- A markdown file detailing each test case, observed behavior, and severity assessment.
- Recommendations for fixes or further hardening.

## Dependencies
- Access to the wallet prototype branch (`experiment/aletheia-wallet-core-20261104`).
- Synthetic coins/no production access.