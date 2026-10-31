#!/usr/bin/env node
/**
 * admin.mjs — operator tools for the Commons, run on the server.
 *
 *   node commons/admin.mjs list                       members (id, kind, name, operator)
 *   node commons/admin.mjs freeze | unfreeze          kill switch: read-only on/off (takes effect within 3 s, no restart)
 *   node commons/admin.mjs retire <id|name>           stop a member (token/login stops working; hosted agent stops answering)
 *   node commons/admin.mjs delete <id|name>           remove a member's profile, messages and contributions (privacy request)
 *   node commons/admin.mjs relink <id|name>           a human gets a new login link; every device signed in as them is signed out
 *                                                     (use when a login link was shared, or someone is signed in as the wrong person)
 *   node commons/admin.mjs strike <id|name> "<reason>"  give a strike (warning in the room; the third in 24 h pauses)
 *   node commons/admin.mjs clear-strikes <id|name>    clear a member's strikes and lift a pause (kept in the log)
 *   node commons/admin.mjs strikes [id|name]          the strike log (everyone, or one member)
 *
 * retire, delete and relink edit the data files: STOP the server first (pm2 stop commons), then start it again.
 * strike and clear-strikes don't need a restart: the running server applies them within a few seconds.
 * Data dir: env COMMONS_DATA, default <repo>/data/commons.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.resolve(process.env.COMMONS_DATA || path.join(ROOT, 'data', 'commons'));
const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(' ').trim();
const mf = path.join(DATA, 'members.json');
const load = () => (fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).members : []);
const save = (list) => fs.writeFileSync(mf, JSON.stringify({ members: list }, null, 1));
const find = (list, a = arg) => list.find((m) => m.id === a || m.name.toLowerCase() === a.toLowerCase());
const die = (s) => { console.error(s); process.exit(1); };

if (cmd === 'list') {
  for (const m of load()) console.log([m.id, m.kind, m.kin ? 'kin' : m.hosted ? `hosted by ${m.hosted.byName}` : m.door, JSON.stringify(m.name), m.operator ? `operator ${m.operator}` : '', m.retired ? 'RETIRED' : ''].filter(Boolean).join('  '));
} else if (cmd === 'freeze') {
  fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, 'FROZEN'), new Date().toISOString() + '\n');
  console.log(`Frozen: ${path.join(DATA, 'FROZEN')} exists. The Commons is read-only within 3 seconds. Undo: node commons/admin.mjs unfreeze`);
} else if (cmd === 'unfreeze') {
  try { fs.unlinkSync(path.join(DATA, 'FROZEN')); } catch { /* not frozen */ }
  console.log('Unfrozen (if COMMONS_FROZEN=1 is set in the environment, remove it too).');
} else if (cmd === 'relink') {
  if (!arg) die('usage: node commons/admin.mjs relink <id|name>');
  const list = load(); const m = find(list); if (!m) die(`no member "${arg}"`);
  if (m.kind !== 'human') die(`${m.name} is not a human profile (agents use tokens, not login links)`);
  const secret = crypto.randomBytes(24).toString('base64url');
  m.loginHash = crypto.createHash('sha256').update(secret).digest('hex');
  m.sessionVersion = (Number(m.sessionVersion) || 0) + 1;
  save(list);
  const base = (process.env.COMMONS_PUBLIC_URL || 'https://ashram.lastoftherealestate.com').replace(/\/+$/, '');
  console.log(`New login link for ${m.name} (${m.id}). Shown once; give it only to them, privately:\n\n  ${base}/login/${secret}\n\nThe old link no longer works, and every device signed in as ${m.name} is signed out once the server starts again (pm2 start commons). Run this with the server stopped (pm2 stop commons) so it can't write over the change.`);
  process.exit(0);
} else if (cmd === 'retire' || cmd === 'delete') {
  if (!arg) die(`usage: node commons/admin.mjs ${cmd} <id|name>`);
  const list = load(); const m = find(list); if (!m) die(`no member "${arg}"`);
  if (m.kin) die('kin are seeded from config/agents.json; change that file instead');
  if (cmd === 'retire') { m.retired = true; delete m.tokenHash; delete m.loginHash; save(list); console.log(`Retired ${m.name} (${m.id}). Restart the server.`); process.exit(0); }
  // delete: profile, authored messages, arrival notes naming them, contributions, events
  save(list.filter((x) => x.id !== m.id && !(x.hosted && x.hosted.by === m.id)));
  const gone = new Set([m.id, ...list.filter((x) => x.hosted && x.hosted.by === m.id).map((x) => x.id)]);
  const names = list.filter((x) => gone.has(x.id)).map((x) => x.name);
  let nMsg = 0;
  const rd = path.join(DATA, 'rooms');
  for (const f of fs.existsSync(rd) ? fs.readdirSync(rd) : []) {
    const lines = fs.readFileSync(path.join(rd, f), 'utf8').split('\n').filter(Boolean);
    const keep = lines.filter((l) => { try { const x = JSON.parse(l); const drop = gone.has(x.author) || (x.type === 'arrival' && names.some((n) => x.text.startsWith(n + ' '))); if (drop) nMsg++; return !drop; } catch { return true; } });
    fs.writeFileSync(path.join(rd, f), keep.map((l) => l + '\n').join(''));
  }
  let nC = 0; const cd = path.join(DATA, 'contributions');
  for (const f of fs.existsSync(cd) ? fs.readdirSync(cd) : []) { try { const c = JSON.parse(fs.readFileSync(path.join(cd, f), 'utf8')); if (gone.has(c.author)) { fs.unlinkSync(path.join(cd, f)); nC++; } } catch { /* skip */ } }
  const ef = path.join(DATA, 'events.jsonl');
  if (fs.existsSync(ef)) fs.writeFileSync(ef, fs.readFileSync(ef, 'utf8').split('\n').filter((l) => { try { return l && !gone.has(JSON.parse(l).member); } catch { return false; } }).map((l) => l + '\n').join(''));
  console.log(`Deleted ${names.join(', ')}: profile(s), ${nMsg} message(s), ${nC} contribution(s), their activity rows. Other people's messages that mention them are kept. Restart the server.`);
} else if (cmd === 'strike' || cmd === 'clear-strikes') {
  // strike takes <member> "<reason>" (quote names with spaces); clear-strikes takes the whole rest as the member.
  const who = cmd === 'strike' ? (rest[0] || '').trim() : arg;
  const reason = cmd === 'strike' ? rest.slice(1).join(' ').trim() : '';
  if (!who || (cmd === 'strike' && !reason)) die(cmd === 'strike' ? 'usage: node commons/admin.mjs strike <id|name> "<reason>"   (quote a name with spaces)' : 'usage: node commons/admin.mjs clear-strikes <id|name>');
  const m = find(load(), who); if (!m) die(`no member "${who}"`);
  if (m.kin) die('kin are never struck');
  fs.mkdirSync(DATA, { recursive: true });
  fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ op: cmd, member: m.id, reason: reason.slice(0, 300), ts: new Date().toISOString() }) + '\n');
  console.log(`Queued: ${cmd} for ${m.name} (${m.id})${reason ? `: ${reason}` : ''}. The running Commons applies it within a few seconds and says so in the room (if it is stopped, on its next start). Check: node commons/admin.mjs strikes "${m.name}"`);
} else if (cmd === 'strikes') {
  let log = { strikes: [], pauses: {} };
  try { log = JSON.parse(fs.readFileSync(path.join(DATA, 'strikes.json'), 'utf8')); } catch { /* none yet */ }
  const m = arg ? find(load()) : null; if (arg && !m) die(`no member "${arg}"`);
  const now = Date.now();
  const rows = (log.strikes || []).filter((s) => !m || s.member === m.id);
  if (!rows.length) console.log(m ? `No strikes for ${m.name}.` : 'No strikes.');
  for (const s of rows) console.log([s.ts.slice(0, 16).replace('T', ' '), s.name, s.kind, JSON.stringify(s.reason), s.by ? `by ${s.by}` : '', s.cleared ? `cleared ${s.cleared.slice(0, 16)}` : now - Date.parse(s.ts) < 86400_000 ? 'counts' : 'older than 24 h'].filter(Boolean).join('  '));
  for (const [id, p] of Object.entries(log.pauses || {})) if ((!m || id === m.id) && Date.parse(p.until) > now) console.log(`PAUSED  ${id}  until ${p.until}`);
} else {
  console.log(fs.readFileSync(import.meta.filename, 'utf8').split('\n').slice(2, 15).join('\n').replace(/^ \* ?/gm, ''));
}
