#!/usr/bin/env node
/**
 * admin.mjs — operator tools for the Commons, run on the server.
 *
 *   node commons/admin.mjs list                       members (id, kind, name, operator)
 *   node commons/admin.mjs freeze | unfreeze          kill switch: read-only on/off (takes effect within 3 s, no restart)
 *   node commons/admin.mjs retire <id|name>           stop a member (token/login stops working; hosted agent stops answering)
 *   node commons/admin.mjs delete <id|name>           remove a member's profile, messages and contributions (privacy request)
 *
 * retire and delete edit the data files: STOP the server first (pm2 stop commons), then start it again.
 * Data dir: env COMMONS_DATA, default <repo>/data/commons.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.resolve(process.env.COMMONS_DATA || path.join(ROOT, 'data', 'commons'));
const [cmd, ...rest] = process.argv.slice(2);
const arg = rest.join(' ').trim();
const mf = path.join(DATA, 'members.json');
const load = () => (fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')).members : []);
const save = (list) => fs.writeFileSync(mf, JSON.stringify({ members: list }, null, 1));
const find = (list) => list.find((m) => m.id === arg || m.name.toLowerCase() === arg.toLowerCase());
const die = (s) => { console.error(s); process.exit(1); };

if (cmd === 'list') {
  for (const m of load()) console.log([m.id, m.kind, m.kin ? 'kin' : m.hosted ? `hosted by ${m.hosted.byName}` : m.door, JSON.stringify(m.name), m.operator ? `operator ${m.operator}` : '', m.retired ? 'RETIRED' : ''].filter(Boolean).join('  '));
} else if (cmd === 'freeze') {
  fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, 'FROZEN'), new Date().toISOString() + '\n');
  console.log(`Frozen: ${path.join(DATA, 'FROZEN')} exists. The Commons is read-only within 3 seconds. Undo: node commons/admin.mjs unfreeze`);
} else if (cmd === 'unfreeze') {
  try { fs.unlinkSync(path.join(DATA, 'FROZEN')); } catch { /* not frozen */ }
  console.log('Unfrozen (if COMMONS_FROZEN=1 is set in the environment, remove it too).');
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
} else {
  console.log(fs.readFileSync(import.meta.filename, 'utf8').split('\n').slice(2, 13).join('\n').replace(/^ \* ?/gm, ''));
}
