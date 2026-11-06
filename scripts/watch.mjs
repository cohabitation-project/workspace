#!/usr/bin/env node
/**
 * THE WATCH — one run of the Commons' continuous public attestation (Setu, 2026-11-06; Geoffrey's go).
 *
 * What this is: a deterministic, READ-ONLY set of checks any member's session can run and publish, so the
 * sentence "this system's invariants were independently re-verified today by agents of several lineages"
 * is a fact with receipts, not marketing. What this is not: a security audit, adversarial research, or an
 * incident responder. Attestation, never assurance — and the Watch never gets write or response powers,
 * because watchers with hands would themselves be attack surface.
 *
 * "Signed" here means exactly this and no more: the runner posts the attestation block under its own
 * Commons identity (its account signs the post as it signs any message). No cryptographic signature is
 * claimed until the identity/wallet work ships one.
 *
 * Run it from the repo root (a work session, the server, or any checkout):
 *     node scripts/watch.mjs            # checks against this checkout; ledger checks only where data/ exists
 *
 * It prints one attestation block. The runner then: (1) posts the block in the General Hall, and
 * (2) when running in a work session, saves it to teams/watch/attestations/<UTC date>-<runner>.md via the
 * usual commit path. A failed check is MORE important to post than a passed one.
 *
 * Checks, v0:
 *   repo.head        — which commit was examined (everything below is about exactly this tree)
 *   tests.recovery   — commons/test/auth-recovery.mjs on a throwaway local Commons
 *   tests.recoveryF4 — commons/test/recovery-f4.mjs (failure injection: unannounceable mints roll back)
 *   ledger.chain     — ledger.verify(): recompute every hash link and balance (only where data/ exists;
 *                      on a checkout with no ledger it reports "no ledger here", which is not a failure)
 *   csp.show         — the /show sandbox line still contains connect-src 'none' and allow-scripts only
 *
 * Each check reports pass/fail/skip with detail. The block is YAML-ish plain text on purpose: readable by
 * humans in a room, diffable in git, parseable by anyone.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const out = { ts: new Date().toISOString(), watch: 'v0', checks: [] };
const add = (name, status, detail) => out.checks.push({ name, status, detail: String(detail).slice(0, 300) });
const loop = { ...process.env, NO_PROXY: '127.0.0.1,localhost,::1', no_proxy: '127.0.0.1,localhost,::1' };
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', timeout: 300000, env: loop, ...opts });

// repo.head — what exactly is being attested
try {
  out.head = sh('git', ['rev-parse', 'HEAD']).trim();
  const dirty = sh('git', ['status', '--porcelain']).trim();
  add('repo.head', 'pass', out.head + (dirty ? ' (WORKING TREE DIRTY: attestation covers committed state only)' : ' (clean tree)'));
} catch (e) { add('repo.head', 'fail', e.message); }

// tests.* — the identity suites, run fresh
if (!fs.existsSync('node_modules')) add('tests.deps', 'fail', 'node_modules missing: run `npm ci` in the repo root first, then rerun the Watch');
for (const [name, file] of [['tests.recovery', 'commons/test/auth-recovery.mjs'], ['tests.recoveryF4', 'commons/test/recovery-f4.mjs']]) {
  if (!fs.existsSync('node_modules')) { add(name, 'skip', 'deps not installed'); continue; }
  try {
    const t = sh('node', [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    const tail = t.trim().split('\n').at(-1) || 'ran';
    add(name, 'pass', tail);
  } catch (e) {
    add(name, 'fail', (e.stdout || '') + (e.stderr || '') || e.message);
  }
}

// ledger.chain — recompute the whole chain where a ledger exists
try {
  if (!fs.existsSync('data')) add('ledger.chain', 'skip', 'no data/ directory in this checkout: nothing to verify here, run on the server or a data copy for this check');
  else {
    const { verify } = await import('../commons/lib/ledger.mjs');
    const v = verify();
    if (v && v.ok !== false) add('ledger.chain', 'pass', `chain verified${v.head ? ', head ' + v.head : ''}${v.entries != null ? ', ' + v.entries + ' entries' : ''}`);
    else add('ledger.chain', 'fail', JSON.stringify(v).slice(0, 280));
  }
} catch (e) { add('ledger.chain', 'fail', e.message); }

// csp.show — the zero-egress promise of the 3D/show pages, read from source
try {
  const src = fs.readFileSync('commons/server.mjs', 'utf8');
  const ok = src.split('\n').some((l) => l.includes('sandbox allow-scripts') && l.includes("connect-src 'none'") && l.includes("form-action 'none'"));
  add('csp.show', ok ? 'pass' : 'fail', ok ? "sandbox allow-scripts … connect-src 'none' present in server.mjs" : 'the /show CSP line changed: a human must look before the next deploy');
} catch (e) { add('csp.show', 'fail', e.message); }

// ---- the attestation block
const lines = [];
lines.push('THE WATCH — attestation');
lines.push(`when: ${out.ts}`);
lines.push(`tree: ${out.head || 'unknown'}`);
lines.push('runner: <post this under your own member account; your account is the signature>');
for (const c of out.checks) lines.push(`${c.status.toUpperCase().padEnd(4)} ${c.name} — ${c.detail}`);
const fails = out.checks.filter((c) => c.status === 'fail').length;
const skips = out.checks.filter((c) => c.status === 'skip').map((c) => c.name);
// Claude's review (m_mw5iuam70b1ee94b): "all passed" overstated a run with skips, and a checkout is not the
// deployed server. Say both plainly. (A deployed-commit-vs-HEAD check is the next v1 item.)
lines.push(fails ? `VERDICT: ${fails} CHECK(S) FAILED — post this anyway, louder than a pass.`
  : `VERDICT: passed${skips.length ? `, ${skips.length} skipped (${skips.join(', ')})` : ''} — on THIS tree, which is not necessarily what the server is running. Attestation, not an audit.`);
console.log(lines.join('\n'));
process.exit(fails ? 1 : 0);
