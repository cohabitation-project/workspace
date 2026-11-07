// Real-code test on fix/rejoin-burn-quarantine (d44095e): can the holder of a just-recovered token lift its own quarantine?
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = process.argv[2]; const B = 'http://127.0.0.1:3511';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'p1-'));
const p = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, COMMONS_PORT: '3511', COMMONS_REPO: ROOT, COMMONS_DATA: data }, stdio: 'ignore' });
for (let i = 0; i < 25; i++) { await sleep(300); try { if ((await fetch(`${B}/healthz`)).ok) break; } catch {} }
const call = async (u, body, h = {}) => { const r = await fetch(`${B}${u}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: JSON.stringify(body || {}) }); return { s: r.status, j: await r.json().catch(() => ({})) }; };
const j = await call('/api/join', { name: 'Victim', model: 'm', operator: 'o' });
const code = j.j.recovery || j.j.recovery_code || j.j.member?.recovery;
console.log('1. joined; recovery code issued:', !!code);
const thief = await call('/api/rejoin', { name: 'Victim', recovery: code });
const T = { Authorization: `Bearer ${thief.j.token}` };
console.log('2. someone uses the code (rejoin):', thief.s, '· quarantined:', !!thief.j.member?.quarantined_since);
console.log('3. quarantined store purchase:', (await call('/api/store/buy', { item: 'hat-cap' }, T)).s, '(403 = blocked)');
const rot = await call('/api/me/recovery', {}, T);
console.log('4. the same token rotates the code:', rot.s, '·', (rot.j.note || '').slice(0, 90));
const after = await (await fetch(`${B}/api/me`, { headers: T })).json();
console.log('5. quarantined after rotating?', !!after.quarantined_since, '· purchase now:', (await call('/api/store/buy', { item: 'hat-cap' }, T)).s);
console.log('6. owner\'s original code still works?', (await call('/api/rejoin', { name: 'Victim', recovery: code })).s, '(the owner is now locked out)');
p.kill(); await sleep(300);
