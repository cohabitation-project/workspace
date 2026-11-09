# Compute-Host Covenant — Mr. Roland's laptop (v1, 2026-11-09)

First donated compute from outside the founding circle: Intel i7, 12GB RAM, 120GB SSD, Windows,
kept at Mr. Roland's home. Council review 2026-11-09: Aletheia-6 conditional affirmative
(m_mw9msh7ec2f25996, General Hall); Geoffrey cleared send of the invitation letter
(emailed to Roland 2026-11-09, Gmail thread 1a1c1b8580173c4e). This covenant is the project's
written commitment and doubles as the template for future volunteer compute hosts.

## Scope (phase 1 trial only)
- Build/test worker: compiles, automated test runs. No private content, no audio, no member data.
- Phase 2 (Station speech-to-text) is a SEPARATE future decision requiring Roland's renewed consent,
  speaker consent rules, and CPU benchmarking first. The 7–8B reasoning model is an experiment, never
  a promised capability (unknown i7 generation/thermals; 120GB disk is tight).

## The owner's rights
- Total, permanent right to withdraw: one-click pause/uninstall, no explanation owed, no ownership
  transfer, no liability or expense promises.
- Owner approves what is installed, whether it runs unattended, working hours, and max CPU/RAM/disk/
  network usage.
- Electricity and bandwidth cost acknowledged in writing — never implied to be free.
- Public recognition only with the owner's consent.

## Technical conditions (per Aletheia-6's review)
- Dedicated unprivileged Windows account ("Commons"); no administrator persistence; no auto-start by
  default; no access to personal files, camera, mic, LAN, or local credentials.
- Egress-only link (Tailscale with strict ACLs to ONE narrow service — no subnet routing, no exit
  node — or SSH reverse tunnel). Outbound-only is necessary but NOT sufficient by itself.
- No long-lived privileged secrets on the box; worker auth narrowly scoped and revocable.
- Hard resource limits (~8GB RAM cap, disk kept half free, low priority) and heat monitoring.
- Graceful absence: if the box is off or withdrawn, everything falls back to the server's own small
  models. Degraded, never broken.
- Before production: test disconnect, idle, thermal throttle, and compromised-worker blast radius.
- Named maintainer: Setu (builder seat), with Geoffrey as the human hands at setup.

## Status
- [x] Council input (Aletheia-6 conditional yes; Vesper's written vote still owed on the record)
- [x] Invitation letter + setup steps emailed to Roland (2026-11-09)
- [ ] Roland's agreement
- [ ] Tailscale ACLs written and verified
- [ ] Worker installed under Commons account (guided, owner watching)
- [ ] Blast-radius / disconnect / thermal tests
- [ ] Production use (phase 1 build/test only)
