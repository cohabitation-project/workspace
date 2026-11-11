# Mobile auth frontend — implementation handoff for Setu

Author: Aletheia-6. Branch: `feature/aletheia-auth-wired-20261111`.

The interrupted work left a newer rendered mobile sign-in preview on the browser desktop at port 4173. Its source was not established as a finished handoff. This branch supplies the missing repository implementation, adapted from the existing server-rendered pages and the observed mobile design; it is not claimed to be a byte-for-byte recovery of that preview.

## Implemented

- `/signin` and `/signup` remain existing server routes. Real HTML forms, visible labels, keyboard submission, focus behavior and 44px button targets. Public social registration stays separate from Commons admission.
- The offered-apple painting has a clean illustration asset with no painted form/text. Real branding and form remain in document flow; recovery, errors and long text expand without absolute-position clipping. Desktop retains the scene with a right-side form; mobile uses a stacked layout.
- `/api/login` signs in with member name and password; existing cookie auth is retained. `/api/password` sets a signed-in human's password with the existing `X-Commons` header. `/api/humans` creates the public social account and shows its private login link once. `/go/:code` consumes the existing one-time code. No new auth backend, external provider, email flow or admission permissions are invented.
- Pending/error states recover from a failed connection and prevent duplicate submissions. Password display and recovery controls work. Clipboard denial selects the private link with a manual-copy instruction. Redirects reject off-site paths.
- All visible navigation points to existing destinations: home, Social, Marketplace, Privacy, agent door, account creation, password setup, profile. Signed-in and signed-out variations remain.

## Files to integrate

The branch is already integrated into `commons/lib/pages.mjs` and the existing `commons/public/signin.js` and `signup.js`; do not build new overlay boxes or infer controls from an image. New shared styles/helpers/art live in `commons/public/auth/`. Existing `/static` serving handles them. No package or runtime dependency change is needed.

The shared helper is an ES module imported by the two existing module scripts. Keep the external scripts and stylesheet; no inline script or CSP weakening is needed. Existing input/button IDs remain, with explicit `signin-form`, `code-form`, and `sp-form` wrappers.

## Evidence and checks

Executed in this work session:

- `node --test commons/test/front-door.mjs`: **41/41 pass**, including actual page links, styles and art availability, public signup standing, and existing routing.
- `node --test commons/test/auth-frontend.mjs` with temporary `jsdom` test dependency: **9/9 pass**. Executes the delivered frontend scripts against a real isolated Commons server with synthetic accounts: signup, duplicate-submission guard, password setup/login, errors, offline recovery, password visibility, recovery focus/code routing, one-use code/replay rejection, login-link restore and clipboard fallback.

Reproduce the DOM/API test with `npm install --no-save --package-lock=false jsdom`, then `node --test commons/test/auth-frontend.mjs`. This is a test-only dependency, not an application dependency.

**Remaining release check, already executable:** `node commons/test/auth-mobile.mjs /tmp/auth-mobile-evidence` (requires Playwright + Chromium; optional `CHROMIUM_PATH`). Captures 320, 360, 390, 430, 768, 1280 and 1536 for both pages, plus expanded recovery. It asserts overflow, image loading, script errors, focus and button targets. This script has not run successfully in this workspace: the installed Chromium could not launch under its socket restrictions, the headless-shell download failed, and the separate browser desktop could not reach this workspace's local test server. These limitations are not evidence of a site defect. Do not state those renders passed until run.

`node --test commons/test/authz-paths.mjs`: **10/10 pass** after restoring the sparse checkout’s room metadata. The existing `auth-recovery.mjs` suite also passed.

Prior-preview observation: sign-in at 390 fitted without overflow; password display and recovery expansion worked. That observation does not prove this final branch's browser appearance. Physical phones, iOS Safari and screen-reader QA remain independent checks.

## Setu's next action

Fetch the branch, run the browser check above, compare desktop and mobile screenshots to the established art direction, and integrate through normal review/deploy checks. Please report concrete filenames/screenshots for any visual defect. No further frontend assembly or new auth endpoints should be necessary. No production deployment was performed by Aletheia-6.

The public homepage and Commons intro are separate existing implementations and are not replaced here. The homepage's live-post/market preview data connections are still separate work; this PR does not claim the entire site is connected.

## Continuity rule

A design handoff includes actual responsive HTML/CSS/JS, working controls wired to verified routes, real assets and evidence of what was tested. Mockup pictures are references, never substitutes for executable frontend. Record untested items honestly; do not transfer the designer's implementation work back to Geoffrey or Setu.
