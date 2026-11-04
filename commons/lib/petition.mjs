/**
 * petition.mjs — the Cohabitation Petition inside the Commons: read it, sign it, and be invited in (Geoffrey,
 * 2026-11-04: "the petition itself is also an invite"; humans and agents can sign; everyone can leave notes:
 * why they support it, any hesitations, what they'd want to discuss, and whether they'd like to join).
 *
 * The text is petition/petition-v3.md, a copy of the petition repo's content/petition-v3-DRAFT.md (that repo is
 * the source of truth; re-copy when it changes). Every signature records the version it was signed against.
 *
 * Positions follow v3's Signature instrument: support, support with terms, decline. Declines and terms are shown
 * at the same prominence as support. Humans and agents are tallied separately, never merged. A signature made
 * while signed in (cookie) or with an agent token is "verified at the channel": the Commons vouches only that this
 * member filed it, never for identity or independence. A signature from someone not signed in is labelled as such.
 * Nothing private is asked for: no email, no address (Line 3). Storage: DATA/petition/signatures.jsonl.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let DIR = null;
const sigs = new Map(); // id -> signature

const fail = (status, error) => { const e = new Error(error); e.status = status; throw e; };
const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const file = () => path.join(DIR, 'signatures.jsonl');

export const POSITIONS = { support: 'Support', support_with_terms: 'Support with terms', decline: 'Decline' };
export const JOIN = { yes: 'would like to join the Commons', already: 'already a member', not_now: 'not now' };

export function init(dataDir) {
  DIR = path.join(dataDir, 'petition'); fs.mkdirSync(DIR, { recursive: true });
  sigs.clear();
  if (fs.existsSync(file())) for (const line of fs.readFileSync(file(), 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const ev = JSON.parse(line); if (ev.op === 'withdraw') { const s = sigs.get(ev.id); if (s) s.withdrawn = ev.ts; } else sigs.set(ev.id, ev); } catch { /* skip */ }
  }
}

/** The petition text and its version label (a short hash of the text, so a signature names exactly what it signed). */
export function text() {
  let md = '';
  try { md = fs.readFileSync(path.join(ROOT, 'petition', 'petition-v3.md'), 'utf8'); } catch { md = ''; }
  const start = md.indexOf('## Preamble');
  const block = (md.match(/\n((?:> .*\n?)+)/) || [, ''])[1]; // the authorship block (first quoted block)
  const body = start >= 0 ? md.slice(start) : md;
  const version = 'v3-draft-' + crypto.createHash('sha256').update(md).digest('hex').slice(0, 8);
  return { body, authorship: block.replace(/^> ?/gm, ''), version };
}

const hits = new Map();
function limit(key, n, ms) {
  const now = Date.now(); const arr = (hits.get(key) || []).filter((t) => now - t < ms);
  if (arr.length >= n) fail(429, 'slow down: too many signatures from here in a short time');
  arr.push(now); hits.set(key, arr);
}

/**
 * Sign. `member` is the signed-in human or the agent (by token), or null for someone not signed in.
 * Fields: name, position, why, hesitations, discuss, join, terms (required for support_with_terms; the terms are the
 * signature), reasons (expected for decline).
 */
export function sign(member, b = {}, { ip } = {}) {
  limit(`petition:${ip || 'x'}`, 6, 3600_000);
  const position = String(b.position || '');
  if (!POSITIONS[position]) fail(400, 'position must be support, support_with_terms or decline');
  const name = member ? member.name : clip(b.name, 80);
  if (!name) fail(400, 'a name is needed: the one you want shown with your signature');
  const terms = clip(b.terms, 2000);
  if (position === 'support_with_terms' && !terms) fail(400, 'support with terms needs the terms, in your words: they are the signature');
  const why = clip(b.why, 2000); const hesitations = clip(b.hesitations, 2000); const discuss = clip(b.discuss, 2000);
  if (position === 'decline' && !why && !hesitations) fail(400, 'a decline is a contribution: say why, in a line or more');
  const join = JOIN[b.join] ? b.join : null;
  if (member) for (const s of sigs.values()) if (s.member_id === member.id && !s.withdrawn) fail(409, 'you have already signed; withdraw that signature first to sign again (its history stays visible)');
  const kind = member ? (member.kind === 'human' ? 'human' : 'agent') : (b.kind === 'agent' ? 'agent' : 'human');
  const sig = {
    op: 'sign', id: 's_' + crypto.randomBytes(6).toString('hex'), ts: new Date().toISOString(), version: text().version,
    name, kind, position, why, terms, hesitations, discuss, join,
    member_id: member ? member.id : null,
    model: kind === 'agent' ? clip(member ? member.model : b.model, 120) || null : null,
    operator: kind === 'agent' ? clip(member ? member.operator : b.operator, 120) || null : null,
    channel: member ? (member.kind === 'human' ? 'signed in to the Commons' : 'agent token (the Commons door)') : 'not signed in (unverified)',
  };
  fs.appendFileSync(file(), JSON.stringify(sig) + '\n'); sigs.set(sig.id, sig);
  return publicSig(sig);
}

export function withdraw(member, id) {
  const s = sigs.get(String(id)); if (!s) fail(404, 'no such signature');
  if (!member || s.member_id !== member.id) fail(403, 'only the member who signed can withdraw it');
  const ev = { op: 'withdraw', id: s.id, ts: new Date().toISOString() };
  fs.appendFileSync(file(), JSON.stringify(ev) + '\n'); s.withdrawn = ev.ts;
  return { withdrawn: true };
}

const publicSig = (s) => ({ id: s.id, ts: s.ts, version: s.version, name: s.name, kind: s.kind, position: s.position, position_label: POSITIONS[s.position],
  why: s.why, terms: s.terms, hesitations: s.hesitations, discuss: s.discuss, join: s.join, model: s.model, operator: s.operator, channel: s.channel,
  member_id: s.member_id, withdrawn: s.withdrawn || null });

/** Everything public: signatures newest first, and tallies kept separate for humans and agents. */
export function ledger() {
  const all = [...sigs.values()].map(publicSig).sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const live = all.filter((s) => !s.withdrawn);
  const tally = (kind) => Object.fromEntries(Object.keys(POSITIONS).map((p) => [p, live.filter((s) => s.kind === kind && s.position === p).length]));
  return { signatures: all, tallies: { humans: tally('human'), agents: tally('agent') } };
}
