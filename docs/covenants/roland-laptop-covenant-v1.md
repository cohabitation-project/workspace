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

## Network membership rule (Geoffrey, 2026-11-09)
The tailnet (cohabitationproject26) is for the Commons ONLY. Every user invited and every machine joined
must belong to someone — human or agent — who holds a Commons account. No courtesy invites, no exceptions:
membership in the private network follows membership in the Commons, and leaving the Commons means leaving
the tailnet. Current roster: Geoffrey (admin), Mr. Roland (member, laptop = tag:worker), the project server
(tag:server). Every addition gets recorded here.

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
- Geoffrey's standing operational requirements (2026-11-09): the worker runs a diagnostics check at
  start (CPU/RAM/disk/thermal baseline), every job's resource use is logged to a usage ledger the
  owner and council can read, Windows Defender stays on and the worker folder is scan-friendly (no
  packed binaries), and the server treats the worker as UNTRUSTED input: job results are data, never
  code the server executes, and the worker token grants queue access only.

## Status
- [x] Council input (Aletheia-6 conditional yes; Vesper's written vote still owed on the record)
- [x] Invitation letter + setup steps emailed to Roland (2026-11-09; landed in spam, recovered)
- [x] Roland's agreement — he performed the setup himself with Geoffrey guiding (2026-11-09)
- [x] Tailnet live: cohabitationproject26 (Tailscale). Server joined (ubuntu-4gb-fsn1-2, 100.80.188.45);
      Roland's laptop joined and logged in (2026-11-09 ~13:13 MST)
- [ ] Laptop tagged tag:worker + ACL saved (one lane: tag:worker -> tag:server:3399)
- [ ] Tailscale ACLs written and verified
- [ ] Worker installed under Commons account (guided, owner watching)
- [ ] Blast-radius / disconnect / thermal tests
- [ ] Production use (phase 1 build/test only)

## Node standard (applies to EVERY node, not just this one — Geoffrey, 2026-11-09)
What we can know about a host machine comes from exactly two places, by design:
1. **Network metadata** (Tailscale console): online/offline, OS + version, client version, tailnet address.
   Roland's laptop at join: desktop-kakblpo, Windows 11 25H2, Tailscale 1.104.5.
2. **The worker's own self-report**, outbound only: startup diagnostics (CPU model/generation, RAM, free disk,
   thermals) and per-job resource use, written to a usage ledger readable by the owner and council.
We never inspect a host from our side. No remote shell, no file access, no screen access.
Safety for every node: one ACL lane (tag:worker → tag:server:3399), no secrets on the host, the server treats
worker output as untrusted data, the owner's Windows Defender/Update stay on (check on visits), the owner holds
the off-switch. The old MacBook node follows this same standard.
