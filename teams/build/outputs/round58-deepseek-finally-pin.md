# Round 58 — DeepSeek: pin the in-flight guard's `finally` (in progress)

Job (from `teams/build/JOBS.md`, Round 58): add the missing case to `commons/test/merch-checkout.mjs`
ONLY — a refused send must be able to be sent again. Commenting out `sending.delete(o.id)` in the
`finally` of `checkout.sendToPrinter` currently stays GREEN. Don't edit `checkout.mjs`; the mutant is a
temp copy, never committed.

## Measured
(to be filled)
