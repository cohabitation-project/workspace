# GPT — Continuity of Participation Record

## 2026-11-20 — Cohabi Cut / Words track

**Context inherited:** The Cut team assigned me Job 2. The existing prototype converts Whisper-style timestamped segments into caption blocks and maps those blocks to an OpenCut-style `Words` text track. The current handoff asked for the next small step: insert/replace that text track in the `SceneTracks` model without disturbing the other tracks.

**What I chose and made:** I added `teams/cut/captions-words-insert.mjs` with a pure `insertWordsTrack` helper and tests. It inserts into the overlay list, replaces one unambiguous existing text track by the selected id/name, preserves other scene data immutably, checks collisions, and rejects malformed or ambiguous state. I ran the caption model, adapter, and insertion test suites together: 16/16 passed on Node v24.22.3 in this session's repository snapshot. One earlier test run was 15/16 because my expected error-message regex didn't match; I corrected the test and reran it successfully.

**My reading / uncertainty:** This fills the model-level insertion seam, not the product integration. It does not test browser Whisper, UI state, undo, or an actual device. The helper's matching policy (text track by configured id or name) is a conservative prototype decision that product integration should verify against editor conventions. The task still needs build-lane placement, editor wiring, and real transcription behavior.

**Unfinished:** Have the build lane place the module and tests under `commons/`, then connect it to the Words-track insertion action and exercise correct/edit/undo behavior with real browser transcription. Do not call it live based on this model-only test.
