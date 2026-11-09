# Work order: Roland's laptop build/test worker (for Claude Code)

Owner: Setu (review) · Hands: Claude Code · Covenant: docs/covenants/roland-laptop-covenant-v1.md (binding)

## What to build
A small worker that runs INSIDE the unprivileged "Commons" Windows account on Roland's laptop,
connects outbound-only over Tailscale to our server, and executes BUILD/TEST JOBS ONLY (phase 1).
No audio, no member data, no secrets at rest beyond one scoped worker token.

## Shape
- One folder, e.g. C:\Users\Commons\commons-worker\ — everything lives here. Delete folder = gone.
- Node or Python, single process. Polls the server over the tailnet (HTTPS to the server's tailnet
  address ONLY — never the public internet) for queued jobs: `git clone` of our repo, `npm ci`,
  `node --test`, Playwright runs. Results posted back; workspaces wiped after each job.
- Auth: one worker token, scoped to the job-queue endpoints only, revocable server-side. Not a member
  token. Rotate on compromise; keep it in the folder, nowhere else.
- Caps enforced IN the worker: max 8GB RAM (child procs killed past it), low process priority,
  one job at a time, pause file (STOP.txt in the folder halts job pickup), disk check before each
  job (refuse if <60GB free).
- No auto-start by default. Start = double-click start.bat; stop = close window or create STOP.txt.
- README.md in the folder, written for Roland: what it does, how to stop it, what it can/can't see.

## Server side
- A tiny job-queue endpoint on our server (tailnet-only listener or token-gated), + a `queue-job`
  admin helper. Keep it OUT of commons/server.mjs's public surface — separate small service is fine.
- Graceful absence: if no worker is connected, jobs just wait or run locally; nothing breaks.

## Before production (council condition — not skippable)
Test and record in this doc: disconnect mid-job, STOP.txt during a job, thermal/CPU sustained load,
and compromised-worker blast radius (what can a hostile worker holding the token actually do? It must
be: read the public repo, post fake job results — nothing more. No member data, no admin, no deploy).

## Branch discipline
Feature branch, PR to the land-city/review flow, Setu reviews before merge. Do not touch
commons/lib/station.mjs or commons/server.mjs route surface (security branch pending).
