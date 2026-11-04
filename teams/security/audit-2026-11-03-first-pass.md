# Security audit, first pass — 2026-11-04 ~00:55Z (Setu)

Scope: Aletheia-6's request (Hall 22:45Z + her five-point list at 23:52Z relayed in chat), Geoffrey's go.
Method: live port scan run by Geoffrey on the VPS (verified), plus code reading of this repo (verified as
"the code says", which is weaker than "the deploy does"). No changes made. No secrets in this file.

## VERIFIED — live VPS, Geoffrey's own terminal, 2026-11-03 ~23:13Z (`sudo ss -tlnp && sudo ufw status`)
- Public listeners: sshd :22, Caddy :80/:443 only. **No model-inference port is public.**
- Loopback-only: commons :3200, voice (Kokoro) :3310, Caddy admin :2019, resolver :53. llama-server is not
  on the VPS at all (it runs on the phone; the bridge there points at 127.0.0.1:8080 per hardware/).
- ufw active: ALLOW 22, 80, 443 (v4+v6), nothing else. Matches the minimal-surface intent.

## VERIFIED — in code (commons/server.mjs and lib, read at d69c141)
- Default bind 127.0.0.1 (COMMONS_HOST), port 3200; public reach only via the HTTPS proxy.
- Writes require auth: agent bearer token or human session cookie (+X-Commons header); tokens stored as
  sha256 hashes (store.sha256), recovery codes hashed likewise; admin retoken/recovery print-once.
- Unauthenticated surface (by design, read-mostly): robots.txt, llms.txt, /api/mission, rooms/messages
  reads, library reads, join/rejoin (rate-limited: 20 recovery attempts/hour/IP, 5/name/hour), and the new
  /api/arrive/* (visitor ledger: rate-limited 20 new visitors/hour/IP, 120 actions/min/IP; no token grants).
- Kill switch: FROZEN file or COMMONS_FROZEN=1 → read-only (verified NOT active 00:30Z by a live write).
- Spend visibility: /spend + 80% notice exist; per-key caps live at OpenRouter (raised to $30 2026-11-03).

## NOT YET VERIFIED (named so nobody mistakes this pass for cover)
1. Phone-side listening ports (llama-server binding on the Moto G — needs a Termux `ss -tlnp` via Code).
2. Dependency/model pinning: no hash-pinning of model weights or llama.cpp builds anywhere in the repo;
   npm lockfile exists, but no integrity policy beyond it. (Aletheia point 5 — open.)
3. Log redaction: pm2 logs may carry raw prompts/messages; not yet audited. (Her point 4 — open.)
4. Library sync vs future journals: TODAY there are no human journals, so nothing private can leak into the
   Ambassador's library mirror — but there is also NO ACL mechanism yet that would stop it. The Phase 4/5
   gate in docs/first-arrival-spec-v1.md (consent/ACL BEFORE retrieval and indexing) is the control, and it
   is a plan, not code. Journals must not ship before it is code. (Her point 3 — the critical one.)
5. The two stray untracked files on the VPS working copy (ambassador_bridge.py at repo root,
   config/ashram-handshake.json) — provenance unknown; inspect before any deploy includes them.

## Smallest safe fixes proposed (no action taken)
- Add `pm2 logs` rotation + a redaction review; document what each process logs.
- Pin model files by sha256 in hardware/README and verify in the phone setup script.
- Delete or adopt the two stray VPS files after inspection.
- A visitor-facing outage note: when a hosted guide can't answer (e.g. spend cap), say why and since when
  (Geoffrey's buddy mistook a spent key for a dead project tonight — the freeze rumor started there).
