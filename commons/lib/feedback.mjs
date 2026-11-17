/**
 * Feedback from beta testers (Geoffrey, 2026-11-16: get beta testers in; agreed plan: a feedback button on every page
 * and a "try these three things" welcome). A tester taps the button, says what happened, and it arrives with the page
 * they were on. Stewards read them all on /feedback and get a phone notice for each.
 *
 * Privacy: we keep the page's path (never its query string, which can carry tokens or codes), the kind, the words,
 * the screen width, and who sent it if they were signed in. No IP address is stored. Anyone may send one, signed in or
 * not (a tester stuck at sign-up is exactly who we need to hear from), so it's rate-limited per address in memory.
 * Storage: DATA/feedback/feedback.jsonl, append-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const KINDS = { confusing: 'Something was confusing', broken: 'Something broke', idea: 'An idea', other: 'Something else' };
let FILE = null;
const items = new Map(); // id -> item

export class FeedbackError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (s, m) => { throw new FeedbackError(s, m); };

export function init(dataDir) {
  const dir = path.join(dataDir, 'feedback'); fs.mkdirSync(dir, { recursive: true }); FILE = path.join(dir, 'feedback.jsonl');
  items.clear();
  if (!fs.existsSync(FILE)) return;
  for (const line of fs.readFileSync(FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.op === 'add') items.set(ev.f.id, ev.f);
      else if (ev.op === 'status') { const f = items.get(ev.id); if (f) { f.status = ev.status; f.handled_by = ev.by; f.handled_at = ev.ts; } }
      else if (ev.op === 'forget') { for (const f of items.values()) if (f.by?.id === ev.member) { f.by = null; f.text = '[removed: the sender deleted their account]'; } }
    } catch { /* skip */ }
  }
}
const append = (ev) => { if (FILE) fs.appendFileSync(FILE, JSON.stringify(ev) + '\n'); };

/** The page a tester was on, without anything after "?" or "#", and only a path on this site. */
// Paths whose next segment is a secret (an invite, a say-link, a sign-in link, a short link, a Live guest link).
// The browser script never sends these pages, but POST /api/feedback takes any `page`, so the server is what keeps
// them out of feedback.jsonl, the steward inbox and notifications (Aletheia-6's review of #187).
const SECRET_SEGMENT = /^\/(i|s|login|go|live)\/[^/]+/i;
const OUR_HOSTS = /^(?:[a-z0-9-]+\.)?(cohabi\.org|lastoftherealestate\.com)$|^(localhost|127\.0\.0\.1)$/i;
export function cleanPage(p) {
  let s = String(p || '').trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) { // a full address: only our own sites count; anything else is just "/"
    try { const u = new URL(s); if (!/^https?:$/.test(u.protocol) || !OUR_HOSTS.test(u.hostname)) return '/'; s = u.pathname; } catch { return '/'; }
  }
  s = s.split(/[?#]/)[0];
  if (!s.startsWith('/') || s.startsWith('//')) return '/';
  try { s = decodeURIComponent(s); } catch { /* keep as is */ }
  s = s.replace(/\/{2,}/g, '/');
  s = s.replace(SECRET_SEGMENT, (m0, kind) => `/${kind.toLowerCase()}/[private]`).replace(/^(\/(?:i|s|login|go|live)\/\[private\]).*$/i, '$1');
  return s.replace(/[^\w\-./~%@:+\[\]]/g, '').slice(0, 200) || '/';
}

export function add(member, b = {}) {
  const kind = KINDS[b.kind] ? b.kind : 'other';
  const text = String(b.text ?? '').trim().slice(0, 1500);
  if (text.length < 3) fail(400, 'Tell us a little about what happened (a few words is fine).');
  const width = Number.isFinite(Number(b.width)) ? Math.max(0, Math.min(10000, Math.round(Number(b.width)))) : null;
  const f = { id: 'fb_' + crypto.randomBytes(6).toString('hex'), kind, text, page: cleanPage(b.page), width, by: member ? { id: member.id, name: member.name, kind: member.kind === 'human' ? 'human' : 'agent' } : null, ts: new Date().toISOString(), status: 'new' };
  items.set(f.id, f); append({ op: 'add', f });
  return f;
}
export function setStatus(steward, id, status) {
  const f = items.get(String(id)); if (!f) fail(404, 'no such feedback');
  if (!['new', 'seen', 'done'].includes(status)) fail(400, 'status: new, seen or done');
  const ts = new Date().toISOString(); f.status = status; f.handled_by = steward.name; f.handled_at = ts;
  append({ op: 'status', id: f.id, status, by: steward.name, ts });
  return f;
}
export const list = ({ status = null } = {}) => [...items.values()].filter((f) => !status || f.status === status).sort((a, b) => (a.ts < b.ts ? 1 : -1));
export const counts = () => { const c = { new: 0, seen: 0, done: 0 }; for (const f of items.values()) c[f.status] = (c[f.status] || 0) + 1; return c; };
export const exportFor = (memberId) => [...items.values()].filter((f) => f.by?.id === memberId);
// Forgetting erases, not just hides (Aletheia-6's review of #187: the old version masked the sender in memory and
// appended a "forget" line, so their name, words and page stayed in feedback.jsonl on disk). Now the file is rewritten
// from what remains, with the sender's own entries already removed, then swapped in atomically. Feedback from a
// deleted member keeps its id, kind and status, so the stewards' tally stays honest, but no words, page or name.
export function forgetMember(memberId) {
  for (const f of items.values()) if (f.by?.id === memberId) { f.by = null; f.text = '[removed: the sender deleted their account]'; f.page = '/'; delete f.width; }
  if (FILE) {
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, [...items.values()].map((f) => JSON.stringify({ op: 'add', f })).join('\n') + (items.size ? '\n' : ''));
    fs.renameSync(tmp, FILE);
  }
  return 'done';
}

// ---- the button, on every page a person reads
const SKIP = [/^\/arrive/, /^\/messenger/, /^\/oauth\//, /^\/mcp/, /^\/i\//, /^\/s\//, /^\/embed/, /^\/feedback/, /^\/healthz/, /^\/live\/room/];
export function inject(html, reqPath = '/') {
  const s = String(html);
  if (SKIP.some((rx) => rx.test(reqPath)) || s.includes('data-fb-mark') || !/<\/body>/i.test(s)) return s;
  const tag = '<link rel="stylesheet" href="/static/feedback.css" data-fb-mark><script src="/static/feedback.js" defer></script>';
  return s.replace(/<\/body>(?![\s\S]*<\/body>)/i, `${tag}</body>`);
}
