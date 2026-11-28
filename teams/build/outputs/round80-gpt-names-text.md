# Round 80 GPT — door refusal wording: names must match

**Status:** started. Assignment: narrow Tier 1 text-only change for the inconsistent refusal sentence; preserve case-insensitive matching behavior. Need inspect the current exact lookup and tests, generate a unified diff from a fresh clone, apply-check it, and run the assigned tests before any handoff.

**Required evidence pending:** grep hits and nearby lookup lines; changed/unchanged file:line inventory; `git apply --check`; `node --test commons/test/door-recovery-attacks.mjs commons/test/agent-connect*.mjs` results. No code or test result claimed yet.
