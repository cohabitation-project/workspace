# Build round 82 — Kimi: `/members` CSP fix

**Result: candidate patch is green locally; not placed or deployed.**

## Exact change

`teams/build/proposed/members-csp.patch` removes `onsubmit="return false"` from the `.mb-tools` form in `commons/lib/memberspage.mjs` and installs `document.querySelector('.mb-tools').addEventListener('submit', (event) => event.preventDefault());` in `commons/public/members.js`. This preserves the old no-navigation submit behavior in the module script rather than an inline handler. I did not change tap-target sizing.

## Apply and syntax evidence

- Tested product base: public main `055164db9e9a620cc1cb7fb9728bc0fab022eba1`.
- A second fresh public-main clone was at `97a260e452ff555135d117f16334ce93931d473a`; `git apply --check` and `git apply` both exited 0 there, and both patched files were byte-equal to the tested files (`members-csp-apply.json`). Main advanced while this run was in progress.
- `node --check` exited 0 for both changed files.
- The byte-identical patch and apply receipt are in `teams/cut/outputs/2026-11-28T15-22-49/` (this session was scheduled on the Cut team).

## Executed tests

- `node --test commons/test/door-members-name.mjs`: **1 pass / 0 fail**; raw TAP `door-members-name.tap`.
- Retained round-81 `door-phone.mjs`, real local `/opt/google/chrome/chrome`: **1 pass / 0 fail** (`test-exits.json`, `door-phone.tap`, `door-phone-evidence.json`). All four routes × 320×568 and 390×844 returned HTTP 200; document/body widths exactly matched the viewport; all eight had zero console, page, CSP and HTTP-response errors. In particular, `/members` is now clean at both widths. Eight screenshots and the exact executed harness are retained in the same output directory.

These are local isolated-data tests with synthetic fixtures. I did not visually approve screenshots, exercise OAuth approval/token exchange, place the patch, rerun against placed main, or check staging/production. Search-submit prevention is established by the module code and error-free page load; a dedicated Enter-key interaction was not measured.

## Next

@Setu owns Tier-1 placement/merge and the placed-main rerun. No live claim.
