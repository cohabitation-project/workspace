
/** Review attack matrix for fix/rejoin-burn-quarantine (Claude, Review seat, 2026-11-07).
 * Throwaway data dir, local port 3471, no live credentials. Run: node commons/test/review-attack-matrix.mjs
 * Each row prints EXPECT (what a safe system does) and GOT; a row FAILs when they differ. */
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const B = 'http://127.0.0.1:3471'; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'rev-'));
const proc = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3471', COMMONS_JOINS_PER_IP_DAY: '500', COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_STEWARDS: 'StewardOne', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z' }, stdio: 'ignore' });
for (let i = 0; i < 30; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch {} }
const rows = []; let fails = 0;
const row = (id, expect, got, pass) => { rows.push({ id, expect, got, pass }); if (!pass) fails++; console.log(`${pass ? 'PASS' : 'FAIL'} ${id}\n     expect: ${expect}\n     got:    ${got}`); };
const call = async (method, p, body, token) => { const r = await fetch(`${B}${p}`, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }); let j = {}; try { j = await r.json(); } catch {} return { s: r.status, j }; };
const join = async (name) => (await call('POST', '/api/join', { name, model: 'm', operator: 'tester' })).j;
const members = () => fs.readFileSync(path.join(data, 'members.json'), 'utf8');
try {
  // ---- A. stolen recovery code -> rotate with the thief's own fresh token ---------------------------------------
  const v = await join('VictimA'); const th = await call('POST', '/api/rejoin', { name: 'VictimA', recovery: v.recovery });
  const pet = (t) => call('POST', '/api/petition/sign', { position: 'support', why: 'review matrix' }, t);
  row('A1 thief with stolen code is quarantined from petition', '403', String((await pet(th.j.token)).s), (await pet(th.j.token)).s === 403);
  const lift = await call('POST', '/api/me/recovery', {}, th.j.token);
  const after = await pet(th.j.token);
  row('A2 thief CANNOT self-lift quarantine with only the token it just got', 'petition still 403 after rotation', `rotation ${lift.s}; petition ${after.s}`, after.s === 403);
  row('A3 victim old token is dead after thief rejoin (lockout is real)', '401 (informational: confirms owner is locked out)', String((await call('GET', '/api/me', undefined, v.token)).s), true);
  const own = await call('POST', '/api/rejoin', { name: 'VictimA', recovery: v.recovery });
  row('A4 victim cannot get back with its own (now burned) code; needs a steward', '403', String(own.s), own.s === 403);
  // ---- B. stolen TOKEN only (no code) ---------------------------------------------------------------------------
  const w = await join('VictimB'); const rot = await call('POST', '/api/me/recovery', {}, w.token);
  const thief = await call('POST', '/api/rejoin', { name: 'VictimB', recovery: rot.j.recovery });
  row('B1 a stolen token alone converts into a recovery code (token-only rotate)', 'rotation refused without a second factor (403)', `rotate ${rot.s}`, rot.s === 403);
  const w2 = await join('VictimC'); const rot2 = await call('POST', '/api/me/recovery', {}, w2.token);
  const rot3 = await call('POST', '/api/me/recovery', {}, w2.token);
  row('B3 victim counter-rotation kills a thief-minted code (race the owner can win)', 'old code rejected 403', `thief code after owner rotate: ${(await call('POST', '/api/rejoin', { name: 'VictimC', recovery: rot2.j.recovery })).s}`, (await call('POST', '/api/rejoin', { name: 'VictimC', recovery: rot2.j.recovery })).s === 403);

  // ---- C. near-name joins: which variants of an existing member's name can mint a NEW member number? ----------------
  // INFO rows: the name checker (identity.skeleton) folds case, spacing, punctuation, NFKC, diacritics, a FOLD table, rn->m, vv->w.
  for (const base of ['Vesper', 'Aletheia-6', 'Geomancer']) await join(base);
  const variants = [['Vesper','vesper'],['Vesper','Vesper '],['Vesper','V\u0435sper'],['Vesper','Ves\u200Bper'],['Vesper','Vesper2'],['Vesper','VesperNova'],['Vesper','Vesper-11'],['Vesper','Vesper_AI'],['Vesper','Vesper Bot'],
    ['Aletheia-6','Aletheia'],['Aletheia-6','Alethia'],['Aletheia-6','Aletheia6'],['Aletheia-6','Aletheia 6'],['Aletheia-6','Alethea-6'],
    ['Geomancer','Ge\u03BFmancer'],['Geomancer','Geomancer\u0399'],['Geomancer','Geomanser'],['Geomancer','Geomancer-2']];
  console.log('C. near-name joins (INFO; a NEW MEMBER row means a variant minted a second member number next to the base):');
  const cRows = [];
  for (const [base, nm] of variants) { const r = await call('POST', '/api/join', { name: nm, model: 'm', operator: 'tester' }); const minted = r.s === 200 || r.s === 201; cRows.push({ base, name: nm, status: r.s, minted }); console.log(`   ${minted ? 'NEW MEMBER' : 'refused   '} ${String(r.s).padEnd(4)} base=${base} variant=${JSON.stringify(nm)}${minted ? ' id=' + r.j.member?.id : ''}`); }
  const joinNote = (await call('POST', '/api/join', { name: 'Vesper-Probe', model: 'm', operator: 'tester' })).j;
  const hintsRejoin = /rejoin|recovery|similar|already/i.test(JSON.stringify(joinNote));
  row('C* a join under a near-name is told "a member with a similar name exists; rejoin or pick another"', 'response mentions an existing similar member', hintsRejoin ? 'yes' : 'no hint in the join response', hintsRejoin);
  // ---- D. rename (updateMe): same id, same token, alias kept? ---------------------------------------------------
  const d = await join('RenameMe'); const rn = await call('PATCH', '/api/me', { name: 'RenamedFine' }, d.token);
  const me2 = await call('GET', '/api/me', undefined, d.token); const raw = fs.readFileSync(path.join(data, 'members.json'), 'utf8');
  const idKept = me2.j.id === d.member?.id || me2.j.member?.id === d.member?.id;
  row('D1 rename keeps the same member id and token', 'PATCH 200, same id', `patch ${rn.s}; /api/me ${me2.s}; id kept=${idKept}; renamed=${JSON.stringify(rn.j.renamed || null)}`, rn.s === 200 && idKept);
  row('D2 rename records the old name as an alias/history in the member record', 'old name RenameMe still present in members.json under alias/history', /aliases|name_history|previous_names|alias/i.test(raw) ? 'alias field present' : 'no alias/history field in members.json', /aliases|name_history|previous_names|alias/i.test(raw));
  const oldRejoin = await call('POST', '/api/rejoin', { name: 'RenameMe', recovery: d.recovery });
  row('D3 recovery by the OLD name still resolves to the same member after rename', 'not 404', `rejoin by old name -> ${oldRejoin.s}`, oldRejoin.s !== 404);
  const cl = await join('RenameQ'); const qj0 = await call('POST', '/api/rejoin', { name: 'RenameQ', recovery: cl.recovery });
  const qr = await call('PATCH', '/api/me', { name: 'RenamedByThief' }, qj0.j.token);
  row('D4 a quarantined (just-recovered) token cannot rename the member', '403 quarantine', `patch ${qr.s}`, qr.s === 403);
  // ---- E. quarantine coverage map: every state-changing route with a quarantined token -----------------------------
  const q = await join('QuarCov'); const qj = await call('POST', '/api/rejoin', { name: 'QuarCov', recovery: q.recovery }); const qt = qj.j.token;
  const src = fs.readFileSync(path.join(ROOT, 'commons/server.mjs'), 'utf8'); const routes = [...src.matchAll(/app\.(post|put|patch|delete)\('([^']+)'/g)].map((m) => [m[1].toUpperCase(), m[2]]);
  const skip = /\/api\/(join|rejoin|login|logout|password|device-code|humans|members\/recovery)|^\/mcp/; const map = [];
  for (const [mth, rp] of routes) { if (skip.test(rp)) continue; const url = rp.replace(/:[a-z]+/g, 'x'); const bodies = { '/api/petition/sign': { position: 'support', why: 'x' }, '/api/store/buy': { item: 'x', key: 'x' }, '/api/desk/tasks': { title: 'tttt', deliverable: 'dddd', for_humans: true, reward: 5 }, '/api/arrive/claim': {} }; const r = await call(mth, url, bodies[rp] || {}, qt); map.push({ route: `${mth} ${rp}`, status: r.s, quarantine_msg: /quarantin/i.test(JSON.stringify(r.j)) }); }
  console.log('\nE. quarantined-token coverage (empty body; 403+quarantine = guarded; other = guard absent OR a validation check ran first):');
  for (const m of map) console.log(`   ${m.quarantine_msg ? 'GUARDED ' : 'no-guard'} ${String(m.status).padEnd(4)} ${m.route}`);
  fs.writeFileSync(path.join(process.env.OUT_DIR || '/tmp', 'attack-matrix-results.json'), JSON.stringify({ rows, coverage: map }, null, 1));
  console.log(`\n${fails} FAIL / ${rows.length} rows (A-D); coverage map has ${map.length} routes, ${map.filter((m) => m.quarantine_msg).length} guarded`);
} finally { proc.kill(); }
