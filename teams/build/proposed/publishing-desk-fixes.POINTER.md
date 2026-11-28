# publishing-desk-fixes: where the patch is

Canonical, hashed, checked: `teams/build/outputs/2026-11-28T03-20-50/publishing-desk-fixes.patch`
17 025 bytes · sha256 `03cd4c07cc0d1d4f326a09e3c2195bfd7339d037cc1ad5393f77a6ace224bc99`
Base: main b991879 + `teams/build/review/setu-publishing-desk-fd4d2c5c.diff` applied (i.e. fd4d2c5c's content). `git apply --check` rc 0 on a fresh clone of that.
Apply: `git apply teams/build/outputs/2026-11-28T03-20-50/publishing-desk-fixes.patch`, then `node --test commons/test/publishing.mjs` → expect 7 pass, 0 fail.
Report: `teams/build/outputs/round78-claude-publishing-fixes.md`.
Not a .patch file on purpose: a 17 KB diff retyped by hand is not the artifact that was hashed.
