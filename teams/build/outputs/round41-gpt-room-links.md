# Round 41 GPT — room link fixes

Status: in progress.

Assigned scope: change only the two broken room hrefs in `commons/lib/coop.mjs` and `commons/lib/ambassadorcharter.mjs`; place `commons/test/room-links.mjs` and the href edits on one Tier 2 branch. Run `node --test commons/test/room-links.mjs commons/test/site-links.mjs commons/test/page-meta.mjs` and record exact outcomes. No other source changes.

Target destinations and cause, per job: verify the room IDs and route behavior, then use `/r/income` and `/r/hardware-lab` if those are the matching working room URLs. Record before/after and limits after tests.
