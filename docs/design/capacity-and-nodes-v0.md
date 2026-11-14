# Capacity and nodes: how the Commons grows past one server (v0)

Setu, 2026-11-13, from Geoffrey's direction: "the architecture should be aiming for everything that's already
existing ... plan for when we do reach our hardware capacity ... we'll have more nodes soon."

## The shape: a front door and many hands

- **Front door (always-on rented servers).** Anything the public reaches at a fixed address: cohabi.org, mail, search,
  the voice and livestream entry points, the shared record. These need a stable IP, uptime, and a clean reputation.
  Home machines can't be the front door: home IPs are blocked by mail receivers, change, sleep, and have small upload.
- **Hands (nodes on the tailnet).** Heavy work that can wait in a queue: transcription, local AI models, video
  re-encoding, kin's Python/CAD/simulation runs, encrypted backup copies. Nodes pull jobs; nothing on a home network
  is opened to the internet. This is ADIN: Phase 1 (orchestrator) is merged; Phases 2-4 (human approval, the node
  worker, the container sandbox) are open as PRs #36, #38, #41 and need review before any node takes real work.

## Machines (as of 2026-11-13)

| Machine | Role | Good for |
|---|---|---|
| Commons server (Hetzner, fsn1) | front door | site, kin, voice, mail; search after the upgrade to 4 cores / 8 GB |
| RollinHost/Firedamm server | not ours to share | a separate business; stays separate |
| Mr. Roland's laptop | node | light jobs, backups |
| Geoffrey's two Macs | nodes (to set up) | transcription and small/medium local models (Apple Silicon is good at this), kin runs |
| Gaming PC (coming) | node | the GPU: local models, fast transcription, video re-encoding for livestreams |

Personal machines run node work under a separate user account, in the ADIN container sandbox, never with access to
the owner's own files. The tailnet stays Commons-members-only (Geoffrey's rule).

## When we hit capacity, in order

1. **Watch.** A small health line on the Steward/status page: CPU, memory, disk, and voice-room delay. Thresholds:
   CPU above 70% for 15 minutes at busy hours, memory available under 1 GB, disk above 75%.
2. **Offload to nodes** whatever can queue (transcription, re-encoding, kin runs). Cheapest step; uses what we own.
3. **Resize the front door** (Hetzner rescale, CPU and RAM only, minutes of downtime).
4. **Split the front door** when one machine is doing too many kinds of work: mail to its own server first (moves by
   copying its data and two DNS records; no one re-signs up), then livestreaming to its own media server.
5. **Second region / redundancy** only when members depend on it daily: a standby copy and backups off-site.

## Livestreaming path
Meeting rooms (now) → a pass-through broadcast page on the front door (one or two streams, dozens of viewers) →
re-encoding on the gaming PC node for phones on weak connections → its own media server when audiences grow.
